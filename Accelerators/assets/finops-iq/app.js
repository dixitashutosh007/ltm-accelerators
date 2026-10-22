/**
 * FinOps IQ page (execution phase M3): one page, executive and workshop modes, and client mode. Questions step by
 * step, a Review and complete step, then the completed result as a dashboard (charts in charts.js).
 *
 * The page holds no scoring or trigger logic. It sends the facts and answers to the server
 * (POST /api/evaluate/finops-iq/v3) and shows what comes back: which questions are asked, the
 * capability profile, findings and value. Client mode asks the server for the client view
 * (?view=client), so consultant-only fields never reach the browser. Assessments are saved and
 * resumed on the server (/api/finops-iq/assessment); localStorage is not used for assessment data.
 */
(function () {
  'use strict';

  var API = window.LTM_API;
  var EVALUATE = '/api/evaluate/finops-iq/v3';
  var ASSESSMENT = '/api/finops-iq/assessment';
  var REPORT = '/api/finops-iq/report';
  var LEVEL_LABEL = { run: 'Run', walk: 'Walk', crawl: 'Crawl', not_yet: 'Not yet' };
  var MODE_INFO = {
    executive: { label: 'Executive', duration: '15–20 minutes', text: 'Do we need to act now, and roughly how much is at stake? 18 questions for the CIO or CFO.' },
    workshop: { label: 'Workshop', duration: '60–90 minutes per session', text: 'What exactly, by when, owned by whom, and what is it worth? Consultant-led, with the cloud, FinOps, finance and engineering leads.' }
  };

  var schema = null;
  var Q = {};
  var state = null;   // the open assessment
  var timers = {};
  var listNotice = null;  // announced and focused when the assessment list next loads (after a deletion)
  var app = document.getElementById('app');
  var actions = document.getElementById('topbar-actions');

  /* ------------------------------- DOM helpers ------------------------------ */

  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      var v = attrs[k];
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, v);
    }
    for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }
  function append(el, c) {
    if (c === undefined || c === null || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { append(el, x); }); return; }
    el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }

  /**
   * Re-render, keeping keyboard focus on the same control and the page where it was scrolled. Answering a question or
   * a scoring reply does not call this (see refresh): only a change to which questions are shown does.
   */
  function render() {
    var active = document.activeElement;
    var focusId = active && active.id;
    var sel = active && typeof active.selectionStart === 'number' ? [active.selectionStart, active.selectionEnd] : null;
    var y = window.scrollY;
    clear(app);
    renderTopbar();
    if (!state) renderStart(); else renderAssessment();
    if (focusId) {
      var el = document.getElementById(focusId);
      if (el) { el.focus({ preventScroll: true }); if (sel && el.setSelectionRange) try { el.setSelectionRange(sel[0], sel[1]); } catch (e) {} }
    }
    window.scrollTo(0, y);
  }

  /** Says something to screen readers without moving focus. */
  function announce(text) {
    var live = document.getElementById('live');
    if (!live) return;
    live.textContent = '';
    setTimeout(function () { live.textContent = text; }, 50);
  }

  /* ---------------------------------- API ----------------------------------- */

  async function call(path, options) {
    var res = await API.fetch(path, options);
    var body = await res.json().catch(function () { return {}; });
    return { status: res.status, body: body };
  }

  /* ------------------------------ Paths in facts ---------------------------- */

  function get(obj, path) {
    return path.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, obj);
  }
  function set(obj, path, value) {
    var keys = path.split('.');
    var o = obj;
    for (var i = 0; i < keys.length - 1; i++) { if (!o[keys[i]] || typeof o[keys[i]] !== 'object') o[keys[i]] = {}; o = o[keys[i]]; }
    if (value === undefined) delete o[keys[keys.length - 1]]; else o[keys[keys.length - 1]] = value;
    prune(obj);
  }
  /** Removes empty optional objects so the request carries only what was entered. */
  function prune(facts) {
    ['base', 'evidence', 'cost', 'consultant'].forEach(function (k) {
      var v = facts[k];
      if (v && typeof v === 'object') {
        Object.keys(v).forEach(function (x) { if (v[x] && typeof v[x] === 'object' && !Array.isArray(v[x]) && !Object.keys(v[x]).length) delete v[x]; });
        if (!Object.keys(v).length) delete facts[k];
      }
    });
    var fp = facts.footprint;
    if (fp && fp.migration && !Object.keys(fp.migration).length) delete fp.migration;
  }

  /* --------------------------------- Formats -------------------------------- */

  function money(fig, currency) {
    var v = fig && typeof fig === 'object' ? fig.value : fig;
    if (typeof v !== 'number') return '—';
    try { return new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency || 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(v); }
    catch (e) { return (currency || '') + ' ' + Math.round(v).toLocaleString('en-GB'); }
  }
  function pct(v) { return typeof v === 'number' ? Math.round(v * 100) + '%' : ''; }
  function when(iso) { try { return new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }); } catch (e) { return iso || ''; } }
  function sevClass(s) { return String(s || '').toLowerCase(); }

  /* --------------------------------- Top bar -------------------------------- */

  function renderTopbar() {
    clear(actions);
    if (!state) return;
    actions.appendChild(h('span', { class: 'status', id: 'save-status', role: 'status' }, state.saveStatus || ''));
    actions.appendChild(h('button', {
      class: 'btn small', type: 'button', 'aria-pressed': state.view === 'client' ? 'true' : 'false',
      onclick: function () { setView(state.view === 'client' ? 'consultant' : 'client'); }
    }, state.view === 'client' ? 'Client view: on' : 'Client view: off'));
    if (state.view === 'client') actions.appendChild(h('button', {
      class: 'btn small', type: 'button', 'aria-pressed': state.teaser ? 'true' : 'false',
      onclick: function () { state.teaser = !state.teaser; render(); }
    }, state.teaser ? 'Teaser: on' : 'Teaser: off'));
    actions.appendChild(h('button', { class: 'btn small', type: 'button', onclick: function () { closeAssessment(); } }, 'All assessments'));
  }

  /* ------------------------------- Start screen ----------------------------- */

  async function renderStart() {
    var listCard = h('section', { class: 'card', 'aria-labelledby': 'saved-h' }, h('h2', { id: 'saved-h' }, 'Your assessments'), h('p', { class: 'muted' }, 'Loading…'));
    var form = h('form', { onsubmit: function (e) { e.preventDefault(); startNew(new FormData(e.target)); } },
      field('Client organisation', h('input', { type: 'text', name: 'clientName', id: 'start-client', required: true, maxlength: '200', autocomplete: 'organization' })),
      field('Sector (optional)', h('select', { name: 'clientSector', id: 'start-sector' }, h('option', { value: '' }, 'Choose…'),
        schema.enums.sectors.map(function (s) { return h('option', { value: s.value }, s.label); }))),
      h('fieldset', { class: 'field' }, h('legend', null, 'Mode'),
        h('div', { class: 'mode-choice' }, ['executive', 'workshop'].map(function (m, i) {
          var preset = new URLSearchParams(location.search).get('mode');  // links can open a mode directly; the retired FinOps Value Case page forwards to ?mode=executive
          return h('label', null, h('input', { type: 'radio', name: 'mode', value: m, checked: MODE_INFO[preset] ? m === preset : i === 0 }),
            h('strong', null, MODE_INFO[m].label + ' · ' + MODE_INFO[m].duration), h('br'), h('span', { class: 'small muted' }, MODE_INFO[m].text));
        }))),
      h('div', null, h('button', { class: 'btn primary', type: 'submit' }, 'Start assessment')));
    append(app, [
      h('h1', null, 'FinOps IQ'),
      h('p', { class: 'muted' }, 'Rates your FinOps capabilities on the FinOps Foundation\'s Crawl, Walk, Run scale, sets them against a target for your estate, and sizes the value of closing the gaps as a conservative, expected and upper range.'),
      dataNotice(),
      h('section', { class: 'card start', 'aria-labelledby': 'new-h' }, h('h2', { id: 'new-h' }, 'New assessment'), form),
      listCard
    ]);
    var res = await call(ASSESSMENT);
    clear(listCard);
    listCard.appendChild(h('h2', { id: 'saved-h' }, 'Your assessments'));
    if (listNotice) {
      var notice = h('p', { class: 'small', role: 'status', tabindex: '-1', id: 'list-notice' }, listNotice);
      listNotice = null;
      listCard.appendChild(notice);
      notice.focus();
    }
    if (res.status !== 200) { listCard.appendChild(h('p', { class: 'notice error' }, 'Saved assessments could not be loaded. Please try again.')); return; }
    var items = res.body.data || [];
    if (!items.length) { listCard.appendChild(h('p', { class: 'muted' }, 'No saved assessments yet.')); return; }
    listCard.appendChild(h('div', { class: 'table-wrap' }, h('table', null,
      h('thead', null, h('tr', null, ['Client', 'Mode', 'Status', 'Last saved', ''].map(function (t) { return h('th', { scope: 'col' }, t); }))),
      h('tbody', null, items.map(function (a) {
        return h('tr', null, h('td', null, a.clientName), h('td', null, MODE_INFO[a.mode] ? MODE_INFO[a.mode].label : a.mode),
          h('td', null, statusLabel(a.status)), h('td', null, when(a.updatedAt || a.startedAt)),
          h('td', { class: 'actions' }, h('button', { class: 'btn small', type: 'button', 'aria-label': 'Open ' + a.clientName, onclick: function () { openAssessment(a.assessmentId); } }, 'Open'),
            deleteControl(a))); })))));
  }

  /**
   * Deletion at the client's request (M6): permanent, so it asks for a second click in place. Focus follows the
   * control as it changes (M7 keyboard check): to the confirm button, back to Delete on Cancel, and to the
   * announcement once the list reloads.
   */
  function deleteControl(a) {
    var cell = h('span', { class: 'delete' });
    function ask() {
      var yes = h('button', { class: 'btn small danger', type: 'button', 'aria-label': 'Confirm delete ' + a.clientName, onclick: confirm }, 'Delete');
      clear(cell);
      append(cell, [h('span', { class: 'small', role: 'status' }, 'Delete permanently? '), yes,
        h('button', { class: 'btn small', type: 'button', onclick: function () { reset().focus(); } }, 'Cancel')]);
      yes.focus();
    }
    function reset() {
      var btn = h('button', { class: 'btn small', type: 'button', 'aria-label': 'Delete ' + a.clientName, onclick: ask }, 'Delete');
      clear(cell);
      cell.appendChild(btn);
      return btn;
    }
    async function confirm() {
      var res = await call(ASSESSMENT, { method: 'POST', body: JSON.stringify({ action: 'delete', assessmentId: a.assessmentId }) });
      if (res.status !== 200) { clear(cell); cell.appendChild(h('span', { class: 'small text-error', role: 'alert', tabindex: '-1' }, 'Not deleted. Please try again.')); cell.firstChild.focus(); return; }
      listNotice = a.clientName + ' deleted.';
      render();
    }
    reset();
    return cell;
  }
  function field(label, control, hint) {
    var id = control.id;
    return h('div', { class: 'field' }, h('label', { for: id }, label), hint ? h('p', { class: 'hint' }, hint) : null, control);
  }
  function platformLabel(p) { var o = schema.enums.platforms.find(function (x) { return x.value === p; }); return o ? o.label : p; }
  function statusLabel(s) { return { draft: 'Draft', in_progress: 'In progress', completed: 'Completed', archived: 'Archived' }[s] || s; }

  function dataNotice() {
    var n = schema.notices;
    return h('div', { class: 'notice', role: 'note' }, h('strong', null, 'How your data is handled. '), n.data);
  }

  /* --------------------------- Open, start and close ------------------------ */

  function newId() {
    var rnd = (window.crypto && crypto.randomUUID) ? crypto.randomUUID().replace(/-/g, '').slice(0, 12) : Math.random().toString(36).slice(2, 14);
    return 'FIQ-' + Date.now().toString(36) + '-' + rnd;
  }

  async function startNew(form, carry) {
    var session = API.readSession() || {};
    var mode = carry ? carry.mode : form.get('mode');
    var sector = carry ? carry.clientSector : form.get('clientSector') || undefined;
    var facts = carry ? JSON.parse(JSON.stringify(carry.facts)) : { org: { currency: 'USD' }, footprint: { publicCloudProviders: [], scopes: [] }, spend: { byScope: {} } };
    if (sector && !facts.org.sector) facts.org.sector = sector;
    state = {
      assessmentId: newId(), clientName: carry ? carry.clientName : String(form.get('clientName')).trim(), clientSector: sector,
      respondentEmail: session.email, status: 'draft', startedAt: new Date().toISOString(), mode: mode,
      facts: facts, answers: carry ? JSON.parse(JSON.stringify(carry.answers)) : {}, consultantNotes: '', clientLogo: carry ? carry.clientLogo || '' : '',
      result: null, errors: [], step: 'estate', view: 'consultant', saveStatus: ''
    };
    var saved = await persist('save');
    if (!saved) { state = null; render(); return; }
    setUrl();
    render();
    evaluate();
  }

  async function openAssessment(id, view) {
    var res = await call(ASSESSMENT + '?assessmentId=' + encodeURIComponent(id) + (view === 'client' ? '&view=client' : ''));
    if (res.status !== 200) { clear(app); app.appendChild(h('p', { class: 'notice error' }, res.status === 404 ? 'This assessment was not found.' : 'This assessment could not be opened.')); return; }
    var a = res.body.data;
    var req = a.request || {};
    state = {
      assessmentId: a.assessmentId, clientName: a.clientName, clientSector: a.clientSector || undefined, respondentEmail: a.respondentEmail,
      status: a.status, startedAt: a.startedAt, completedAt: a.completedAt, archivedAt: a.archivedAt, mode: a.mode,
      facts: req.facts || { org: { currency: 'USD' }, footprint: { publicCloudProviders: [], scopes: [] }, spend: { byScope: {} } },
      answers: req.answers || {}, consultantNotes: a.consultantNotes || '', clientLogo: a.clientLogo || '', result: a.result || null, errors: [],
      step: a.result && (a.status === 'completed' || a.status === 'archived') ? 'results' : 'estate', view: view === 'client' ? 'client' : 'consultant', saveStatus: a.status === 'completed' || a.status === 'archived' ? statusLabel(a.status) : 'Saved'
    };
    setUrl();
    render();
    if (!isFinal()) evaluate();
  }

  function closeAssessment() { state = null; history.replaceState(null, '', location.pathname); render(); }
  function setUrl() {
    var p = new URLSearchParams();
    p.set('assessment', state.assessmentId);
    if (state.view === 'client') p.set('view', 'client');
    history.replaceState(null, '', location.pathname + '?' + p.toString());
  }
  function isFinal() { return state.status === 'completed' || state.status === 'archived'; }

  async function setView(view) {
    state.view = view;
    setUrl();
    if (isFinal()) { await openAssessment(state.assessmentId, view); return; }
    render();
    evaluate(true);
  }

  /* ------------------------------ Save and score ---------------------------- */

  function request() { return { mode: state.mode, facts: state.facts, answers: state.answers }; }

  function snapshot(status) {
    var s = { assessmentId: state.assessmentId, clientName: state.clientName, respondentEmail: state.respondentEmail, status: status, startedAt: state.startedAt, request: request() };
    if (state.clientSector) s.clientSector = state.clientSector;
    if (state.consultantNotes) s.consultantNotes = state.consultantNotes;
    if (state.clientLogo) s.clientLogo = state.clientLogo;
    return s;
  }

  async function persist(action) {
    var status = action === 'complete' ? 'completed' : action === 'archive' ? 'archived' : (state.status === 'draft' && !Object.keys(state.answers).length ? 'draft' : 'in_progress');
    showSave('Saving…');
    var res = await call(ASSESSMENT, { method: 'POST', body: JSON.stringify({ action: action, snapshot: snapshot(status) }) });
    if (res.status !== 200) {
      showSave('Not saved');
      state.saveError = (res.body.details && res.body.details.length ? res.body.details : [res.body.message || res.body.error || 'The assessment could not be saved.']);
      render();
      return null;
    }
    state.saveError = null;
    state.status = res.body.data.status;
    if (res.body.data.completedAt) state.completedAt = res.body.data.completedAt;
    if (res.body.data.result) state.result = res.body.data.result;
    showSave(isFinal() ? statusLabel(state.status) : 'Saved ' + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
    return res.body.data;
  }
  function showSave(text) { state.saveStatus = text; var el = document.getElementById('save-status'); if (el) el.textContent = text; }

  /** Something changed: score it and save it, each after a short pause. */
  function changed() {
    if (isFinal()) return;
    updateLive();
    showSave('Unsaved changes');
    clearTimeout(timers.save);
    timers.save = setTimeout(function () { persist('save'); }, 1200);
    evaluate();
  }

  /** Scores after a short pause, and at least once a second during continuous input. */
  function evaluate(now) {
    var t = Date.now();
    if (!timers.firstChange) timers.firstChange = t;
    clearTimeout(timers.evaluate);
    var wait = now ? 0 : Math.max(0, Math.min(450, timers.firstChange + 1000 - t));
    timers.evaluate = setTimeout(runEvaluate, wait);
  }
  async function runEvaluate() {
    timers.firstChange = 0;
    timers.evaluate = null;
    var seq = (timers.seq = (timers.seq || 0) + 1);
    timers.inFlight = (timers.inFlight || 0) + 1;
    var res;
    try { res = await call(EVALUATE + (state.view === 'client' ? '?view=client' : ''), { method: 'POST', body: JSON.stringify(request()) }); }
    finally { timers.inFlight--; }
    if (!state || seq !== timers.seq) return;
    if (res.status === 200) { state.result = res.body.data; state.errors = []; }
    else if (res.status === 400) { state.result = null; state.errors = res.body.details || [res.body.error]; }
    else { state.errors = ['Scoring is unavailable right now. Your answers are kept; try again shortly.']; }
    refresh();
  }

  /**
   * After a scoring reply: when the questions on screen are the same, only the counts, the progress bar and each
   * question's status change, in place, so typing and scrolling are never interrupted. When the server asks a
   * different set of questions on this step (a follow-up), the step is drawn again and the new question is marked.
   */
  var shown = { key: null, ids: [] };
  function structureKey() {
    var all = steps();
    var cur = currentStep(all);
    return [state.mode, state.view, isFinal(), cur.id, cur.questions.map(function (q) { return q.id; }).join(',')].join('|');
  }
  function navKey(all) { return all.map(function (x) { return x.id; }).join(','); }
  function refresh() {
    if (!state) return;
    if (structureKey() !== shown.key) {
      var before = shown.ids;
      render();
      var added = before.length ? shown.ids.filter(function (id) { return before.indexOf(id) < 0; }) : [];
      added.forEach(function (id) { var el = document.getElementById('q-' + id); if (el) el.classList.add('q-new'); });
      if (added.length) announce(added.length === 1 ? 'A follow-up question was added: ' + added[0] + '.' : added.length + ' follow-up questions were added.');
      return;
    }
    updateLive();
  }
  function updateLive() {
    var all = steps();
    // A step appeared or went (the server now asks a different set elsewhere): redraw the step list only.
    var navEl = document.querySelector('nav.steps');
    if (navEl && navEl.getAttribute('data-key') !== navKey(all)) navEl.replaceWith(stepNav(all, currentStep(all)));
    var row = document.getElementById('nav-row');
    if (row && !row.contains(document.activeElement)) row.replaceWith(navRow(all, currentStep(all)));
    all.forEach(function (st) {
      var btn = document.querySelector('nav.steps button[data-step="' + st.id + '"]');
      if (!btn) return;
      btn.className = stepClass(st);
      var c = btn.querySelector('.count');
      if (c) c.textContent = stepCount(st);
      btn.disabled = st.needsFacts && !state.result;
    });
    var cov = document.getElementById('coverage');
    if (cov) cov.replaceWith(coverageBlock());
    currentStep(all).questions.forEach(function (q) {
      var el = document.getElementById('q-' + q.id);
      if (!el) return;
      var st = questionStatus(q);
      el.classList.remove('is-answered', 'is-missing', 'is-unknown', 'is-required');
      el.classList.add.apply(el.classList, st.classes);
      var pill = el.querySelector('.q-status');
      if (pill) pill.replaceWith(statusPill(st));
      var slot = el.querySelector('.q-clear');
      if (slot) slot.replaceWith(clearSlot(q));
    });
    var fn = document.getElementById('facts-notice');
    if (fn) fn.replaceWith(factsSlot());
    var rv = document.getElementById('review-body');
    if (rv) rv.replaceWith(reviewBody());
  }

  /* ------------------------------ Assessment view --------------------------- */

  function asked(id) { return state.result ? state.result.questions.asked.indexOf(id) >= 0 : false; }
  function inMode(q) { return q.modes.indexOf(state.mode) >= 0; }

  /**
   * The steps: estate, one per domain, value inputs, your view, then Review and complete. Results appear only once
   * the assessment is completed (owner feedback, 22 Oct 2026: a live preview read as the result and made completion
   * look like it did nothing). A follow-up question is placed straight after the question that brought it in.
   */
  function steps() {
    var list = [{ id: 'estate', label: 'Your estate', questions: schema.questions.filter(function (q) { return q.kind === 'scope' && inMode(q); }) }];
    schema.domains.forEach(function (d) {
      var qs = schema.questions.filter(function (q) { return q.kind === 'maturity' && inMode(q) && capabilityDomain(q.capability) === d.id && (!state.result || asked(q.id)); });
      if (qs.length) list.push({ id: d.id, label: d.name, questions: withFollowUps(qs), needsFacts: true });
    });
    var vb = schema.questions.filter(function (q) { return q.kind === 'value_base' && inMode(q) && asked(q.id); });
    if (vb.length) list.push({ id: 'value', label: 'Value inputs', questions: vb, needsFacts: true });
    list.push({ id: 'view', label: 'Your view', questions: schema.questions.filter(function (q) { return q.kind === 'hypothesis' && inMode(q) && (!state.result || asked(q.id)); }), needsFacts: true });
    list.push(isFinal() ? { id: 'results', label: 'Results', questions: [], needsFacts: true } : { id: 'review', label: 'Review & complete', questions: [], needsFacts: true });
    return list;
  }
  function currentStep(all) {
    var want = state.step === 'results' || state.step === 'review' ? (isFinal() ? 'results' : 'review') : state.step;
    return all.find(function (x) { return x.id === want; }) || all[0];
  }
  function withFollowUps(qs) {
    var out = qs.filter(function (q) { return !followUpHere(q, qs); });
    qs.filter(function (q) { return followUpHere(q, qs); }).forEach(function (f) {
      var at = -1;
      out.forEach(function (q, i) { if (f.followUpOf.indexOf(q.id) >= 0) at = i; });
      while (at >= 0 && at + 1 < out.length && out[at + 1].followUpOf) at++;
      out.splice(at + 1, 0, f);
    });
    return out;
  }
  function followUpHere(q, qs) { return !!q.followUpOf && qs.some(function (x) { return q.followUpOf.indexOf(x.id) >= 0; }); }
  function capabilityDomain(id) { var c = schema.capabilities.find(function (x) { return x.id === id; }); return c && c.domain; }
  function capabilityName(id) { var c = schema.capabilities.find(function (x) { return x.id === id; }); return c ? c.displayName : id; }
  function isAnswered(q) {
    if (q.kind === 'scope' || q.kind === 'value_base') return (q.fields || [{ fact: null }]).some(function (f) { return f.fact && get(state.facts, f.fact) !== undefined; }) || (q.id === 'SC-01' && get(state.facts, 'footprint.infrastructureMix') !== undefined) || (q.id === 'SC-02' && (state.facts.footprint.publicCloudProviders.length > 0 || !!state.noneYet)) || (q.id === 'SC-03' && state.facts.footprint.scopes.length > 0) || (q.id === 'SC-04' && Object.keys(state.facts.spend.byScope).length > 0);
    return state.answers[q.id] !== undefined;
  }
  /** Required: every capability question asked, and the estate questions that decide what is asked. */
  var REQUIRED_SCOPE = ['SC-01', 'SC-02', 'SC-03', 'SC-04'];
  function isRequired(q) { return q.kind === 'maturity' || (q.kind === 'scope' && REQUIRED_SCOPE.indexOf(q.id) >= 0); }
  function isUnknown(q) { var a = state.answers[q.id]; return a === 'unknown' || a === 'dont_know'; }
  /** Unanswered required questions turn red once their step has been left, or on the Review step. */
  function questionStatus(q) {
    var ui = (state.ui = state.ui || {});
    var visited = ui.visited && ui.visited[stepOf(q)];
    if (isAnswered(q)) return isUnknown(q) ? { key: 'unknown', text: 'Don\'t know', classes: ['is-answered', 'is-unknown'] } : { key: 'answered', text: 'Answered', classes: ['is-answered'] };
    if (!isRequired(q)) return { key: 'optional', text: 'Optional', classes: [] };
    return visited || state.step === 'review' ? { key: 'missing', text: 'Required: not answered', classes: ['is-required', 'is-missing'] } : { key: 'required', text: 'Required', classes: ['is-required'] };
  }
  function stepOf(q) { var st = steps().find(function (x) { return x.questions.indexOf(q) >= 0; }); return st ? st.id : null; }
  function statusPill(st) { return h('span', { class: 'q-status ' + st.key }, st.text); }
  function missingIn(st) { return st.questions.filter(function (q) { return isRequired(q) && !isAnswered(q); }); }
  function stepCount(st) { return st.questions.length ? st.questions.filter(isAnswered).length + '/' + st.questions.length : ''; }
  function stepClass(st) {
    if (!st.questions.length) return 'step';
    var done = st.questions.filter(isAnswered).length, missing = missingIn(st).length;
    var visited = state.ui && state.ui.visited && state.ui.visited[st.id];
    return 'step ' + (missing === 0 && done ? 'complete' : visited && missing ? 'missing' : done ? 'partial' : '');
  }
  function leaveStep(to) {
    var ui = (state.ui = state.ui || {});
    (ui.visited = ui.visited || {})[state.step] = true;
    state.step = to;
  }

  function coverageBlock() {
    var cov = state.result && state.result.coverage;
    if (!cov) return h('div', { id: 'coverage' });
    var pctDone = cov.asked ? Math.round(100 * cov.answered / cov.asked) : 0;
    return h('div', { id: 'coverage', class: 'coverage' },
      h('div', { class: 'coverage-ring', style: '--p:' + pctDone, 'aria-hidden': 'true' }, h('span', null, pctDone + '%')),
      h('div', null, h('strong', null, cov.answered + ' of ' + cov.asked), h('span', { class: 'small muted' }, ' questions answered'),
        h('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(cov.asked), 'aria-valuenow': String(cov.answered), 'aria-label': 'Questions answered' }, h('i', { style: 'width:' + pctDone + '%' }))));
  }

  function stepNav(all, current) {
    var ready = !!state.result;
    return h('nav', { class: 'steps', 'aria-label': 'Assessment steps', 'data-key': navKey(all) }, h('ol', null, all.map(function (st, i) {
      return h('li', null, h('button', {
        type: 'button', class: stepClass(st), 'data-step': st.id, 'aria-current': st.id === current.id ? 'step' : null, disabled: st.needsFacts && !ready,
        onclick: function () { leaveStep(st.id); render(); var m = document.getElementById('main'); if (m) m.focus({ preventScroll: true }); window.scrollTo(0, 0); }
      }, h('span', { class: 'step-no', 'aria-hidden': 'true' }, st.id === 'review' || st.id === 'results' ? '✓' : String(i + 1)), h('span', { class: 'step-label' }, st.label), h('span', { class: 'count' }, stepCount(st))));
    })));
  }

  function renderAssessment() {
    var all = steps();
    var current = currentStep(all);
    var ready = !!state.result;
    var nav = stepNav(all, current);
    var head = h('div', { class: 'header-row' },
      h('div', { class: 'client-id' }, logoControl(), h('div', null, h('h1', null, state.clientName), h('p', { class: 'muted small' }, MODE_INFO[state.mode].label + ' mode · ' + MODE_INFO[state.mode].duration + ' · ' + statusLabel(state.status) + (state.completedAt ? ' ' + when(state.completedAt) : '')))),
      current.id === 'results' ? null : coverageBlock());
    var body = h('div', { class: 'step-body' + (isFinal() ? ' read-only' : '') });
    if (state.saveError) body.appendChild(h('div', { class: 'notice error', role: 'alert' }, h('strong', null, 'Not saved. '), h('ul', null, state.saveError.slice(0, 6).map(function (e) { return h('li', null, e); }))));
    if (current.id === 'results') renderResults(body);
    else if (current.id === 'review') renderReview(body);
    else {
      body.appendChild(h('div', { class: 'step-head' }, h('h2', null, current.label), h('p', { class: 'muted' }, stepIntro(current.id))));
      if (current.id === 'estate') body.appendChild(factsSlot());
      renderQuestions(body, current);
      if (current.id === 'estate' && state.mode === 'executive' && state.view !== 'client') body.appendChild(setupCard());
      if (current.id === 'view' && state.view !== 'client') body.appendChild(notesCard());
    }
    if (current.id !== 'results') body.appendChild(navRow(all, current));
    append(app, current.id === 'results' ? [h('div', { class: 'layout results-layout' }, nav, body)] : [head, h('div', { class: 'layout' }, nav, body)]);
    shown.key = structureKey();
    shown.ids = current.questions.map(function (q) { return q.id; });
  }

  /** Back and next; drawn again in place when the step list changes. */
  function navRow(all, current) {
    var idx = all.indexOf(current), ready = !!state.result;
    return h('div', { class: 'nav-row', id: 'nav-row' },
      idx > 0 ? h('button', { class: 'btn', type: 'button', onclick: function () { leaveStep(all[idx - 1].id); render(); window.scrollTo(0, 0); } }, '← ' + all[idx - 1].label) : h('span'),
      idx < all.length - 1 ? h('button', { class: 'btn primary', type: 'button', disabled: all[idx + 1].needsFacts && !ready, onclick: function () { leaveStep(all[idx + 1].id); render(); window.scrollTo(0, 0); } }, all[idx + 1].label + ' →') : null);
  }

  function stepIntro(id) {
    if (id === 'estate') return 'Scope and spend decide which capabilities and questions apply. They are never scored.';
    if (id === 'value') return 'Measured inputs from your billing data and provider tools. Without them, the matching value lever is listed but not quantified.';
    if (id === 'view') return 'Your own view, shown beside the model. It never changes a rating or a number.';
    return 'Choose the option that fully describes you today. "Don\'t know" is always fine: it is listed as a blind spot, never guessed.';
  }

  /**
   * The questions of a step. In workshop mode a domain's questions come in two groups: the core questions, also asked
   * in the executive session, and the workshop deep-dive. When the core questions are already answered (an executive
   * assessment continued in the workshop) they fold into one line that opens for review, so the workshop starts on
   * the new questions instead of mixing them in with answered ones (owner feedback, 22 Oct 2026).
   */
  function renderQuestions(body, current) {
    var qs = current.questions;
    var exec = schema.executiveSet;
    var n = 0;
    // A follow-up is indented under its trigger only when the trigger is drawn straight above it.
    var draw = function (list, into) {
      var prev = null;
      list.forEach(function (q) { n++; into.appendChild(question(q, n, qs.length, !!(q.followUpOf && prev && (q.followUpOf.indexOf(prev.id) >= 0 || prev.followUpOf)))); prev = q; });
    };
    if (state.mode !== 'workshop' || current.id === 'estate' || current.id === 'view' || current.id === 'value') { draw(qs, body); return; }
    var core = qs.filter(function (q) { return exec.indexOf(q.id) >= 0; });
    var deep = qs.filter(function (q) { return exec.indexOf(q.id) < 0; });
    if (!core.length || !deep.length) { draw(qs, body); return; }
    var ui = (state.ui = state.ui || {});
    var open = (ui.coreOpen = ui.coreOpen || {});
    var allDone = core.every(isAnswered);
    var isOpen = open[current.id] !== undefined ? open[current.id] : !allDone;
    var group = h('section', { class: 'q-group core' + (isOpen ? ' open' : '') },
      h('div', { class: 'q-group-head' },
        h('div', null, h('h3', null, 'Core questions'), h('p', { class: 'small muted' }, allDone ? 'All ' + core.length + ' answered, as in the executive session. Open them to review or change an answer.' : 'Also asked in the executive session.')),
        h('button', { class: 'btn small', type: 'button', 'aria-expanded': isOpen ? 'true' : 'false', id: 'core-toggle-' + current.id, onclick: function () { open[current.id] = !isOpen; render(); } }, isOpen ? 'Hide' : 'Review ' + core.length + ' answers')));
    if (isOpen) draw(core, group); else n += core.length;
    body.appendChild(group);
    var dg = h('section', { class: 'q-group deep' }, h('div', { class: 'q-group-head' }, h('div', null, h('h3', null, 'Workshop deep-dive'), h('p', { class: 'small muted' }, deep.length + ' questions for the workshop, with the cloud, FinOps, finance and engineering leads.'))));
    draw(deep, dg);
    body.appendChild(dg);
  }

  function factsSlot() {
    if (!state.errors.length) return h('div', { id: 'facts-notice' });
    var errs = state.errors.map(function (e) { return e.replace(/^facts\./, ''); });
    return h('div', { class: 'notice warn', role: 'status', id: 'facts-notice' }, h('strong', null, 'To continue, complete:'), h('ul', null, errs.slice(0, 8).map(function (e) { return h('li', null, e); })));
  }
  function factsNotice() { return factsSlot(); }

  /**
   * Review and complete: what is answered, what is still missing (with a link to each), then completion. The
   * result is not shown here; it appears after the server has scored and recorded it.
   */
  function renderReview(body) {
    body.appendChild(h('div', { class: 'step-head' }, h('h2', null, 'Review and complete'), h('p', { class: 'muted' }, 'Check what is still open, then complete the assessment. The server scores the saved answers, records the result and dates it today.')));
    body.appendChild(factsSlot());
    body.appendChild(reviewBody());
  }
  function reviewBody() {
    var all = steps().filter(function (x) { return x.questions.length; });
    var qs = [].concat.apply([], all.map(function (x) { return x.questions; }));
    var req = qs.filter(isRequired), reqDone = req.filter(isAnswered).length;
    var unknown = qs.filter(function (q) { return isAnswered(q) && isUnknown(q); }).length;
    var optional = qs.filter(function (q) { return !isRequired(q); }), optDone = optional.filter(isAnswered).length;
    var missing = req.length - reqDone;
    var box = h('div', { id: 'review-body' });
    box.appendChild(h('div', { class: 'review-kpis' },
      reviewKpi(missing ? 'warn' : 'ok', reqDone + ' / ' + req.length, 'Required answered'),
      reviewKpi(missing ? 'bad' : 'ok', String(missing), 'Required still open'),
      reviewKpi('neutral', String(unknown), '"Don\'t know" answers'),
      reviewKpi('neutral', optDone + ' / ' + optional.length, 'Optional answered')));
    box.appendChild(h('div', { class: 'card review-steps' }, h('h3', null, 'By step'), h('ul', null, all.map(function (st) {
      var miss = missingIn(st);
      var done = st.questions.filter(isAnswered).length;
      return h('li', { class: miss.length ? 'has-missing' : 'is-done' },
        h('div', { class: 'rs-head' }, h('strong', null, st.label), h('span', { class: 'small muted' }, done + ' of ' + st.questions.length + ' answered'),
          h('span', { class: 'rs-bar', 'aria-hidden': 'true' }, h('i', { style: 'width:' + Math.round(100 * done / st.questions.length) + '%' }))),
        miss.length ? h('div', { class: 'rs-missing' }, h('span', { class: 'small' }, 'Required, not answered: '), miss.map(function (q) {
          return h('button', { class: 'btn link small', type: 'button', onclick: function () { goToQuestion(st.id, q.id); } }, q.id);
        })) : null);
    }))));
    if (state.view !== 'client' && !isFinal()) {
      box.appendChild(h('div', { class: 'card complete-card' },
        h('div', null, h('h3', null, 'Complete the assessment'),
          h('p', { class: 'small muted' }, missing ? missing + ' required ' + (missing === 1 ? 'question is' : 'questions are') + ' still open. Unanswered questions count as the largest gap and are listed as blind spots; you can complete now or answer them first.' : 'Everything required is answered. After completion the answers cannot be changed; start a new assessment to revise them.')),
        h('button', { class: 'btn primary big-btn', type: 'button', disabled: !state.result, onclick: complete }, missing ? 'Complete anyway' : 'Complete assessment')));
    }
    return box;
  }
  function reviewKpi(tone, value, label) { return h('div', { class: 'rk ' + tone }, h('strong', null, value), h('span', null, label)); }
  function goToQuestion(stepId, qid) {
    var ui = (state.ui = state.ui || {});
    (ui.coreOpen = ui.coreOpen || {})[stepId] = true;
    leaveStep(stepId);
    render();
    var el = document.getElementById('q-' + qid);
    if (el) { el.scrollIntoView({ block: 'center' }); var first = el.querySelector('input, select, textarea, button'); if (first) first.focus({ preventScroll: true }); el.classList.add('q-new'); }
  }

  /**
   * Executive mode has no cost-rate question: the consultant sets the rate at engagement setup (DESIGN.md Q4).
   * Without it the report shows the verdict and the levers but no money figure.
   */
  function setupCard() {
    return h('fieldset', { class: 'question consultant', id: 'q-setup', disabled: isFinal() }, h('legend', null, 'Engagement setup'),
      h('p', { class: 'help' }, 'Set by the consultant; not shown in client view. Value figures are net of implementation effort, so no money figure is shown until this is set.'),
      amountWidget('cost.internalRate', 'Loaded internal cost per FTE-month', { allowBand: true, allowUnknown: true }));
  }

  /**
   * The client's logo (carried over from FinOps Value Case): shown beside the client name and on the report cover.
   * The consultant adds or replaces it while the assessment is open; the image is scaled down in the browser to at
   * most 480 by 160 pixels, so it stays small enough to keep with the assessment.
   */
  function logoControl() {
    var img = state.clientLogo ? h('img', { class: 'client-logo', src: state.clientLogo, alt: state.clientName + ' logo' }) : null;
    if (state.view === 'client' || isFinal()) return img;
    var input = h('input', { type: 'file', id: 'client-logo', accept: 'image/png,image/jpeg', class: 'visually-hidden', onchange: function (e) { loadLogo(e.target.files[0]); e.target.value = ''; } });
    return h('div', { class: 'logo-control' }, img,
      input, h('label', { for: 'client-logo', class: 'btn small' }, state.clientLogo ? 'Change logo' : 'Add client logo'),
      state.clientLogo ? h('button', { type: 'button', class: 'btn small link', onclick: function () { state.clientLogo = ''; render(); persist('save'); } }, 'Remove logo') : null);
  }
  function loadLogo(file) {
    if (!file || !/^image\/(png|jpeg)$/.test(file.type)) { showSave('Logo not added: choose a PNG or JPEG image'); return; }
    var reader = new FileReader();
    reader.onload = function () {
      var im = new Image();
      im.onload = function () {
        var scale = Math.min(1, 480 / im.width, 160 / im.height);
        var c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(im.width * scale)); c.height = Math.max(1, Math.round(im.height * scale));
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        var url = c.toDataURL('image/png');
        if (url.length > 140000) url = c.toDataURL('image/jpeg', 0.85);
        if (url.length > 140000) { showSave('Logo not added: the image is too detailed; try a simpler file'); return; }
        state.clientLogo = url; render(); persist('save');
      };
      im.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function notesCard() {
    var id = 'notes';
    return h('div', { class: 'card consultant' }, h('h3', null, 'Notes'),
      h('label', { for: id, class: 'small muted' }, 'Saved with the assessment; never shown in client view or sent to the scoring engine. Do not record personal details about individuals.'),
      h('textarea', { id: id, maxlength: '20000', disabled: isFinal(), oninput: function (e) { state.consultantNotes = e.target.value; showSave('Unsaved changes'); clearTimeout(timers.save); timers.save = setTimeout(function () { persist('save'); }, 1200); } }, state.consultantNotes));
  }

  /* -------------------------------- Questions ------------------------------- */

  /**
   * One question as a card: its number and text, then a line with its id, capability and status (answered, required,
   * optional, or "Required: not answered" in red once its step has been left), the options, and its basis.
   */
  function question(q, n, total, nested) {
    var st = questionStatus(q);
    var wrap = h('fieldset', { class: ['question'].concat(st.classes).join(' ') + (nested ? ' follow-up' : ''), id: 'q-' + q.id, disabled: isFinal() });
    wrap.appendChild(h('legend', { class: 'q-legend' }, h('span', { class: 'q-num', 'aria-hidden': 'true' }, String(n)), h('span', { class: 'q-text' }, q.text)));
    var trigger = q.followUpOf && q.followUpOf.filter(function (id) { return state.answers[id] !== undefined; });
    wrap.appendChild(h('div', { class: 'q-meta' },
      h('span', { class: 'q-id' }, q.id),
      q.capability ? h('span', { class: 'q-cap' }, capabilityName(q.capability)) : null,
      q.followUpOf ? h('span', { class: 'q-follow' }, 'Follow-up to ' + (trigger && trigger.length ? trigger : q.followUpOf).join(' and ')) : null,
      statusPill(st)));
    if (q.help) wrap.appendChild(h('p', { class: 'help' }, q.help));
    if (q.kind === 'scope' || q.kind === 'value_base') wrap.appendChild(factControl(q));
    else wrap.appendChild(answerControl(q));
    var foot = h('div', { class: 'q-foot' });
    if (q.basis && q.basis.length) foot.appendChild(h('details', { class: 'basis' }, h('summary', null, 'Based on ' + q.basis.length + (q.basis.length === 1 ? ' source' : ' sources')), h('ul', null, q.basis.map(function (b) { return h('li', null, b.citation); }))));
    foot.appendChild(clearSlot(q));
    wrap.appendChild(foot);
    return wrap;
  }
  function clearSlot(q) {
    var can = (q.kind === 'maturity' || q.kind === 'hypothesis') && state.answers[q.id] !== undefined && !isFinal();
    return h('span', { class: 'q-clear' }, can ? h('button', { class: 'btn link small', type: 'button', onclick: function () { delete state.answers[q.id]; changed(); render(); } }, 'Clear answer') : null);
  }

  var LETTERS = 'ABCDEFGHIJ';
  function radios(name, options, value, onPick) {
    var lettered = 0;
    return h('div', { class: 'options', role: 'radiogroup' }, options.map(function (o, i) {
      var id = name + '-' + i;
      var unknown = o.value === 'unknown' || o.value === 'dont_know' || o.value === '__none';
      return h('label', { class: 'option' + (unknown ? ' unknown' : ''), for: id },
        h('input', { type: 'radio', name: name, id: id, value: o.value, checked: value === o.value, onchange: function () { onPick(o.value); } }),
        h('span', { class: 'opt-mark', 'aria-hidden': 'true' }, unknown ? '?' : LETTERS.charAt(lettered++)),
        h('span', { class: 'opt-text' }, o.label));
    }));
  }
  function checks(name, options, values, onToggle) {
    return h('div', { class: 'options' }, options.map(function (o, i) {
      var id = name + '-' + i;
      return h('label', { class: 'option check', for: id },
        h('input', { type: 'checkbox', name: name, id: id, value: o.value, checked: values.indexOf(o.value) >= 0, onchange: function (e) { onToggle(o.value, e.target.checked); } }),
        h('span', { class: 'opt-mark', 'aria-hidden': 'true' }), h('span', { class: 'opt-text' }, o.label));
    }));
  }

  function answerControl(q) {
    var a = state.answers[q.id];
    var name = 'a-' + q.id;
    var setA = function (v) { if (v === undefined) delete state.answers[q.id]; else state.answers[q.id] = v; changed(); };
    switch (q.answerType) {
      case 'single_select':
        return radios(name, q.options, a, function (v) { setA(v); });
      case 'multi_select': {
        var items = q.options.filter(function (o) { return o.value !== 'unknown'; });
        var hasUnknown = q.options.some(function (o) { return o.value === 'unknown'; });
        var list = Array.isArray(a) ? a : [];
        var box = h('div', null, checks(name, items, list, function (v, on) {
          var next = list.filter(function (x) { return x !== v; }); if (on) next.push(v);
          setA(next); render();
        }));
        var extra = [{ value: '__none', label: 'None of these' }];
        if (hasUnknown) extra.push({ value: 'unknown', label: 'Don\'t know' });
        box.appendChild(radios(name + '-x', extra, a === 'unknown' ? 'unknown' : (Array.isArray(a) && !a.length ? '__none' : undefined), function (v) { setA(v === '__none' ? [] : 'unknown'); render(); }));
        return box;
      }
      case 'rank': {
        var order = Array.isArray(a) ? a.slice() : q.options.map(function (o) { return o.value; });
        var label = function (v) { var o = q.options.find(function (x) { return x.value === v; }); return o ? o.label : v; };
        var move = function (i, d) { var j = i + d; if (j < 0 || j >= order.length) return; var t = order[i]; order[i] = order[j]; order[j] = t; setA(order.slice()); render(); };
        return h('div', null,
          h('ol', { class: 'rank-list' }, order.map(function (v, i) {
            return h('li', null, h('span', null, (i + 1) + '. ' + label(v)),
              h('button', { class: 'btn small', type: 'button', id: name + '-up-' + v, 'aria-label': 'Move ' + label(v) + ' up', disabled: i === 0, onclick: function () { move(i, -1); } }, '↑'),
              h('button', { class: 'btn small', type: 'button', id: name + '-down-' + v, 'aria-label': 'Move ' + label(v) + ' down', disabled: i === order.length - 1, onclick: function () { move(i, 1); } }, '↓'));
          })),
          a === undefined ? h('button', { class: 'btn small', type: 'button', style: 'margin-top:8px', onclick: function () { setA(order.slice()); render(); } }, 'Use this order') : null);
      }
      case 'allocation_100': {
        var pts = a && typeof a === 'object' ? Object.assign({}, a) : {};
        var total = Object.keys(pts).reduce(function (t, k) { return t + (pts[k] || 0); }, 0);
        return h('div', null, q.options.map(function (o) {
          var id = name + '-' + o.value;
          return h('div', { class: 'alloc' }, h('label', { for: id }, o.label),
            h('input', { type: 'number', id: id, min: '0', max: '100', step: '5', inputmode: 'numeric', value: pts[o.value] !== undefined ? String(pts[o.value]) : '', oninput: function (e) {
              var v = e.target.value === '' ? undefined : Math.max(0, Math.min(100, Number(e.target.value)));
              if (v === undefined) delete pts[o.value]; else pts[o.value] = v;
              var t = Object.keys(pts).reduce(function (s, k) { return s + pts[k]; }, 0);
              setA(t === 100 ? Object.assign({}, pts) : undefined);
              var el = document.getElementById(name + '-total'); if (el) el.textContent = 'Total ' + t + ' of 100' + (t === 100 ? '' : ' (saved when the total is 100)');
            } }));
        }), h('p', { class: 'small muted', id: name + '-total', 'aria-live': 'polite' }, 'Total ' + total + ' of 100' + (total === 100 ? '' : ' (saved when the total is 100)')));
      }
      case 'open_text': {
        var tid = name + '-text';
        return h('div', null, h('label', { for: tid, class: 'small muted' }, 'Up to 5,000 characters'),
          h('textarea', { id: tid, maxlength: '5000', oninput: function (e) { setA(e.target.value ? e.target.value : undefined); } }, typeof a === 'string' ? a : ''));
      }
    }
    return h('p', null, 'Unsupported question type');
  }

  /* ------------------------- Scope and value-base facts ---------------------- */

  function factControl(q) {
    var f = state.facts;
    var box = h('div', { class: 'subfields' });
    var fp = f.footprint;
    if (q.id === 'SC-02') {
      var noneYet = !fp.publicCloudProviders.length && state.noneYet;
      box.appendChild(checks('f-SC-02', q.options.filter(function (o) { return o.value !== 'none_yet'; }), fp.publicCloudProviders, function (v, on) {
        state.noneYet = false;
        fp.publicCloudProviders = fp.publicCloudProviders.filter(function (x) { return x !== v; });
        if (on) fp.publicCloudProviders.push(v);
        syncScopes(); changed(); render();
      }));
      box.appendChild(checks('f-SC-02-none', [{ value: 'none_yet', label: 'None yet' }], noneYet ? ['none_yet'] : [], function (v, on) {
        state.noneYet = on; if (on) fp.publicCloudProviders = []; syncScopes(); changed(); render();
      }));
      return box;
    }
    if (q.id === 'SC-03') {
      var own = fp.scopes.filter(function (s) { return s !== 'public_cloud'; });
      // Public cloud follows SC-02 (owner feedback, 22 Oct 2026: it was missing from the list): shown ticked when a
      // provider is selected there, and not ticked otherwise; it is changed through SC-02.
      var pc = fp.publicCloudProviders.length > 0;
      var names = fp.publicCloudProviders.map(function (p) { return label(schema.enums.providers, p); }).join(', ');
      box.appendChild(h('div', { class: 'options' }, h('label', { class: 'option check locked', for: 'f-SC-03-public' },
        h('input', { type: 'checkbox', id: 'f-SC-03-public', checked: pc, disabled: true, 'aria-describedby': 'f-SC-03-public-note' }),
        h('span', { class: 'opt-mark', 'aria-hidden': 'true' }),
        h('span', { class: 'opt-text' }, 'Public cloud', h('span', { class: 'opt-note', id: 'f-SC-03-public-note' }, pc ? 'Included: you selected ' + names + ' in SC-02' : 'Select a provider in SC-02 to include it')))));
      box.appendChild(checks('f-SC-03', q.options, own, function (v, on) {
        own = own.filter(function (x) { return x !== v; }); if (on) own.push(v);
        fp.scopes = own; syncScopes(); changed(); render();
      }));
      return box;
    }
    if (q.id === 'SC-04') return spendMatrix(q);
    if (q.id === 'VB-05') return recommendationRows(q);
    if (q.id === 'VB-08') return saasEvidence(q);
    (q.fields || []).forEach(function (fd) { box.appendChild(factField(q, fd)); });
    if (!q.fields && q.options) {
      // A single-select scope question (SC-01) sets one fact.
      box.appendChild(radios('f-' + q.id, q.options, get(f, 'footprint.infrastructureMix'), function (v) { set(f, 'footprint.infrastructureMix', v); changed(); }));
    }
    return box;
  }

  /** Public cloud is in scope whenever a provider is selected; spend rows follow the scope. */
  function syncScopes() {
    var fp = state.facts.footprint;
    var own = fp.scopes.filter(function (s) { return s !== 'public_cloud'; });
    fp.scopes = fp.publicCloudProviders.length ? ['public_cloud'].concat(own) : own;
    var keep = fp.publicCloudProviders.concat(own);
    Object.keys(state.facts.spend.byScope).forEach(function (k) { if (keep.indexOf(k) < 0) delete state.facts.spend.byScope[k]; });
    var ci = state.facts.base && state.facts.base.commitmentInstrument;
    if (ci) Object.keys(ci).forEach(function (k) { if (fp.publicCloudProviders.indexOf(k) < 0) delete ci[k]; });
    prune(state.facts);
  }

  function label(list, value) { var x = (list || []).find(function (o) { return o.value === value; }); return x ? x.label : value; }

  function spendMatrix(q) {
    var f = state.facts;
    var rows = f.footprint.publicCloudProviders.concat(f.footprint.scopes.filter(function (s) { return s !== 'public_cloud'; }));
    var box = h('div', { class: 'subfields' });
    var cur = f.org.currency || 'USD';
    box.appendChild(field('Currency', h('select', { id: 'f-currency', onchange: function (e) { f.org.currency = e.target.value; if (e.target.value === 'USD') delete f.org.tierFxRate; changed(); render(); } },
      schema.enums.currencies.map(function (c) { return h('option', { value: c, selected: c === cur }, c); }))));
    if (cur !== 'USD') {
      box.appendChild(field('US dollars per 1 ' + cur, h('input', { type: 'number', id: 'f-fx', min: '0', step: 'any', inputmode: 'decimal', value: f.org.tierFxRate !== undefined ? String(f.org.tierFxRate) : '', oninput: function (e) {
        var v = Number(e.target.value); if (e.target.value === '' || !(v > 0)) delete f.org.tierFxRate; else f.org.tierFxRate = v; changed();
      } }), 'Used only to place the complexity tier. Value figures stay in ' + cur + '.'));
    }
    if (!rows.length) { box.appendChild(h('p', { class: 'muted small' }, 'Select providers or scopes above to enter their annual spend.')); return box; }
    rows.forEach(function (k) {
      var name = label(schema.enums.providers, k) !== k ? label(schema.enums.providers, k) : label(schema.enums.scopes, k);
      box.appendChild(amountWidget('spend.byScope.' + k, 'Annual spend: ' + name, { allowBand: true, allowUnknown: true }));
    });
    return box;
  }

  function factField(q, fd) {
    var path = fd.fact;
    if (q.id === 'VB-02' && fd.key === 'instrument') return instrumentField(fd);
    switch (fd.type) {
      case 'amount': return amountWidget(path, fd.label, fd);
      case 'share': return shareWidget(path, fd.label, fd);
      case 'percent': return percentWidget(path, fd.label, fd);
      case 'select': return selectWidget(path, fd);
      case 'multi_select': {
        var opts = path === 'org.markets' ? schema.enums.markets : fd.options || [];
        var vals = get(state.facts, path) || [];
        return h('fieldset', { class: 'field' }, h('legend', null, fd.label), checks('f-' + path, opts, vals, function (v, on) {
          var next = vals.filter(function (x) { return x !== v; }); if (on) next.push(v);
          set(state.facts, path, next.length ? next : undefined); changed(); render();
        }));
      }
      case 'text': return textWidget(path, fd.label, 'text');
      case 'date': return textWidget(path, fd.label, 'date');
    }
    return h('p', null, fd.label);
  }

  function selectWidget(path, fd) {
    var id = 'f-' + path;
    var opts = fd.options || (path === 'org.sector' ? schema.enums.sectors : []);
    var current = get(state.facts, path);
    // An option may set a different stored value (SC-07: "5-19" is stored for option u5_19).
    var valueOf = function (o) { return o.sets ? o.sets[path] : o.value; };
    var list = [h('option', { value: '' }, 'Not answered')].concat(opts.map(function (o) { return h('option', { value: o.value, selected: valueOf(o) === current }, o.label); }));
    if (fd.allowUnknown) list.push(h('option', { value: 'unknown', selected: current === 'unknown' }, 'Don\'t know'));
    return field(fd.label, h('select', { id: id, onchange: function (e) {
      var o = opts.find(function (x) { return x.value === e.target.value; });
      set(state.facts, path, e.target.value === '' ? undefined : (o ? valueOf(o) : e.target.value)); changed();
    } }, list));
  }

  function textWidget(path, text, type) {
    var id = 'f-' + path;
    return field(text, h('input', { type: type, id: id, value: get(state.facts, path) || '', oninput: function (e) { set(state.facts, path, e.target.value || undefined); changed(); } }));
  }

  function percentWidget(path, text, fd) {
    var id = 'f-' + path;
    var v = get(state.facts, path);
    return h('div', { class: 'field' }, h('label', { for: id }, text),
      h('div', { class: 'amount' },
        h('input', { type: 'number', id: id, min: '-25', max: '200', step: '1', inputmode: 'numeric', disabled: v === 'unknown', value: typeof v === 'number' ? String(v) : '', oninput: function (e) {
          set(state.facts, path, e.target.value === '' ? undefined : Number(e.target.value)); changed();
        } }),
        fd.allowUnknown ? h('label', { class: 'option check', for: id + '-unknown' }, h('input', { type: 'checkbox', id: id + '-unknown', checked: v === 'unknown', onchange: function (e) {
          set(state.facts, path, e.target.checked ? 'unknown' : undefined); changed(); render();
        } }), h('span', { class: 'opt-mark', 'aria-hidden': 'true' }), h('span', { class: 'opt-text' }, 'Don\'t know')) : null));
  }

  /** An amount: exact, a range, or "don't know". Written to the facts only when complete. */
  function amountWidget(path, text, fd) {
    var id = 'f-' + path;
    var v = get(state.facts, path);
    var kind = !v ? '' : 'exact' in v ? 'exact' : 'band' in v ? 'band' : 'unknown';
    var ui = (state.ui = state.ui || {});
    if (ui[path] && !v) kind = ui[path];
    var write = function () {
      var k = document.getElementById(id + '-kind').value;
      ui[path] = k;
      var a = document.getElementById(id + '-a'), b = document.getElementById(id + '-b');
      var x = a && a.value !== '' ? Number(a.value) : NaN, y = b && b.value !== '' ? Number(b.value) : NaN;
      var out;
      if (k === 'exact' && x >= 0) out = { exact: x };
      else if (k === 'band' && x >= 0 && y >= x) out = { band: [x, y] };
      else if (k === 'unknown') out = { unknown: true };
      set(state.facts, path, out); changed();
    };
    var kinds = [h('option', { value: '' }, 'Not answered'), h('option', { value: 'exact', selected: kind === 'exact' }, 'Amount')];
    if (fd.allowBand) kinds.push(h('option', { value: 'band', selected: kind === 'band' }, 'Range'));
    if (fd.allowUnknown) kinds.push(h('option', { value: 'unknown', selected: kind === 'unknown' }, 'Don\'t know'));
    return h('div', { class: 'field' }, h('label', { for: id + '-kind' }, text),
      h('div', { class: 'amount' },
        h('select', { id: id + '-kind', 'aria-label': text + ': how to answer', onchange: function () { write(); render(); } }, kinds),
        kind === 'exact' || kind === 'band' ? h('input', { type: 'number', id: id + '-a', min: '0', step: 'any', inputmode: 'decimal', 'aria-label': kind === 'band' ? text + ': from' : text, placeholder: kind === 'band' ? 'From' : 'Amount', value: v && v.exact !== undefined ? String(v.exact) : v && v.band ? String(v.band[0]) : '', oninput: write }) : null,
        kind === 'band' ? h('input', { type: 'number', id: id + '-b', min: '0', step: 'any', inputmode: 'decimal', 'aria-label': text + ': to', placeholder: 'To', value: v && v.band ? String(v.band[1]) : '', oninput: write }) : null));
  }

  /** A share: one of the bands, an exact percentage (workshop), or "don't know". */
  function shareWidget(path, text, fd) {
    var id = 'f-' + path;
    var v = get(state.facts, path);
    var bands = fd.allowBand === false ? [] : (fd.bands || []);
    var key = !v ? '' : v.unknown ? 'unknown' : v.band ? 'band:' + v.band.join('-') : 'exact';
    var ui = (state.ui = state.ui || {});
    if (ui[path] === 'exact' && !v) key = 'exact';
    var exactAllowed = state.mode === 'workshop' || fd.allowBand === false;
    var opts = [h('option', { value: '' }, 'Not answered')].concat(bands.map(function (b) {
      var lbl = b[0] === 0 ? 'Below ' + pct(b[1] + 0.01) : b[1] === 1 ? pct(b[0]) + ' or more' : pct(b[0]) + ' to ' + pct(b[1]);
      return h('option', { value: 'band:' + b.join('-'), selected: key === 'band:' + b.join('-') }, lbl);
    }));
    if (exactAllowed) opts.push(h('option', { value: 'exact', selected: key === 'exact' }, 'Exact percentage'));
    if (fd.allowUnknown) opts.push(h('option', { value: 'unknown', selected: key === 'unknown' }, 'Don\'t know'));
    return h('div', { class: 'field' }, h('label', { for: id }, text),
      h('div', { class: 'amount' },
        h('select', { id: id, onchange: function (e) {
          var k = e.target.value; ui[path] = k; clearDerived(path);
          if (k === '') set(state.facts, path, undefined);
          else if (k === 'unknown') set(state.facts, path, { unknown: true });
          else if (k === 'exact') set(state.facts, path, undefined);
          else { var p = k.slice(5).split('-').map(Number); set(state.facts, path, { band: [p[0], p[1]] }); }
          changed(); render();
        } }, opts),
        key === 'exact' ? h('input', { type: 'number', id: id + '-exact', min: '0', max: '100', step: 'any', inputmode: 'decimal', 'aria-label': text + ' (percent)', placeholder: '%', value: v && v.exact !== undefined ? String(Math.round(v.exact * 1000) / 10) : '', oninput: function (e) {
          var n = Number(e.target.value); clearDerived(path); set(state.facts, path, e.target.value !== '' && n >= 0 && n <= 100 ? { exact: n / 100 } : undefined); changed();
        } }) : null),
      prefillSuggestion(path, v));
  }

  /**
   * A suggestion from another answer (F5 D-C): shown in the workshop when the fact is empty; nothing is set until the
   * consultant confirms it, and the confirmed value is marked as derived (Low confidence on the server).
   */
  function prefillSuggestion(path, current) {
    var p = (schema.prefills || []).find(function (x) { return x.fact === path; });
    if (!p || state.mode !== 'workshop' || isFinal()) return null;
    var answer = state.answers[p.fromQuestion];
    var share = p.byAnswer[answer];
    if (current && get(state.facts, p.sourceFact) === p.sourceValue) return h('p', { class: 'small muted' }, 'Derived from ' + p.fromQuestion + ' (' + p.assumptionId + '); replace it with a measured share when you have one.');
    if (current || typeof share !== 'number') return null;
    var q = Q[p.fromQuestion];
    var opt = q && q.options.find(function (o) { return o.value === answer; });
    return h('div', { class: 'notice', role: 'note' }, 'Suggested from ' + p.fromQuestion + (opt ? ' ("' + opt.label + '")' : '') + ': about ' + Math.round(share * 100) + '%. ',
      h('button', { class: 'btn small', type: 'button', onclick: function () {
        set(state.facts, path, { exact: share }); set(state.facts, p.sourceFact, p.sourceValue); changed(); render();
      } }, 'Use this, then confirm with the client'));
  }
  function clearDerived(path) {
    var p = (schema.prefills || []).find(function (x) { return x.fact === path; });
    if (p) set(state.facts, p.sourceFact, undefined);
  }

  function instrumentField(fd) {
    var providers = state.facts.footprint.publicCloudProviders.filter(function (p) { return schema.enums.instruments[p]; });
    if (!providers.length) return h('p', { class: 'small muted' }, fd.label + ': not needed for the selected providers.');
    return h('div', { class: 'subfields' }, providers.map(function (p) {
      var id = 'f-instrument-' + p;
      var current = get(state.facts, 'base.commitmentInstrument.' + p);
      var opts = fd.options.filter(function (o) { return schema.enums.instruments[p].indexOf(o.value) >= 0; });
      return field('Main commitment instrument: ' + label(schema.enums.providers, p) + ' (optional)', h('select', { id: id, onchange: function (e) {
        set(state.facts, 'base.commitmentInstrument.' + p, e.target.value || undefined); changed();
      } }, [h('option', { value: '' }, 'Not stated (LTM\'s default instrument is used)')].concat(opts.map(function (o) { return h('option', { value: o.value, selected: current === o.value }, o.label); }))));
    }));
  }

  function recommendationRows(q) {
    var ui = (state.ui = state.ui || {});
    var rows = ui.recs || (ui.recs = (get(state.facts, 'evidence.providerRecommendations') || []).map(function (r) { return Object.assign({}, r); }));
    var write = function () {
      var done = rows.filter(function (r) { return r.type && r.tool && r.annualEstimate >= 0 && /^\d{4}-\d{2}-\d{2}$/.test(r.exportDate || ''); });
      set(state.facts, 'evidence.providerRecommendations', done.length ? done.map(function (r) { return { type: r.type, tool: r.tool, annualEstimate: r.annualEstimate, exportDate: r.exportDate }; }) : undefined);
      changed();
    };
    var fds = {}; q.fields.forEach(function (x) { fds[x.key] = x; });
    var box = h('div', { class: 'row-list' }, rows.map(function (r, i) {
      var pre = 'f-rec-' + i + '-';
      return h('div', { class: 'row-item' },
        field(fds.type.label, h('select', { id: pre + 'type', onchange: function (e) { r.type = e.target.value; write(); } }, [h('option', { value: '' }, 'Choose…')].concat(fds.type.options.map(function (o) { return h('option', { value: o.value, selected: r.type === o.value }, o.label); })))),
        field(fds.tool.label, h('input', { type: 'text', id: pre + 'tool', maxlength: '200', value: r.tool || '', oninput: function (e) { r.tool = e.target.value; write(); } })),
        field(fds.estimate.label, h('input', { type: 'number', id: pre + 'estimate', min: '0', step: 'any', value: r.annualEstimate !== undefined ? String(r.annualEstimate) : '', oninput: function (e) { r.annualEstimate = e.target.value === '' ? undefined : Number(e.target.value); write(); } })),
        field(fds.date.label, h('input', { type: 'date', id: pre + 'date', value: r.exportDate || '', oninput: function (e) { r.exportDate = e.target.value; write(); } })),
        h('button', { class: 'btn small', type: 'button', 'aria-label': 'Remove estimate ' + (i + 1), onclick: function () { rows.splice(i, 1); write(); render(); } }, 'Remove'));
    }));
    box.appendChild(h('div', null, h('button', { class: 'btn small', type: 'button', onclick: function () { rows.push({}); render(); } }, 'Add an estimate')));
    box.appendChild(h('p', { class: 'small muted' }, 'Exports older than 90 days on the assessment date are not used.'));
    return box;
  }

  function saasEvidence(q) {
    var ui = (state.ui = state.ui || {});
    var e = ui.saas || (ui.saas = Object.assign({}, get(state.facts, 'evidence.saasLicence') || {}));
    var write = function () {
      var ok = e.unusedAnnualCost >= 0 && e.source && /^\d{4}-\d{2}-\d{2}$/.test(e.measuredOn || '');
      set(state.facts, 'evidence.saasLicence', ok ? { unusedAnnualCost: e.unusedAnnualCost, source: e.source, measuredOn: e.measuredOn } : undefined); changed();
    };
    var fds = {}; q.fields.forEach(function (x) { fds[x.key] = x; });
    return h('div', { class: 'grid-2' },
      field(fds.cost.label, h('input', { type: 'number', id: 'f-saas-cost', min: '0', step: 'any', value: e.unusedAnnualCost !== undefined ? String(e.unusedAnnualCost) : '', oninput: function (ev) { e.unusedAnnualCost = ev.target.value === '' ? undefined : Number(ev.target.value); write(); } })),
      field(fds.source.label, h('input', { type: 'text', id: 'f-saas-source', maxlength: '500', value: e.source || '', oninput: function (ev) { e.source = ev.target.value; write(); } })),
      field(fds.date.label, h('input', { type: 'date', id: 'f-saas-date', value: e.measuredOn || '', oninput: function (ev) { e.measuredOn = ev.target.value; write(); } })));
  }

  /* --------------------------------- Results -------------------------------- */

  /* ------------------------------- Results dashboard ------------------------------ */

  var C = window.FinOpsIqCharts;
  var LEVEL_NUM = { not_yet: 0, crawl: 1, walk: 2, run: 3 };
  var SEVERITIES = ['Critical', 'High', 'Medium', 'Low'];
  var SEV_COLOR = { Critical: '#9F1D12', High: '#D9822B', Medium: '#2F7FA0', Low: '#3C8D5A' };
  var CASE_COLOR = { conservative: '#F4A79D', expected: '#D33826', upper: '#7A1F15' };
  var TABS = [
    { id: 'overview', label: 'Overview' }, { id: 'capabilities', label: 'Capabilities' }, { id: 'value', label: 'Value' },
    { id: 'findings', label: 'Findings' }, { id: 'roadmap', label: 'Roadmap' }, { id: 'report', label: 'Report and method' }
  ];

  /**
   * The completed assessment as a dashboard (owner feedback, 22 Oct 2026): a headline band with the key figures
   * counting up, then tabs for the capability profile (radar, heatmap), the value (range by lever, by year), the
   * findings (a severity by wave matrix that filters the list), the roadmap (a timeline by finding) and the report.
   * Every figure is the server's stored result; the page computes no score or value. Teaser mode holds back the
   * value, findings and roadmap in client view: those tabs show the gated card and nothing of the data.
   */
  function renderResults(body) {
    var r = state.result;
    if (!r) { body.appendChild(state.errors.length ? factsNotice() : h('p', { class: 'muted' }, 'Loading the result…')); return; }
    var client = state.view === 'client';
    var held = client && state.teaser;
    var cur = r.value.currency || state.facts.org.currency;
    var tab = TABS.some(function (t) { return t.id === state.tab; }) ? state.tab : 'overview';
    body.appendChild(dashHero(r, cur, held, client));
    var list = h('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Result views' }, TABS.map(function (t) {
      return h('button', { type: 'button', role: 'tab', id: 'tab-' + t.id, class: 'tab', 'aria-selected': t.id === tab ? 'true' : 'false', 'aria-controls': 'panel-' + t.id, tabindex: t.id === tab ? '0' : '-1',
        onclick: function () { state.tab = t.id; render(); var b = document.getElementById('tab-' + t.id); if (b) b.focus({ preventScroll: true }); },
        onkeydown: function (e) {
          var i = TABS.indexOf(t), j = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? TABS.length - 1 : -2;
          if (j === -2) return;
          e.preventDefault();
          state.tab = TABS[(j + TABS.length) % TABS.length].id; render(); document.getElementById('tab-' + state.tab).focus({ preventScroll: true });
        } }, t.label);
    }));
    body.appendChild(list);
    var panel = h('div', { class: 'tab-panel', role: 'tabpanel', id: 'panel-' + tab, 'aria-labelledby': 'tab-' + tab, tabindex: '0' });
    var gated = held && (tab === 'value' || tab === 'findings' || tab === 'roadmap');
    if (gated) panel.appendChild(teaserCard());
    else if (tab === 'overview') overviewPanel(panel, r, cur, held);
    else if (tab === 'capabilities') capabilitiesPanel(panel, r);
    else if (tab === 'value') valuePanel(panel, r, cur);
    else if (tab === 'findings') findingsPanel(panel, r);
    else if (tab === 'roadmap') roadmapPanel(panel, r);
    else reportPanel(panel, r, client);
    body.appendChild(panel);
  }

  function inScopeCaps(r) { return r.capabilities.filter(function (c) { return c.rating !== 'not_in_scope'; }); }
  function profiledCaps(r) { return inScopeCaps(r).filter(function (c) { return c.rating !== 'not_assessed'; }); }
  function shownFindings(r) {
    var ids = state.mode === 'executive' ? r.topFindingIds : r.findings.map(function (f) { return f.id; });
    return ids.map(function (id) { return r.findings.find(function (f) { return f.id === id; }); }).filter(Boolean);
  }
  function moneyFmt(cur) { return function (v) { return money(v, cur); }; }
  function fig(x) { return x && typeof x === 'object' ? x.value : x; }

  function dashHero(r, cur, held, client) {
    var v = r.value, t = v.moneyShown ? v.totals : null;
    var caps = profiledCaps(r);
    var sev = {};
    r.findings.forEach(function (f) { sev[f.severity] = (sev[f.severity] || 0) + 1; });
    var kpis = [];
    if (r.needVerdict) {
      var nv = r.needVerdict;
      var g = h('div', { class: 'kpi-card kpi-gauge' }, h('span', { class: 'kpi-label' }, 'Need to act'), C.gauge({ value: nv.needIndex, label: 'Need index ' + Math.round(nv.needIndex) + ' of 100: ' + nv.bandLabel }),
        h('div', { class: 'gauge-value' }, h('strong', { class: 'count' }), h('span', null, '/100')), h('span', { class: 'kpi-sub' }, nv.bandLabel));
      C.countUp(g.querySelector('.count'), Math.round(nv.needIndex), function (x) { return String(Math.round(x)); });
      kpis.push(g);
    }
    var atTarget = r.headline.atOrAboveTarget, of = r.headline.inScope;
    var ring = h('div', { class: 'kpi-card' }, h('span', { class: 'kpi-label' }, 'At or above target'),
      h('div', { class: 'kpi-donut' }, C.donut({ label: atTarget + ' of ' + of + ' capabilities at or above target', parts: [{ value: atTarget, color: '#3C8D5A', label: 'At or above target' }, { value: Math.max(0, of - atTarget), color: '#F1C9C3', label: 'Below target' }], center: atTarget + '/' + of })),
      h('span', { class: 'kpi-sub' }, caps.length + ' capabilities rated'));
    kpis.push(ring);
    if (!held) {
      if (t) {
        var exp = h('div', { class: 'kpi-card kpi-money' }, h('span', { class: 'kpi-label' }, 'Expected value, net per year'), h('strong', { class: 'kpi-big count' }),
          h('span', { class: 'kpi-sub' }, 'Range ' + money(t.conservative.netRunRate, cur) + ' to ' + money(t.upper.netRunRate, cur)));
        C.countUp(exp.querySelector('.count'), fig(t.expected.netRunRate), moneyFmt(cur), 1400);
        var three = h('div', { class: 'kpi-card kpi-money' }, h('span', { class: 'kpi-label' }, 'Expected, net over 3 years'), h('strong', { class: 'kpi-big count' }),
          h('span', { class: 'kpi-sub' }, t.expected.pctOfP ? 'Gross ' + t.expected.pctOfP.value + '% of in-scope public cloud spend' : 'Net of implementation effort'));
        C.countUp(three.querySelector('.count'), fig(t.expected.net3Year), moneyFmt(cur), 1600);
        kpis.push(exp, three);
      } else {
        kpis.push(h('div', { class: 'kpi-card kpi-money' }, h('span', { class: 'kpi-label' }, 'Indicative value'), h('strong', { class: 'kpi-big small-big' }, 'Not sized yet'), h('span', { class: 'kpi-sub' }, v.notice || 'No money figure until the inputs it needs are given.')));
      }
      var fc = h('div', { class: 'kpi-card' }, h('span', { class: 'kpi-label' }, 'Findings'), h('strong', { class: 'kpi-big count' }),
        h('div', { class: 'sev-strip', 'aria-hidden': 'true' }, SEVERITIES.map(function (k) { return sev[k] ? h('i', { style: 'flex:' + sev[k] + ';background:' + SEV_COLOR[k], title: k + ': ' + sev[k] }) : null; })),
        h('span', { class: 'kpi-sub' }, SEVERITIES.filter(function (k) { return sev[k]; }).map(function (k) { return sev[k] + ' ' + k.toLowerCase(); }).join(' · ') || 'No gaps against the targets'));
      C.countUp(fc.querySelector('.count'), r.findings.length, function (x) { return String(Math.round(x)); }, 900);
      kpis.push(fc);
    }
    var actions = h('div', { class: 'hero-actions' });
    if (isFinal()) {
      var status = h('p', { class: 'small hero-status', id: 'report-status', role: 'status', 'aria-live': 'polite' });
      actions.appendChild(h('button', { class: 'btn primary', type: 'button', onclick: function (e) { download('pdf', e.currentTarget, status); } }, 'Download report (PDF)'));
      actions.appendChild(h('button', { class: 'btn ghost', type: 'button', onclick: function (e) { download('csv', e.currentTarget, status); } }, 'Download backlog (CSV)'));
      actions.appendChild(archiveControl(status));
      if (state.status === 'completed' && state.mode === 'executive' && !client) actions.appendChild(h('button', { class: 'btn ghost', type: 'button', onclick: continueInWorkshop }, 'Continue in workshop mode'));
      actions.appendChild(status);
    }
    return h('section', { class: 'hero', 'aria-labelledby': 'hero-h' },
      h('div', { class: 'hero-top' },
        h('div', { class: 'client-id' }, logoControl(), h('div', null,
          h('p', { class: 'hero-eyebrow' }, 'FinOps IQ · ' + MODE_INFO[state.mode].label + ' assessment'),
          h('h1', { id: 'hero-h' }, state.clientName),
          h('p', { class: 'hero-meta' }, [statusLabel(state.status) + (state.completedAt ? ' ' + when(state.completedAt) : ''), 'Tier ' + r.tier.tier + ' estate', 'Confidence ' + (v.confidence ? v.confidence.overall : '—'), client ? 'Client edition' : 'Consultant view'].join(' · ')))),
        actions),
      h('p', { class: 'hero-headline' }, r.needVerdict ? r.needVerdict.basisLine : r.headline.statement),
      h('div', { class: 'kpi-row' }, kpis));
  }

  function overviewPanel(p, r, cur, held) {
    var grid = h('div', { class: 'dash-grid' });
    grid.appendChild(card('Capability profile', 'Today against the target for your estate', capRadar(r), 'wide'));
    var bands = { run: 0, walk: 0, crawl: 0, not_yet: 0, unknown: 0 };
    profiledCaps(r).forEach(function (c) { var k = LEVEL_NUM[c.rating] !== undefined ? c.rating : 'unknown'; bands[k]++; });
    var parts = [{ k: 'run', color: '#3C8D5A' }, { k: 'walk', color: '#8DBF6A' }, { k: 'crawl', color: '#E8A33A' }, { k: 'not_yet', color: '#D33826' }, { k: 'unknown', color: '#9CA3AF' }]
      .map(function (x) { return { value: bands[x.k], color: x.color, label: x.k === 'unknown' ? 'Not answered or don\'t know' : LEVEL_LABEL[x.k], display: bands[x.k] }; });
    grid.appendChild(card('Maturity mix', 'Capabilities by rating today', h('div', { class: 'donut-wrap' }, C.donut({ label: 'Capabilities by rating: ' + parts.map(function (x) { return x.label + ' ' + x.value; }).join(', '), parts: parts, center: String(profiledCaps(r).length), sub: 'rated' }), C.legend(parts))));
    if (!held) {
      var sevParts = SEVERITIES.map(function (k) { var n = r.findings.filter(function (f) { return f.severity === k; }).length; return { value: n, color: SEV_COLOR[k], label: k, display: n }; });
      grid.appendChild(card('Findings by severity', 'Gaps against target, weighted by value at stake', h('div', { class: 'donut-wrap' }, C.donut({ label: 'Findings by severity: ' + sevParts.map(function (x) { return x.label + ' ' + x.value; }).join(', '), parts: sevParts, center: String(r.findings.length), sub: 'findings' }), C.legend(sevParts))));
      if (r.value.moneyShown) grid.appendChild(card('Value by year', 'Net of effort, three cases', yearColumns(r.value.totals, cur)));
    }
    grid.appendChild(card('Capability heatmap', 'Gap to target by domain', capHeatmap(r), 'wide'));
    if (r.needVerdict && r.needVerdict.blindSpots && r.needVerdict.blindSpots.length) {
      grid.appendChild(card('Blind spots', 'Unanswered or "Don\'t know": each could move the result', h('ul', { class: 'chips' }, blindSpotLabels(r.needVerdict.blindSpots).map(function (b) { return h('li', null, b); }))));
    }
    if (held) grid.appendChild(h('div', { class: 'wide' }, teaserCard()));
    if (!held && state.mode === 'executive') {
      var top = shownFindings(r).slice(0, 3);
      if (top.length) grid.appendChild(card('Top findings', 'Where to start', h('div', null, top.map(findingCard)), 'wide'));
    }
    p.appendChild(grid);
  }

  function card(title, sub, content, cls) {
    var id = 'c-' + title.toLowerCase().replace(/[^a-z]+/g, '-');
    return h('section', { class: 'dash-card ' + (cls || ''), 'aria-labelledby': id }, h('div', { class: 'dash-card-head' }, h('h3', { id: id }, title), sub ? h('p', { class: 'small muted' }, sub) : null), content);
  }

  function capRadar(r) {
    var caps = profiledCaps(r);
    if (caps.length < 3) return h('p', { class: 'muted' }, 'Too few capabilities rated to draw a profile.');
    var wrap = h('div', { class: 'radar-wrap' }, C.radar({
      label: 'Capability profile: ' + caps.map(function (c) { return c.displayName + ' ' + c.ratingLabel + (c.target && c.target.level ? ', target ' + LEVEL_LABEL[c.target.level] : ''); }).join('; '),
      max: 3, levels: ['Crawl', 'Walk', 'Run'],
      axes: caps.map(function (c) { return { label: c.displayName, today: LEVEL_NUM[c.rating] !== undefined ? LEVEL_NUM[c.rating] : null, todayLabel: c.ratingLabel, target: c.target && c.target.level ? LEVEL_NUM[c.target.level] : null, targetLabel: c.target && c.target.level ? LEVEL_LABEL[c.target.level] : '' }; })
    }), h('ul', { class: 'legend' }, h('li', null, h('i', { class: 'lg-today', 'aria-hidden': 'true' }), h('span', null, 'Today')), h('li', null, h('i', { class: 'lg-target', 'aria-hidden': 'true' }), h('span', null, 'Target'))));
    return wrap;
  }

  function capHeatmap(r) {
    var caps = inScopeCaps(r);
    return C.heatmap({
      label: 'Capability heatmap by domain: each capability coloured by its gap to target',
      rows: schema.domains.map(function (d) {
        var cs = caps.filter(function (c) { return c.domain === d.id; });
        return { label: d.name, cells: cs.map(function (c) {
          var cls = c.rating === 'not_assessed' ? 'na' : typeof c.gap !== 'number' ? 'unknown' : 'gap' + Math.min(3, Math.max(0, c.gap));
          return { label: c.displayName, sub: c.rating === 'not_assessed' ? 'Workshop' : c.ratingLabel + (c.target && c.target.level ? ' → ' + LEVEL_LABEL[c.target.level] : ''), cls: cls, title: c.displayName + ': ' + (c.rating === 'not_assessed' ? 'assessed in the workshop' : c.ratingLabel + (typeof c.gap === 'number' ? (c.gap > 0 ? ', ' + c.gap + ' below target' : ', at target') : '')) };
        }) };
      }).filter(function (x) { return x.cells.length; })
    });
  }

  function yearColumns(t, cur) {
    var cases = ['conservative', 'expected', 'upper'];
    return h('div', null, C.columns({
      label: 'Net value by year: ' + ['netYear1', 'netYear2', 'netYear3'].map(function (k, i) { return 'year ' + (i + 1) + ' expected ' + money(t.expected[k], cur); }).join(', '),
      groups: ['netYear1', 'netYear2', 'netYear3'].map(function (k, i) {
        return { label: 'Year ' + (i + 1), caption: money(t.expected[k], cur), bars: cases.map(function (c) { return { value: fig(t[c][k]), color: CASE_COLOR[c], name: c[0].toUpperCase() + c.slice(1), display: money(t[c][k], cur) }; }) };
      })
    }), C.legend(cases.map(function (c) { return { color: CASE_COLOR[c], label: c[0].toUpperCase() + c.slice(1) }; })));
  }

  function capabilitiesPanel(p, r) {
    var grid = h('div', { class: 'dash-grid' });
    grid.appendChild(card('Capability profile', r.headline.statement, capRadar(r), 'wide'));
    grid.appendChild(card('Capability heatmap', 'Green at target; amber to red by levels below; grey not answered; striped assessed in the workshop', capHeatmap(r), 'wide'));
    p.appendChild(grid);
    p.appendChild(capabilityTable(r));
  }

  function capabilityTable(r) {
    var inScope = inScopeCaps(r);
    var workshopOnly = inScope.filter(function (c) { return c.rating === 'not_assessed'; });
    var profiled = inScope.filter(function (c) { return c.rating !== 'not_assessed'; });
    return h('section', { class: 'card', 'aria-labelledby': 'profile-h' }, h('h3', { id: 'profile-h' }, 'Capability profile'), h('p', null, r.headline.statement),
      h('div', { class: 'table-wrap' }, h('table', null, h('thead', null, h('tr', null, ['Capability', 'Today', 'Target'].map(function (t) { return h('th', { scope: 'col' }, t); }))),
        h('tbody', null, profiled.map(function (c) {
          // "Not answered" already says the rating is unconfirmed; the note is for "Don't know" answers.
          var note = c.unconfirmed && c.ratingLabel !== 'Not answered' ? h('span', { class: 'small muted' }, ' (unconfirmed)') : null;
          var gap = typeof c.gap === 'number' ? (c.gap > 0 ? h('span', { class: 'small muted' }, ' · ' + c.gap + (c.gap === 1 ? ' level below' : ' levels below')) : h('span', { class: 'chip ok' }, 'At target')) : null;
          return h('tr', null, h('td', null, c.displayName), h('td', null, h('span', { class: 'lvl ' + c.rating }, c.ratingLabel), note),
            h('td', null, c.target && c.target.level ? LEVEL_LABEL[c.target.level] : '—', gap ? ' ' : null, gap));
        })))),
      workshopOnly.length ? h('p', { class: 'small muted' }, workshopOnly.length + ' more capabilities are assessed in the workshop: ' + workshopOnly.map(function (c) { return c.displayName; }).join(', ') + '.') : null);
  }

  function valuePanel(p, r, cur) {
    var v = r.value;
    var grid = h('div', { class: 'dash-grid' });
    if (v.moneyShown) {
      var q = v.levers.filter(function (l) { return l.status === 'quantified' && l.cases && l.cases.expected; });
      grid.appendChild(card('Value by lever', 'Expected net per year at full run-rate; the line shows the conservative to upper range', C.rangeBars({
        label: 'Value by lever: ' + q.map(function (l) { return l.name + ' ' + money(l.cases.expected.netRunRate, cur); }).join(', '),
        rows: q.map(function (l) { return { label: l.name, low: fig(l.cases.conservative.netRunRate), mid: fig(l.cases.expected.netRunRate), high: fig(l.cases.upper.netRunRate), display: money(l.cases.expected.netRunRate, cur), title: l.basisLine }; })
      }), 'wide'));
      var leverParts = q.map(function (l, i) { return { value: fig(l.cases.expected.netRunRate), color: ['#D33826', '#7A1F15', '#F08A7E', '#2F7FA0', '#3C8D5A', '#E8A33A', '#6B4FA0', '#9CA3AF'][i % 8], label: l.name, display: money(l.cases.expected.netRunRate, cur) }; });
      grid.appendChild(card('Share of expected value', 'By lever', h('div', { class: 'donut-wrap' }, C.donut({ label: 'Share of expected value by lever', parts: leverParts, center: money(v.totals.expected.netRunRate, cur), sub: 'per year' }), C.legend(leverParts))));
      grid.appendChild(card('Value by year', 'Net of effort: year one ramps up as levers start', yearColumns(v.totals, cur)));
    }
    p.appendChild(grid);
    p.appendChild(valueSection(v, cur));
  }

  /** The findings: a severity by wave matrix that filters the list, then the finding cards. */
  function findingsPanel(p, r) {
    var list = shownFindings(r);
    var waves = [1, 2, 3];
    var cells = SEVERITIES.map(function (sv) { return waves.map(function (w) { return { count: list.filter(function (f) { return f.severity === sv && f.wave === w; }).length }; }); });
    var pick = state.findingFilter;
    var grid = h('div', { class: 'dash-grid' });
    grid.appendChild(card('Priority matrix', 'Severity against when to start; choose a cell to filter the list', C.matrix({
      rows: SEVERITIES, cols: ['Wave 1 · start now', 'Wave 2 · from month 3', 'Wave 3 · from month 9'], cells: cells, corner: 'Severity', unit: ['finding', 'findings'],
      rowClass: SEVERITIES.map(function (x) { return 'sev-' + x.toLowerCase(); }), picked: pick,
      onPick: function (ri, ci) { state.findingFilter = pick && pick[0] === ri && pick[1] === ci ? null : [ri, ci]; render(); }
    }), 'wide'));
    p.appendChild(grid);
    var filtered = pick ? list.filter(function (f) { return f.severity === SEVERITIES[pick[0]] && f.wave === waves[pick[1]]; }) : list;
    p.appendChild(h('section', { class: 'card', 'aria-labelledby': 'findings-h' },
      h('div', { class: 'header-row', style: 'margin:0 0 8px' }, h('h3', { id: 'findings-h', style: 'margin:0' }, state.mode === 'executive' ? 'Top findings' : 'Findings (' + filtered.length + ')'),
        pick ? h('button', { class: 'btn small', type: 'button', onclick: function () { state.findingFilter = null; render(); } }, 'Show all ' + list.length) : null),
      pick ? h('p', { class: 'small muted' }, 'Showing ' + SEVERITIES[pick[0]].toLowerCase() + ' findings in wave ' + waves[pick[1]] + '.') : null,
      filtered.length ? filtered.map(findingCard) : h('p', { class: 'muted' }, 'No gaps against the targets for this estate.')));
  }

  function roadmapPanel(p, r) {
    var list = r.findings.filter(function (f) { return f.start && typeof f.start.month === 'number'; }).slice().sort(function (a, b) { return a.start.month - b.start.month || SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity); });
    var end = list.reduce(function (m, f) { return Math.max(m, f.start.month + ((f.targetDuration && f.targetDuration.months) || 3)); }, 12);
    var months = Math.ceil(end / 6) * 6;
    var grid = h('div', { class: 'dash-grid' });
    if (list.length) grid.appendChild(card('Roadmap', 'Each finding from its start month for its target duration, coloured by severity', h('div', null, C.gantt({
      label: 'Roadmap: ' + list.map(function (f) { return f.title + ', ' + f.start.label + (f.targetDuration ? ', ' + f.targetDuration.label : ''); }).join('; '),
      months: months, step: months > 18 ? 6 : 3, head: 'Finding',
      rows: list.map(function (f) { return { label: f.capability ? capabilityName(f.capability) : f.title, start: f.start.month, length: (f.targetDuration && f.targetDuration.months) || 3, cls: 'sev-' + f.severity.toLowerCase(), title: f.title + ' · ' + f.start.label + (f.targetDuration ? ' · ' + f.targetDuration.label : '') + ' · ' + f.ownerLabel }; })
    }), C.legend(SEVERITIES.map(function (k) { return { color: SEV_COLOR[k], label: k }; }))), 'wide'));
    p.appendChild(grid);
    if (r.help && r.help.length) p.appendChild(helpCard(r));
    p.appendChild(technicalCard(r));
  }

  function reportPanel(p, r, client) {
    p.appendChild(reportCard(client));
    if (!client) p.appendChild(consultantPanel(r));
    if (r.needVerdict) {
      var nv = r.needVerdict;
      p.appendChild(h('section', { class: 'card', 'aria-labelledby': 'need-h' }, h('h3', { id: 'need-h' }, 'Do you need to act now?'),
        h('div', { class: 'verdict' }, h('div', null, h('div', { class: 'big' }, String(Math.round(nv.needIndex))), h('div', { class: 'small muted' }, 'Need index, 0–100')),
          h('div', null, h('p', null, h('strong', null, nv.bandLabel)), h('p', { class: 'small muted' }, nv.basisLine), h('p', { class: 'small' }, 'Confidence: ' + nv.confidence)))));
    }
    p.appendChild(methodology(r));
  }

  function valueSection(v, cur) {
    var sec = h('section', { class: 'card', 'aria-labelledby': 'value-h' }, h('h3', { id: 'value-h' }, 'Indicative value'));
    sec.appendChild(h('p', null, h('strong', null, v.label)));
    if (v.detail) sec.appendChild(h('p', { class: 'small muted' }, v.detail));
    if (!v.moneyShown) {
      sec.appendChild(h('p', null, typeof v.notice === 'string' && v.notice ? v.notice : 'No money figure is shown until the inputs it needs are given.'));
    } else {
      sec.appendChild(h('div', { class: 'kpis' }, ['conservative', 'expected', 'upper'].map(function (k) {
        var t = v.totals[k];
        return h('div', { class: 'kpi' }, h('div', { class: 'label' }, k[0].toUpperCase() + k.slice(1) + ' (net, per year at full run-rate)'), h('div', { class: 'value' }, money(t.netRunRate, cur)),
          h('div', { class: 'small muted' }, 'Net over 3 years: ' + money(t.net3Year, cur) + (t.pctOfP ? ' · gross ' + t.pctOfP.value + '% of in-scope public cloud spend' : '')));
      })));
      sec.appendChild(h('p', { class: 'small' }, 'Confidence: ' + v.confidence.overall + '. ' + v.confidence.reason));
      if (v.headlineRule) sec.appendChild(h('p', { class: 'small muted' }, v.headlineRule));
      if (v.globalCap && v.globalCap.statement) sec.appendChild(h('p', { class: 'small muted' }, v.globalCap.statement));
      var q = v.levers.filter(function (l) { return l.status === 'quantified'; });
      if (q.length) sec.appendChild(h('div', { class: 'table-wrap' }, h('table', null, h('thead', null, h('tr', null, ['Lever', 'Expected per year', 'Basis'].map(function (t) { return h('th', { scope: 'col' }, t); }))),
        h('tbody', null, q.map(function (l) { return h('tr', null, h('td', null, l.name, l.inHeadline ? null : h('span', { class: 'small muted' }, ' (not in the headline)')), h('td', null, l.cases && l.cases.expected ? money(l.cases.expected.netRunRate, cur) : '—'), h('td', { class: 'small' }, l.basisLine)); })))));
    }
    if (v.notQuantified && v.notQuantified.length) {
      sec.appendChild(h('h4', null, 'Identified, not quantified'));
      sec.appendChild(h('ul', { class: 'small' }, v.notQuantified.map(function (n) {
        return h('li', null, h('strong', null, n.name + '. '), sentence(n.reasonText), n.evidenceNeeded ? [' ', h('em', null, 'Would be quantified by: '), sentence(n.evidenceNeeded)] : null);
      })));
    }
    if (v.hypothesis && v.hypothesis.answered) sec.appendChild(h('p', { class: 'small' }, h('strong', null, 'Your own estimate: '), v.hypothesis.statement));
    if (v.finopsTeam && v.finopsTeam.shown) sec.appendChild(h('p', { class: 'small muted' }, v.finopsTeam.statement + (v.finopsTeam.annualCost ? ' Indicative annual cost: ' + money(v.finopsTeam.annualCost, cur) + '.' : '')));
    return sec;
  }

  function sentence(t) { t = String(t || '').trim(); return t && !/[.!?]$/.test(t) ? t + '.' : t; }

  /** Blind spots in words: the capability for a question, or the input's label for a fact. */
  function blindSpotLabels(list) {
    var seen = [];
    list.forEach(function (b) {
      var text;
      if (b.capability) { var c = schema.capabilities.find(function (x) { return x.id === b.capability; }); text = c ? c.displayName : b.capability; }
      else if (/^spend\.byScope\./.test(b.fact || '')) { var k = b.fact.slice(14); text = 'annual spend (' + (label(schema.enums.providers, k) !== k ? label(schema.enums.providers, k) : label(schema.enums.scopes, k)) + ')'; }
      else if (b.fact === 'spend.growth12m') text = 'expected change in spend';
      else {
        var fd = null;
        schema.questions.forEach(function (q) { (q.fields || []).forEach(function (f) { if (f.fact === b.fact) fd = f; }); });
        text = fd ? fd.label.charAt(0).toLowerCase() + fd.label.slice(1) : b.fact;
      }
      if (text && seen.indexOf(text) < 0) seen.push(text);
    });
    return seen;
  }

  function findingCard(f) {
    return h('article', { class: 'finding ' + sevClass(f.severity) },
      h('div', { class: 'header-row', style: 'margin:0' }, h('h4', { style: 'margin:0' }, f.title), h('span', { class: 'chip ' + sevClass(f.severity) }, f.severity)),
      h('p', { class: 'small', style: 'margin:6px 0 0' }, f.businessConsequence),
      h('dl', null,
        h('dt', null, 'Decision or action'), h('dd', null, f.decisionOrAction),
        h('dt', null, 'Owner'), h('dd', null, f.ownerLabel),
        h('dt', null, 'When'), h('dd', null, [f.start && f.start.label, f.targetDuration && f.targetDuration.label].filter(Boolean).join('; ')),
        f.evidenceToConfirm ? [h('dt', null, 'Evidence to confirm'), h('dd', null, f.evidenceToConfirm)] : null,
        f.unconfirmed ? [h('dt', null, 'Status'), h('dd', null, 'Unconfirmed: based on "Don\'t know" or unanswered questions')] : null));
  }

  function consultantPanel(r) {
    return h('section', { class: 'card consultant', 'aria-labelledby': 'cons-h', 'data-consultant-only': 'true' }, h('h3', { id: 'cons-h' }, 'Checks before issuing'),
      r.conflicts.length ? h('div', null, h('h4', null, 'Answers that contradict each other'), h('ul', { class: 'small' }, r.conflicts.map(function (c) { return h('li', null, c.id + ': ' + c.probe); })))
        : h('p', { class: 'small' }, 'No contradicting answers found.'),
      h('p', { class: 'small' }, 'Complexity tier ' + r.tier.tier + (r.tier.points !== undefined ? ' (' + r.tier.points + ' points: ' + (r.tier.trace || []).join('; ') + ')' : '')),
      r.coverage.unknownQuestions.length ? h('p', { class: 'small' }, 'Answered "Don\'t know": ' + r.coverage.unknownQuestions.join(', ')) : null,
      r.coverage.ignoredAnswers && r.coverage.ignoredAnswers.length ? h('p', { class: 'small' }, 'Answers no longer asked (kept, not scored): ' + r.coverage.ignoredAnswers.join(', ')) : null);
  }

  function methodology(r) {
    var n = schema.notices;
    return h('section', { class: 'card methodology', 'aria-labelledby': 'method-h' }, h('h3', { id: 'method-h' }, 'Methodology and sources'),
      h('p', null, n.attribution),
      h('p', { class: 'small' }, n.attributionLinks.map(function (l, i) { return [i ? ' · ' : '', h('a', { href: l.url, target: '_blank', rel: 'noopener' }, l.label)]; })),
      h('p', null, n.disclaimer),
      h('p', null, n.data),
      h('p', { class: 'small muted' }, 'FinOps IQ engine ' + r.versions.engine + ' · value model ' + r.versions.valueModel + ' · ' + r.versions.kb + ' · claims register ' + r.versions.claimsRegister + (r.assessmentDate ? ' · assessed ' + r.assessmentDate : '') + ' · data provided by ' + state.clientName));
  }

  /** The gated card shown in teaser mode: placeholder bars only, so nothing held back is in the page. */
  function teaserCard() {
    var bars = [92, 76, 84, 58, 70].map(function (w) { return h('span', { style: 'width:' + w + '%' }); });
    return h('section', { class: 'card teaser', 'aria-labelledby': 'teaser-h' }, h('h3', { id: 'teaser-h' }, 'Value, findings and roadmap'),
      h('div', { class: 'teaser-bars', 'aria-hidden': 'true' }, bars),
      h('p', null, 'The indicative value range, the findings, the roadmap and the platform actions are presented in your LTM readout.'),
      h('p', { class: 'small muted' }, 'Your LTM consultant will walk you through them and share the report.'));
  }

  /** How LTM can help (M5): the offerings the findings call for, from the server's result; no scope ranges. */
  function helpCard(r) {
    var title = function (id) { var f = r.findings.find(function (x) { return x.id === id; }); return f ? f.title : id; };
    return h('section', { class: 'card', 'aria-labelledby': 'help-h' }, h('h3', { id: 'help-h' }, 'How LTM can help'),
      r.help.map(function (x) {
        var o = x.offering;
        return h('div', { class: 'help-item' },
          h('h4', null, o.type === 'Route' ? 'See ' + o.name : o.name + ' (' + (o.typeLabel || o.type.toLowerCase()) + ')'),
          h('p', null, o.purpose),
          o.outline.length ? h('ul', { class: 'small' }, o.outline.map(function (t) { return h('li', null, t); })) : null,
          h('p', { class: 'small muted' }, 'For: ' + x.findingIds.map(title).join('; ')));
      }));
  }

  /** Technical execution (M5): platform actions per finding from the playbook, as the server selected them. */
  function technicalCard(r) {
    var plan = r.technicalPlan;
    var sec = h('section', { class: 'card', 'aria-labelledby': 'tech-h' }, h('h3', { id: 'tech-h' }, 'Technical execution'));
    if (!plan || !plan.actions.length) {
      sec.appendChild(h('p', { class: 'muted' }, 'No platform actions are listed for these findings yet: the platform playbook entries are still being sourced and reviewed.'));
      return sec;
    }
    sec.appendChild(h('p', { class: 'small muted' }, plan.statement));
    sec.appendChild(h('div', { class: 'table-wrap' }, h('table', null,
      h('thead', null, h('tr', null, ['Finding', 'Platform', 'Action', 'Options', 'Verification'].map(function (t) { return h('th', { scope: 'col' }, t); }))),
      h('tbody', null, plan.actions.map(function (a) {
        var f = r.findings.find(function (x) { return x.id === a.findingId; });
        return h('tr', null, h('td', null, f ? f.title : a.findingId), h('td', null, platformLabel(a.platform)), h('td', null, a.action),
          h('td', { class: 'small' }, a.options.map(function (o) { return o.name; }).join('; ') || '—'), h('td', { class: 'small' }, a.verification));
      })))));
    return sec;
  }

  /**
   * The report PDF and backlog CSV are built on the server from the stored result (M4); their buttons are in the
   * headline band. Client view gets the client edition.
   */
  function reportCard(client) {
    return h('section', { class: 'card', 'aria-labelledby': 'report-h' }, h('h3', { id: 'report-h' }, 'Report'),
      h('p', { class: 'small muted' }, client ? 'Client edition: no consultant checks or notes.' : 'Consultant edition, with the consultant checks. Turn on client view for the client edition.'),
      h('p', { class: 'small' }, 'Download the report, the backlog or archive the report to Reports with the buttons at the top of the page.'),
      state.status === 'completed' && !client ? h('p', null, h('button', { class: 'btn', type: 'button', onclick: archive }, 'Archive assessment'), h('span', { class: 'small muted' }, ' Marks it archived in your list; it is still kept for two years.')) : null);
  }

  /**
   * Archive to Reports (carried over from FinOps Value Case): the server-built PDF of this edition is saved to the
   * portal's Reports section, kept two years like the assessment. A second click confirms, as for Delete.
   */
  function archiveControl(status) {
    var cell = h('span', { class: 'archive' });
    var edition = state.view === 'client' ? 'client edition' : 'consultant edition';
    function ask() {
      var yes = h('button', { class: 'btn', type: 'button', onclick: save }, 'Save to Reports');
      clear(cell);
      append(cell, [h('span', { class: 'small' }, 'Save the ' + edition + ' to Reports for two years? '), yes,
        h('button', { class: 'btn small link', type: 'button', onclick: function () { reset().focus(); } }, 'Cancel')]);
      yes.focus();
    }
    function reset() {
      var btn = h('button', { class: 'btn', type: 'button', onclick: ask }, 'Archive to Reports');
      clear(cell); cell.appendChild(btn);
      return btn;
    }
    async function save() {
      var q = new URLSearchParams({ assessmentId: state.assessmentId, format: 'pdf' });
      if (state.view === 'client') q.set('view', 'client');
      try {
        var saved = await working(['Building the ' + edition, 'Saving it to Reports'], (async function () {
          var res = await API.fetch(REPORT + '?' + q.toString(), { method: 'GET' });
          if (res.status !== 200) throw new Error('report');
          var pdfBase64 = await new Promise(function (resolve, reject) {
            var r = new FileReader(); r.onload = function () { resolve(r.result); }; r.onerror = reject;
            res.blob().then(function (b) { r.readAsDataURL(b); }, reject);
          });
          return window.LTM_S3.saveReportToS3({
            acceleratorId: 'finops-iq', clientName: state.clientName, pdfBase64: pdfBase64,
            metadata: { assessmentId: state.assessmentId, mode: state.mode, edition: state.view === 'client' ? 'client' : 'consultant', engine: state.result && state.result.versions.engine }
          });
        })(), 'Saved to Reports');
        reset();
        status.textContent = saved && saved.ok === false ? 'Not archived. Please try again.' : 'Archived to Reports.';
      } catch (e) {
        reset();
        status.textContent = 'Not archived. Please try again.';
      }
    }
    reset();
    return cell;
  }

  async function download(format, btn, status) {
    var q = new URLSearchParams({ assessmentId: state.assessmentId, format: format });
    if (state.view === 'client') q.set('view', 'client');
    btn.disabled = true;
    status.textContent = format === 'pdf' ? 'Preparing the report…' : 'Preparing the backlog…';
    try {
      var request = API.fetch(REPORT + '?' + q.toString(), { method: 'GET' });
      var res = format === 'pdf'
        ? await working(['Reading the stored result', 'Laying out the LTM report', 'Adding the roadmap and platform actions', 'Adding methodology and sources'], request, 'Report ready')
        : await request;
      if (res.status !== 200) {
        var err = await res.json().catch(function () { return {}; });
        status.textContent = err.message || 'The file could not be produced. Please try again.';
        return;
      }
      var name = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') || '');
      var url = URL.createObjectURL(await res.blob());
      var a = h('a', { href: url, download: name ? name[1] : 'finops-iq.' + format });
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
      status.textContent = 'Downloaded.';
    } catch (e) {
      status.textContent = 'The file could not be produced. Please try again.';
    } finally {
      btn.disabled = false;
    }
  }

  async function complete() {
    clearTimeout(timers.save);
    var data = await working(['Scoring your answers on the server', 'Rating each capability against its target', 'Sizing the indicative value range', 'Prioritising the findings', 'Building the roadmap and platform actions'],
      persist('complete'), 'Result ready', 3200);
    if (data) { state.step = 'results'; state.tab = 'overview'; state.findingFilter = null; render(); window.scrollTo(0, 0); }
  }
  async function archive() { var data = await persist('archive'); if (data) render(); }
  function continueInWorkshop() {
    startNew(null, { mode: 'workshop', clientName: state.clientName, clientSector: state.clientSector, clientLogo: state.clientLogo, facts: state.facts, answers: state.answers });
  }

  /* ------------------------------ Working screen ----------------------------- */

  /**
   * The LTM working screen while the server scores the assessment or builds the report. The steps are what the
   * server does; they advance on a timer, and the last one shows only when the request has returned. Shown for at
   * least MIN_MS so it reads as a deliberate step, never longer than the request plus that. Returns the request's
   * result (or rethrows its error).
   */
  var MIN_MS = 1600;
  async function working(steps, promise, done, minMs) {
    var min = minMs || MIN_MS;
    var started = Date.now();
    var items = steps.map(function (t) { return h('li', null, h('span', { class: 'wl-icon', 'aria-hidden': 'true' }), h('span', null, t)); });
    var log = h('p', { class: 'working-step' }, steps[0]);
    var bar = h('i');
    var screen = h('div', { class: 'working', role: 'status', 'aria-live': 'polite' },
      h('div', { class: 'working-glow', 'aria-hidden': 'true' }),
      h('div', { class: 'working-card' },
        h('div', { class: 'working-emblem', 'aria-hidden': 'true' }, h('span', { class: 'ring r1' }), h('span', { class: 'ring r2' }), h('span', { class: 'ring r3' }), h('span', { class: 'hex' })),
        h('p', { class: 'working-org' }, h('strong', null, 'LTM'), ' Vantage · Responsible Advisory'),
        h('p', { class: 'working-title' }, 'FinOps ', h('span', null, 'IQ')),
        h('p', { class: 'working-client' }, state ? state.clientName : ''),
        log,
        h('div', { class: 'working-track', 'aria-hidden': 'true' }, bar),
        h('ol', { class: 'working-list', 'aria-hidden': 'true' }, items)));
    document.body.appendChild(screen);
    document.getElementById('main').setAttribute('aria-busy', 'true');
    var i = 0;
    var show = function () {
      log.textContent = steps[i];
      items.forEach(function (li, j) { li.className = j < i ? 'done' : j === i ? 'active' : ''; });
      bar.style.width = Math.round(((i + 1) / (steps.length + 1)) * 100) + '%';
    };
    show();
    var tick = setInterval(function () { if (i < steps.length - 1) { i++; show(); } }, min / steps.length);
    try {
      var result = await promise;
      var left = min - (Date.now() - started);
      if (left > 0) await new Promise(function (r) { setTimeout(r, left); });
      clearInterval(tick);
      items.forEach(function (li) { li.className = 'done'; });
      log.textContent = done; bar.style.width = '100%';
      await new Promise(function (r) { setTimeout(r, 450); });
      return result;
    } finally {
      clearInterval(tick);
      screen.classList.add('working-out');
      setTimeout(function () { screen.remove(); }, 300);
      document.getElementById('main').removeAttribute('aria-busy');
    }
  }

  /* ---------------------------------- Start --------------------------------- */

  async function init() {
    try {
      var res = await fetch('/assets/finops-iq/questions.json', { cache: 'no-cache' });
      schema = await res.json();
      schema.questions.forEach(function (q) { Q[q.id] = q; });
    } catch (e) {
      clear(app); app.appendChild(h('p', { class: 'notice error' }, 'FinOps IQ could not load its questions. Reload the page to try again.'));
      return;
    }
    var p = new URLSearchParams(location.search);
    if (p.get('assessment')) await openAssessment(p.get('assessment'), p.get('view'));
    else render();
  }
  // For browser tests: the page state, and whether scoring is still pending.
  window.FINOPS_IQ = { state: function () { return state; }, busy: function () { return !!timers.evaluate || timers.inFlight > 0; } };
  init();
})();
