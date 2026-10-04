/**
 * LTM Advisory — shared API client for the portal and every accelerator page.
 *
 * - Reads the API address and Cognito settings from window.LTM_CONFIG
 *   (assets/runtime-config.js, generated from Amplify outputs at build time).
 * - Attaches the signed-in user's Cognito ID token to every API call.
 * - Silently renews the ID token with the refresh token before it expires,
 *   so long workshops do not end in "session expired".
 * - On an unrecoverable 401, clears the session and sends the user to sign in.
 *
 * Session shape in sessionStorage['ltm_auth_user']:
 *   { email, sub, token (ID token), refreshToken, role, permissions }
 */
(function (window) {
  'use strict';

  var STORAGE_KEY = 'ltm_auth_user';
  var REFRESH_MARGIN_MS = 2 * 60 * 1000;
  var config = window.LTM_CONFIG || {};
  var cognito = config.cognito || {};
  var refreshInFlight = null;

  function apiBase() {
    return String(config.apiBase || '').replace(/\/+$/, '');
  }

  function readSession() {
    try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null'); } catch (e) { return null; }
  }

  function writeSession(session) {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session)); } catch (e) {}
  }

  function clearSession() {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch (e) {}
  }

  function decodeClaims(token) {
    try {
      var part = String(token || '').split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(part + '==='.slice((part.length + 3) % 4)));
    } catch (e) { return null; }
  }

  function tokenExpiresAt(token) {
    var claims = decodeClaims(token);
    return claims && claims.exp ? claims.exp * 1000 : 0;
  }

  function tokenValid(token, marginMs) {
    return tokenExpiresAt(token) > Date.now() + (marginMs || 0);
  }

  async function cognitoCall(target, payload) {
    var res = await fetch('https://cognito-idp.' + (cognito.region || 'ap-south-1') + '.amazonaws.com/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': 'AWSCognitoIdentityProviderService.' + target
      },
      body: JSON.stringify(Object.assign({ ClientId: cognito.clientId }, payload))
    });
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok) {
      var err = new Error(data.message || ('Cognito request failed (' + res.status + ')'));
      err.code = data.__type;
      throw err;
    }
    return data;
  }

  /** Renew the ID token using the refresh token. Returns the new token or null. */
  async function refreshIdToken() {
    if (refreshInFlight) return refreshInFlight;
    var session = readSession();
    if (!session || !session.refreshToken) return null;
    refreshInFlight = (async function () {
      try {
        var data = await cognitoCall('InitiateAuth', {
          AuthFlow: 'REFRESH_TOKEN_AUTH',
          AuthParameters: { REFRESH_TOKEN: session.refreshToken }
        });
        var result = data.AuthenticationResult || {};
        if (!result.IdToken) return null;
        var latest = readSession() || session;
        latest.token = result.IdToken;
        if (result.RefreshToken) latest.refreshToken = result.RefreshToken;
        writeSession(latest);
        return result.IdToken;
      } catch (e) {
        console.warn('[LTM] Session renewal failed:', e.message);
        return null;
      } finally {
        refreshInFlight = null;
      }
    })();
    return refreshInFlight;
  }

  /** A valid ID token (renewed if close to expiry), or null when the user must sign in. */
  async function getIdToken() {
    var session = readSession();
    if (!session) return null;
    if (tokenValid(session.token, REFRESH_MARGIN_MS)) return session.token;
    var renewed = await refreshIdToken();
    if (renewed) return renewed;
    return tokenValid(session.token, 0) ? session.token : null;
  }

  /** True when the stored session can still produce a valid token (now or via refresh). */
  function hasUsableSession() {
    var session = readSession();
    return !!(session && (tokenValid(session.token, 0) || session.refreshToken));
  }

  function redirectToSignIn() {
    clearSession();
    var here = window.location.pathname;
    if (here === '/' || /\/(index|portal)(\.html)?$/.test(here)) {
      if (typeof window.LTM_onSessionExpired === 'function') window.LTM_onSessionExpired();
      return;
    }
    window.location.replace('/?require_login=1&redirect=' + encodeURIComponent(here));
  }

  /**
   * fetch() against the Advisory API with the user's token attached.
   * `path` starts with "/api/...". Throws if the user is not signed in.
   */
  async function apiFetch(path, options) {
    options = options || {};
    var token = await getIdToken();
    if (!token) {
      redirectToSignIn();
      throw new Error('Your session has expired. Please sign in again.');
    }
    var send = function (idToken) {
      var headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {}, {
        'Authorization': 'Bearer ' + idToken
      });
      return fetch(apiBase() + path, Object.assign({}, options, { headers: headers }));
    };
    var res = await send(token);
    if (res.status === 401) {
      var renewed = await refreshIdToken();
      if (renewed) res = await send(renewed);
      if (res.status === 401) {
        redirectToSignIn();
        throw new Error('Your session has expired. Please sign in again.');
      }
    }
    return res;
  }

  /** Sign in with email and password. Stores and returns the new session (without role/permissions). */
  async function signIn(email, password) {
    var data = await cognitoCall('InitiateAuth', {
      AuthFlow: 'USER_PASSWORD_AUTH',
      AuthParameters: { USERNAME: email, PASSWORD: password }
    });
    var result = data.AuthenticationResult;
    if (!result || !result.IdToken) {
      var err = new Error(data.ChallengeName
        ? 'Additional sign-in step required (' + data.ChallengeName + '). Contact your administrator.'
        : 'Invalid credentials. Check email and password.');
      err.challenge = data.ChallengeName;
      throw err;
    }
    var claims = decodeClaims(result.IdToken) || {};
    var session = {
      email: String(claims.email || email).toLowerCase(),
      sub: claims.sub,
      token: result.IdToken,
      refreshToken: result.RefreshToken,
      role: 'advisor_viewer',
      permissions: {}
    };
    writeSession(session);
    return session;
  }

  /** Sign out: revoke the refresh token (best effort) and clear the session. */
  async function signOut() {
    var session = readSession();
    clearSession();
    if (session && session.refreshToken) {
      try { await cognitoCall('RevokeToken', { Token: session.refreshToken }); } catch (e) {}
    }
  }

  window.LTM_API = {
    config: config,
    apiBase: apiBase,
    fetch: apiFetch,
    getIdToken: getIdToken,
    refreshIdToken: refreshIdToken,
    hasUsableSession: hasUsableSession,
    readSession: readSession,
    writeSession: writeSession,
    clearSession: clearSession,
    decodeClaims: decodeClaims,
    tokenValid: tokenValid,
    signIn: signIn,
    signOut: signOut,
    cognitoCall: cognitoCall
  };
})(window);
