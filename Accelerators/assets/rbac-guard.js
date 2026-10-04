/**
 * LTM Infrastructure Tech Advisory — page guard.
 * Redirects signed-out or unauthorized users away from accelerator pages.
 * UX only: data access is enforced server-side (API Gateway Cognito authorizer + service checks).
 * Requires /assets/ltm-api.js to be loaded first.
 */
(function () {
  var currentScript = document.currentScript;
  var toolId = currentScript ? currentScript.getAttribute('data-tool') : '';
  var api = window.LTM_API;

  function toSignIn() {
    if (api) api.clearSession(); else sessionStorage.removeItem('ltm_auth_user');
    window.location.replace('/?require_login=1&redirect=' + encodeURIComponent(window.location.pathname));
  }

  try {
    // A session is usable if its token is still valid or it can be renewed with the refresh token.
    if (!api || !api.hasUsableSession()) {
      toSignIn();
      return;
    }

    var user = api.readSession();
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
