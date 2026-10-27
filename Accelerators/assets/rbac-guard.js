/**
 * LTM Vantage — page guard.
 * Redirects signed-out or unauthorized users away from accelerator pages.
 * UX only: data access is enforced server-side (API Gateway Cognito authorizer + service checks).
 * Uses /assets/ltm-api.js when the page loads it; otherwise checks the stored session directly.
 */
(function () {
  var currentScript = document.currentScript;
  var toolId = currentScript ? currentScript.getAttribute('data-tool') : '';
  // data-permission="edit" (question bank editors) admits only users who may edit the tool, as the home page's Edit button.
  var needsEdit = !!currentScript && currentScript.getAttribute('data-permission') === 'edit';
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

    // data-tool may list several tools (space-separated): access to any one opens the page. FinOps IQ lists the
    // retired FinOps Value Case too, whose permission now grants FinOps IQ (owner decision, 22 Oct 2026).
    var p = user.permissions || {};
    var hasAccess = toolId.split(/\s+/).some(function (id) {
      var acc = p.accelerators && p.accelerators[id];
      if (needsEdit) return !!(acc && (acc.edit || acc.full)) || (Array.isArray(p.edit) && p.edit.indexOf(id) >= 0);
      return !!(acc && (acc.take || acc.full)) ||
        (Array.isArray(p.take) && p.take.indexOf(id) >= 0) ||
        (Array.isArray(p.view) && p.view.indexOf(id) >= 0);
    });

    if (!hasAccess) {
      alert("Access Restricted: Your account does not have permission to access this diagnostic assessment.\n\nPlease contact your administrator.");
      window.location.replace('/');
    }
  } catch (err) {
    console.error('Page guard error:', err);
    toSignIn();
  }
})();
