/**
 * LTM Vantage — page guard.
 * Redirects signed-out or unauthorized users away from accelerator pages.
 * UX only: data access is enforced server-side (API Gateway Cognito authorizer + service checks).
 * Uses /assets/ltm-api.js when the page loads it; otherwise checks the stored session directly.
 */
(function () {
  var currentScript = document.currentScript;
  var toolId = currentScript ? currentScript.getAttribute('data-tool') : '';
  var api = window.LTM_API;

  function toSignIn() {
    if (api) api.clearSession(); else sessionStorage.removeItem('ltm_auth_user');
    window.location.replace('/?require_login=1&redirect=' + encodeURIComponent(window.location.pathname));
  }

  // Pages that do not load ltm-api.js (e.g. Cost IQ, Resilience IQ) get the same check inline.
  function readSession() {
    try { return JSON.parse(sessionStorage.getItem('ltm_auth_user') || 'null'); } catch (e) { return null; }
  }
  function hasUsableSession(session) {
    if (!session) return false;
    if (session.refreshToken) return true;
    try {
      var part = String(session.token || '').split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      var claims = JSON.parse(atob(part + '==='.slice((part.length + 3) % 4)));
      return !!claims.exp && claims.exp * 1000 > Date.now();
    } catch (e) { return false; }
  }

  try {
    // A session is usable if its token is still valid or it can be renewed with the refresh token.
    var user = api ? api.readSession() : readSession();
    if (!(api ? api.hasUsableSession() : hasUsableSession(user))) {
      toSignIn();
      return;
    }

    if (user.role === 'super_admin' || !toolId) return;

    var p = user.permissions || {};
    var acc = p.accelerators && p.accelerators[toolId];
    var hasAccess =
      !!(acc && (acc.take || acc.full)) ||
      (Array.isArray(p.take) && p.take.indexOf(toolId) >= 0) ||
      (Array.isArray(p.view) && p.view.indexOf(toolId) >= 0);

    if (!hasAccess) {
      alert("Access Restricted: Your account does not have permission to access this diagnostic assessment.\n\nPlease contact your administrator.");
      window.location.replace('/');
    }
  } catch (err) {
    console.error('Page guard error:', err);
    toSignIn();
  }
})();
