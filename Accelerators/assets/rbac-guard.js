/**
 * LTM Infrastructure Tech Advisory — RBAC Client Enforcement Guard
 * Protects accelerator routes against unauthenticated and unauthorized access.
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
