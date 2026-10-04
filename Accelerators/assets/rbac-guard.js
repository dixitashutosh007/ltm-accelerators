/**
 * LTM Infrastructure Tech Advisory — RBAC Client Enforcement Guard
 * Redirects signed-out or unauthorized users away from accelerator pages.
 * UX only: data access is enforced server-side by Cognito token verification.
 */
(function() {
  const currentScript = document.currentScript;
  const toolId = currentScript ? currentScript.getAttribute('data-tool') : '';
  const SUPER_ADMIN = 'dixitashutosh007@gmail.com';

  try {
    const raw = sessionStorage.getItem("ltm_auth_user");
    if (!raw) {
      window.location.replace('/?require_login=1&redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }

    const user = JSON.parse(raw);

    // Expired or token-less sessions must sign in again. (This guard is a UX redirect only:
    // the APIs enforce access by verifying the Cognito token server-side.)
    let expired = true;
    try {
      const payload = JSON.parse(atob(String(user.token || '').split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      expired = !payload.exp || payload.exp * 1000 <= Date.now();
    } catch (e) {}
    if (expired) {
      sessionStorage.removeItem("ltm_auth_user");
      window.location.replace('/?require_login=1&redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }
    const email = (user.email || '').toLowerCase();
    if (email === SUPER_ADMIN.toLowerCase()) {
      return; // Super admin granted full access
    }

    if (toolId) {
      const p = user.permissions || {};
      const hasAccess = 
        (p.accelerators && p.accelerators[toolId] && (p.accelerators[toolId].take || p.accelerators[toolId].full)) ||
        (Array.isArray(p.take) && p.take.includes(toolId)) ||
        (Array.isArray(p.view) && p.view.includes(toolId));

      if (!hasAccess) {
        alert("Access Restricted: Your account does not have permission to access this diagnostic assessment.\n\nPlease contact your Super Administrator.");
        window.location.replace('/');
      }
    }
  } catch (err) {
    console.error("RBAC guard verification error:", err);
  }
})();
