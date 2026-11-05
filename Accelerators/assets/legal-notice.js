/**
 * LTM Vantage — development-preview notice.
 * Blocks the page behind a notice that must be accepted on every visit (a visit is a browser tab session),
 * and keeps a footer banner on every page. Wording is versioned: change NOTICE_VERSION when the text changes.
 * UX and record of notice only: it is not an access control (access is enforced server-side).
 */
(function () {
  var NOTICE_VERSION = '2026-11-04.1';
  var KEY = 'ltm_dev_notice_accepted';
  var CONTACT = 'ashutosh.dixit@ltm.com';

  function accepted() {
    try { return sessionStorage.getItem(KEY) === NOTICE_VERSION; } catch (e) { return false; }
  }
  function remember() {
    try { sessionStorage.setItem(KEY, NOTICE_VERSION); } catch (e) { /* the notice then shows again on the next page */ }
  }

  var css = '' +
    '#dn-overlay{position:fixed;inset:0;z-index:2147483000;background:rgba(15,28,38,.72);display:flex;align-items:center;justify-content:center;padding:16px;font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;color:#1c2b36}' +
    '#dn-box{background:#fff;border-radius:10px;max-width:720px;width:100%;max-height:calc(100vh - 32px);display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.35)}' +
    '#dn-box h2{margin:0;padding:18px 24px 12px;font-size:19px;border-bottom:1px solid #dde3e8}' +
    '#dn-body{padding:14px 24px;overflow-y:auto;flex:1}' +
    '#dn-body h3{font-size:13px;letter-spacing:.04em;text-transform:uppercase;margin:14px 0 4px;color:#285f72}' +
    '#dn-body p{margin:0 0 8px}' +
    '#dn-foot{padding:14px 24px 18px;border-top:1px solid #dde3e8}' +
    '#dn-foot label{display:flex;gap:10px;align-items:flex-start;margin-bottom:12px;cursor:pointer}' +
    '#dn-foot input{margin-top:3px;width:18px;height:18px;flex:none}' +
    '.dn-actions{display:flex;gap:10px;flex-wrap:wrap}' +
    '.dn-btn{font:inherit;font-weight:600;padding:10px 18px;border-radius:6px;border:1px solid #285f72;background:#fff;color:#285f72;cursor:pointer}' +
    '.dn-btn.primary{background:#285f72;color:#fff}' +
    '.dn-btn:disabled{opacity:.45;cursor:not-allowed}' +
    '.dn-btn:focus-visible,#dn-foot input:focus-visible{outline:3px solid #f2a900;outline-offset:2px}' +
    '#dn-declined{padding:14px 24px 18px}' +
    '#dn-bar{position:fixed;left:0;right:0;bottom:0;z-index:2147482000;background:#fff4dc;border-top:1px solid #e3c785;color:#5c3f00;padding:7px 16px calc(7px + env(safe-area-inset-bottom,0px));font:12px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;text-align:center}' +
    '#dn-bar button{font:inherit;background:none;border:0;color:#285f72;text-decoration:underline;cursor:pointer;padding:0 2px}' +
    '@media print{#dn-bar,#dn-overlay{display:none!important}}';

  var BODY = '' +
    '<p>LTM Vantage is a <b>development preview</b>. Please read this notice before you continue.</p>' +
    '<h3>Where this is hosted</h3>' +
    '<p>This site is temporarily hosted on a personal development cloud account belonging to Ashutosh Dixit (' + CONTACT + '), an LTM employee, while access to the official LTM cloud account is being arranged. It is <b>not yet</b> hosted on an official LTM environment.</p>' +
    '<h3>Authorisation and nature of the work</h3>' +
    '<p>This development has been authorised by LTM management. It is non-monetary: it is not offered for sale, is not a commercial service and creates no fee, contract or obligation of any kind between you and LTM or the developer.</p>' +
    '<h3>Move to an official address</h3>' +
    '<p>Once access to the official LTM environment is in place, the application will be moved to another, official web address. The address you are using now will then stop working, and links, bookmarks and saved items may need to be re-created or may not be carried over.</p>' +
    '<h3>Use at your own risk; no advice</h3>' +
    '<p>Scores, findings, estimates, reports and any other output are indicative, depend entirely on the information entered, and are provided for discussion only. They are not professional, financial, legal, tax, security or compliance advice and must not be relied on as the basis for a decision without independent verification. To the fullest extent permitted by applicable law, the service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;, without warranty of any kind, and neither the developer nor LTM accepts liability for any loss or damage arising from its use, its unavailability or its withdrawal.</p>' +
    '<h3>Your information</h3>' +
    '<p>Anything you enter, and basic account and usage details (such as your sign-in identity), are processed and stored in that personal development account. <b>Do not enter confidential, personal, regulated or client-sensitive information</b> beyond what you are content to have held there. Entries may be deleted without notice.</p>' +
    '<h3>Questions</h3>' +
    '<p>To discuss this development, please contact Ashutosh Dixit at <a href="mailto:' + CONTACT + '">' + CONTACT + '</a>.</p>';

  var overlay = null, lastFocus = null, readOnly = false;

  function blockPage(on) {
    var kids = document.body ? document.body.children : [];
    for (var i = 0; i < kids.length; i++) {
      var el = kids[i];
      if (el.id === 'dn-overlay' || el.id === 'dn-bar') continue;
      if (on) el.setAttribute('inert', ''); else el.removeAttribute('inert');
    }
  }

  function close() {
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    overlay = null;
    blockPage(false);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function open(asReadOnly) {
    if (overlay) return;
    readOnly = !!asReadOnly;
    lastFocus = document.activeElement;
    overlay = document.createElement('div');
    overlay.id = 'dn-overlay';
    var foot = readOnly
      ? '<div id="dn-foot"><div class="dn-actions"><button class="dn-btn primary" id="dn-close" type="button">Close</button></div></div>'
      : '<div id="dn-foot"><label><input type="checkbox" id="dn-check"><span>I have read and understood this notice. I accept that this is a development preview hosted on a personal development account, and that I use it at my own risk.</span></label>' +
        '<div class="dn-actions"><button class="dn-btn primary" id="dn-accept" type="button" disabled>Accept and continue</button><button class="dn-btn" id="dn-decline" type="button">I do not accept</button></div></div>';
    overlay.innerHTML = '<div id="dn-box" role="dialog" aria-modal="true" aria-labelledby="dn-title" aria-describedby="dn-body"><h2 id="dn-title">Development preview: important notice</h2><div id="dn-body" tabindex="0">' + BODY + '</div>' + foot + '</div>';
    (document.body || document.documentElement).appendChild(overlay);
    blockPage(true);

    var box = overlay.querySelector('#dn-box');
    function focusables() { return box.querySelectorAll('button:not([disabled]),input,a[href],[tabindex="0"]'); }
    overlay.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { if (readOnly) close(); e.preventDefault(); return; }
      if (e.key !== 'Tab') return;
      var f = focusables(); if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    });

    if (readOnly) {
      overlay.querySelector('#dn-close').addEventListener('click', close);
      overlay.querySelector('#dn-close').focus();
      return;
    }
    var check = overlay.querySelector('#dn-check'), accept = overlay.querySelector('#dn-accept');
    check.addEventListener('change', function () { accept.disabled = !check.checked; });
    accept.addEventListener('click', function () { if (!check.checked) return; remember(); close(); });
    overlay.querySelector('#dn-decline').addEventListener('click', function () {
      overlay.querySelector('#dn-body').innerHTML = '<p><b>You have not accepted the notice, so you cannot continue.</b></p><p>You can read the notice again and accept it, or close this page. For questions, contact <a href="mailto:' + CONTACT + '">' + CONTACT + '</a>.</p>';
      overlay.querySelector('#dn-foot').innerHTML = '<div class="dn-actions"><button class="dn-btn primary" id="dn-back" type="button">Read the notice again</button></div>';
      overlay.querySelector('#dn-back').addEventListener('click', function () { close(); open(false); });
      overlay.querySelector('#dn-back').focus();
    });
    overlay.querySelector('#dn-body').focus();
  }

  function addBar() {
    if (document.getElementById('dn-bar')) return;
    var bar = document.createElement('div');
    bar.id = 'dn-bar';
    bar.setAttribute('role', 'contentinfo');
    bar.innerHTML = 'Development preview on a personal development account; it will move to an official LTM address. Questions: ' + CONTACT + '. <button type="button" id="dn-read">Read the notice</button>';
    document.body.appendChild(bar);
    bar.querySelector('#dn-read').addEventListener('click', function () { open(true); });
    function pad() { document.body.style.paddingBottom = bar.offsetHeight + 'px'; }
    pad(); window.addEventListener('resize', pad);
  }

  function start() {
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
    addBar();
    if (!accepted()) open(false);
  }

  // Cover the page as soon as possible so nothing shows before the notice.
  if (!accepted()) {
    var early = document.createElement('style');
    early.textContent = 'html{background:#0f1c26}body{visibility:hidden}#dn-overlay,#dn-bar{visibility:visible}';
    early.id = 'dn-early';
    (document.head || document.documentElement).appendChild(early);
  }
  function go() {
    start();
    var e = document.getElementById('dn-early'); if (e) e.parentNode.removeChild(e);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
