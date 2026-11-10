/* LTM Vantage: saved sessions for the accelerators that had no server-side save (platform workstream P3).
   One shared component: it keeps the current assessment on the server through /api/sessions (owner or Admin only, 90 days after
   the last save), restores the latest unfinished one when the page opens, and gives a "My sessions" panel to open or delete
   a saved one. The page keeps its own state and its own functions; it hands this component four small functions.

   SavedSessions.attach({
     accelerator: 'cloud-iq',               the accelerator id the service knows
     legacyKey: 'cloudiq.v2.state',         optional: the old localStorage key; if present it is removed and the page says so once
     title:    () => 'Name shown in the list',
     client:   () => 'Client name',          optional: shown to administrators on the activity screen
     snapshot: () => ({ ...the page's state, an object }),
     progress: () => ({ stage: 'Section name', percent: 0..100 }),
     status:   () => 'in_progress' | 'completed',
     restore:  payload => { put the state back and redraw }
   })
   Then the page calls SavedSessions.touch() wherever it used to write localStorage, SavedSessions.latest() for the saved state
   to offer at the start (after `await SavedSessions.ready()`), and SavedSessions.fresh() to begin a new session. */
(function () {
  'use strict';

  var cfg = null, current = null, cache = null, timer = null, saving = Promise.resolve(), readyPromise = null, panel = null, returnFocus = null;
  var DEBOUNCE_MS = 1200;
  var STATUS_WORDS = { in_progress: 'In progress', completed: 'Completed' };

  function newId() {
    var bytes = new Uint8Array(12);
    (window.crypto || window.msCrypto).getRandomValues(bytes);
    return 'S-' + Array.prototype.map.call(bytes, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
  }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function configured() { return !!(window.LTM_API && window.LTM_API.fetch); }

  async function call(path, options) {
    var res = await window.LTM_API.fetch(path, options);
    var payload;
    try { payload = await res.json(); } catch (e) { throw new Error('The sessions service returned an invalid response.'); }
    if (!res.ok || !payload.ok) throw new Error(payload.message || payload.error || ('The sessions service failed (' + res.status + ').'));
    return payload.data;
  }
  var q = function () { return '/api/sessions?accelerator=' + encodeURIComponent(cfg.accelerator); };

  function status(text) {
    var el = document.getElementById('ss-status');
    if (el) el.textContent = text || '';
  }

  /* The earlier build kept progress in this browser. It is not carried over; say so once and clear it. */
  function legacyNotice() {
    if (!cfg.legacyKey) return;
    try {
      if (localStorage.getItem(cfg.legacyKey) === null) return;
      localStorage.removeItem(cfg.legacyKey);
      notify('Progress saved earlier in this browser is not carried over. From now on your work is saved to your account and listed under My sessions.');
    } catch (e) { /* storage blocked: nothing to say */ }
  }

  function notify(text) {
    var n = document.getElementById('ss-notice');
    if (!n) {
      n = document.createElement('div');
      n.id = 'ss-notice'; n.setAttribute('role', 'status');
      n.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:56px;z-index:2147480000;max-width:min(560px,calc(100vw - 32px));background:#fff;border:1px solid #d6d3d1;border-left:4px solid #b36b00;border-radius:8px;padding:10px 14px;font:13px/1.45 system-ui,-apple-system,Segoe UI,Arial,sans-serif;color:#1c1917;box-shadow:0 6px 24px rgba(0,0,0,.18)';
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = 'Dismiss'; b.style.cssText = 'margin-left:10px;font:inherit;border:1px solid #a8a29e;background:#fff;border-radius:6px;padding:2px 8px;cursor:pointer';
      b.onclick = function () { n.remove(); };
      n.appendChild(document.createElement('span')); n.appendChild(b);
      document.body.appendChild(n);
    }
    n.firstChild.textContent = text;
  }

  async function loadLatest() {
    legacyNotice();
    if (!configured()) return;
    try {
      var list = await call(q());
      var open = list.filter(function (s) { return s.status === 'in_progress'; }).sort(function (a, b) { return String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')); })[0];
      if (!open) return;
      var one = await call(q() + '&sessionId=' + encodeURIComponent(open.sessionId));
      current = one.sessionId; cache = one.payload;
    } catch (e) { status('Saved sessions are unavailable: ' + e.message); }
  }

  async function saveNow() {
    if (!cfg || !configured()) return;
    var payload = cfg.snapshot();
    cache = payload;
    if (!current) current = newId();
    var title = String(cfg.title() || 'Assessment').slice(0, 120);
    var client = cfg.client ? String(cfg.client() || '').slice(0, 120) : '';
    try {
      await call('/api/sessions', { method: 'POST', body: JSON.stringify({ accelerator: cfg.accelerator, action: 'save', session: { sessionId: current, title: title, clientName: client || undefined, status: cfg.status(), payload: payload }, progress: cfg.progress() }) });
      status('Saved ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (e) { status('Not saved: ' + e.message); }
  }

  function touch() {
    if (!cfg) return;
    clearTimeout(timer);
    timer = setTimeout(function () { saving = saving.then(saveNow); }, DEBOUNCE_MS);
  }

  function flush() { clearTimeout(timer); saving = saving.then(saveNow); return saving; }

  function fresh() { clearTimeout(timer); current = null; cache = null; }

  /* Starts again and removes the session that was open, for a page's "clear everything" action. */
  async function discard() {
    clearTimeout(timer);
    var id = current;
    current = null; cache = null;
    if (!id || !configured()) return;
    try { await call('/api/sessions', { method: 'POST', body: JSON.stringify({ accelerator: cfg.accelerator, action: 'delete', sessionId: id }) }); }
    catch (e) { status('Not deleted: ' + e.message); }
  }

  /* ---------------------------------------------------------------- My sessions panel */
  function close() {
    if (!panel) return;
    panel.remove(); panel = null;
    Array.prototype.forEach.call(document.body.children, function (el) { el.removeAttribute('inert'); });
    if (returnFocus && returnFocus.focus) returnFocus.focus();
  }

  function daysLeft(expiresAt) { return expiresAt ? Math.ceil((expiresAt * 1000 - Date.now()) / 86400000) : null; }

  async function renderList() {
    var body = panel.querySelector('#ss-body');
    body.innerHTML = '<p>Loading…</p>';
    var list;
    try { list = await call(q()); } catch (e) { body.innerHTML = '<p role="alert">' + esc(e.message) + '</p>'; return; }
    list.sort(function (a, b) { return String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')); });
    if (!list.length) { body.innerHTML = '<p>No saved sessions yet. Your work is saved automatically as you go.</p>'; return; }
    body.innerHTML = '<ul style="list-style:none;margin:0;padding:0">' + list.map(function (s) {
      var d = daysLeft(s.expiresAt);
      var warn = d !== null && d <= 14 ? '<div style="color:#9a3428;font-weight:600">Deleted automatically in ' + Math.max(d, 0) + (d === 1 ? ' day' : ' days') + ' unless you save again.</div>' : '';
      return '<li style="border:1px solid #e7e5e4;border-radius:8px;padding:10px 12px;margin-bottom:8px">'
        + '<div style="font-weight:600">' + esc(s.title) + (s.sessionId === current ? ' <span style="font-weight:400;color:#57534e">(open now)</span>' : '') + '</div>'
        + '<div style="color:#57534e;font-size:12.5px">' + esc(STATUS_WORDS[s.status] || s.status) + (s.stage ? ' · ' + esc(s.stage) : '') + (s.percent != null ? ' · ' + esc(s.percent) + '%' : '') + ' · saved ' + esc(new Date(s.updatedAt).toLocaleString()) + '</div>' + warn
        + '<div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="ss-btn" data-open="' + esc(s.sessionId) + '">Open</button>'
        + '<span data-del-for="' + esc(s.sessionId) + '"><button type="button" class="ss-btn" data-del="' + esc(s.sessionId) + '">Delete</button></span></div></li>';
    }).join('') + '</ul>';
    Array.prototype.forEach.call(body.querySelectorAll('[data-open]'), function (b) { b.onclick = function () { openSession(b.getAttribute('data-open')); }; });
    Array.prototype.forEach.call(body.querySelectorAll('[data-del]'), function (b) { b.onclick = function () { askDelete(b); }; });
  }

  /* Deletion is permanent, so it asks for a second click in place. */
  function askDelete(button) {
    var id = button.getAttribute('data-del'), host = button.parentNode;
    host.innerHTML = '<span style="margin-right:8px">Delete permanently?</span><button type="button" class="ss-btn" data-confirm>Confirm delete</button> <button type="button" class="ss-btn" data-cancel>Cancel</button>';
    host.querySelector('[data-cancel]').onclick = function () { renderList(); };
    host.querySelector('[data-confirm]').onclick = async function () {
      try {
        await call('/api/sessions', { method: 'POST', body: JSON.stringify({ accelerator: cfg.accelerator, action: 'delete', sessionId: id }) });
        if (id === current) fresh();
      } catch (e) { status('Not deleted: ' + e.message); }
      renderList();
    };
    host.querySelector('[data-confirm]').focus();
  }

  async function openSession(id) {
    try {
      var one = await call(q() + '&sessionId=' + encodeURIComponent(id));
      current = one.sessionId; cache = one.payload;
      close();
      cfg.restore(one.payload);
    } catch (e) { var body = panel && panel.querySelector('#ss-body'); if (body) body.insertAdjacentHTML('afterbegin', '<p role="alert">' + esc(e.message) + '</p>'); }
  }

  function openPanel() {
    if (panel) return;
    returnFocus = document.activeElement;
    panel = document.createElement('div');
    panel.id = 'ss-panel';
    panel.style.cssText = 'position:fixed;inset:0;z-index:2147481000;background:rgba(15,28,38,.6);display:flex;align-items:center;justify-content:center;padding:16px;font:14px/1.5 system-ui,-apple-system,Segoe UI,Arial,sans-serif;color:#1c1917';
    panel.innerHTML = '<style>.ss-btn{font:inherit;font-weight:600;padding:6px 12px;border-radius:6px;border:1px solid #a8a29e;background:#fff;color:#1c1917;cursor:pointer}.ss-btn:hover{background:#f5f5f4}.ss-btn:focus-visible{outline:3px solid #f2a900;outline-offset:2px}</style>'
      + '<div role="dialog" aria-modal="true" aria-labelledby="ss-title" style="background:#fff;border-radius:10px;max-width:640px;width:100%;max-height:calc(100vh - 32px);display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.35)">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:1px solid #e7e5e4"><h2 id="ss-title" style="margin:0;font-size:18px">My sessions</h2><button type="button" class="ss-btn" id="ss-close">Close</button></div>'
      + '<div id="ss-body" style="padding:14px 18px;overflow-y:auto"></div>'
      + '<div style="padding:10px 18px;border-top:1px solid #e7e5e4;color:#57534e;font-size:12.5px">Saved to your account only; you and an administrator can see them. Each is deleted automatically two years after its last save.</div></div>';
    Array.prototype.forEach.call(document.body.children, function (el) { el.setAttribute('inert', ''); });
    document.body.appendChild(panel);
    panel.querySelector('#ss-close').onclick = close;
    panel.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { close(); return; }
      if (e.key !== 'Tab') return;
      var f = panel.querySelectorAll('button:not([disabled])'); if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); } else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    });
    panel.querySelector('#ss-close').focus();
    renderList();
  }

  function mountButton() {
    if (document.getElementById('ss-open')) return;
    var b = document.createElement('button');
    b.type = 'button'; b.id = 'ss-open'; b.className = 'btn-ghost'; b.textContent = 'My sessions';
    b.style.cssText = 'cursor:pointer;font:inherit;font-weight:600;padding:8px 14px;border-radius:8px;border:1px solid #d6d3d1;background:#fff;color:#1c1917';
    b.onclick = openPanel;
    var s = document.createElement('span'); s.id = 'ss-status'; s.setAttribute('role', 'status'); s.style.cssText = 'font-size:12px;color:#57534e;margin-right:10px;min-width:1px';
    var host = document.querySelector('.vt-actions') || document.querySelector('header');
    if (host) { host.appendChild(s); host.appendChild(b); } else { b.style.cssText += ';position:fixed;right:16px;bottom:16px;z-index:1000'; document.body.appendChild(b); document.body.appendChild(s); }
  }

  function attach(config) {
    cfg = config;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountButton); else mountButton();
    readyPromise = loadLatest();
    window.addEventListener('pagehide', function () { clearTimeout(timer); });
    return readyPromise;
  }

  window.SavedSessions = Object.freeze({
    attach: attach,
    ready: function () { return readyPromise || Promise.resolve(); },
    latest: function () { return cache; },
    touch: touch,
    flush: flush,
    fresh: fresh,
    discard: discard,
    open: openPanel,
    configured: configured
  });
})();
