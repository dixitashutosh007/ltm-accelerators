/**
 * FinOps IQ page (execution phase M3): one page, executive and workshop modes, and client mode.
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
  var LEVEL_LABEL = { run: 'Run', walk: 'Walk', crawl: 'Crawl', not_yet: 'Not yet' };
  var MODE_INFO = {
    executive: { label: 'Executive', duration: '15–20 minutes', text: 'Do we need to act now, and roughly how much is at stake? 18 questions for the CIO or CFO.' },
    workshop: { label: 'Workshop', duration: '60–90 minutes per session', text: 'What exactly, by when, owned by whom, and what is it worth? Consultant-led, with the cloud, FinOps, finance and engineering leads.' }
  };

  var schema = null;
  var Q = {};
  var state = null;   // the open assessment
  var timers = {};
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

  /** Re-render, keeping keyboard focus on the same control. */
  function render() {
    var active = document.activeElement;
    var focusId = active && active.id;
    var sel = active && typeof active.selectionStart === 'number' ? [active.selectionStart, active.selectionEnd] : null;
    clear(app);
    renderTopbar();
    if (!state) renderStart(); else renderAssessment();
    if (focusId) {
      var el = document.getElementById(focusId);
      if (el) { el.focus(); if (sel && el.setSelectionRange) try { el.setSelectionRange(sel[0], sel[1]); } catch (e) {} }
    }
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
          return h('label', null, h('input', { type: 'radio', name: 'mode', value: m, checked: i === 0 }),
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
    if (res.status !== 200) { listCard.appendChild(h('p', { class: 'notice error' }, 'Saved assessments could not be loaded. Please try again.')); return; }
    var items = res.body.data || [];
    if (!items.length) { listCard.appendChild(h('p', { class: 'muted' }, 'No saved assessments yet.')); return; }
    listCard.appendChild(h('div', { class: 'table-wrap' }, h('table', null,
      h('thead', null, h('tr', null, ['Client', 'Mode', 'Status', 'Last saved', ''].map(function (t) { return h('th', { scope: 'col' }, t); }))),
      h('tbody', null, items.map(function (a) {
        return h('tr', null, h('td', null, a.clientName), h('td', null, MODE_INFO[a.mode] ? MODE_INFO[a.mode].label : a.mode),
          h('td', null, statusLabel(a.status)), h('td', null, when(a.updatedAt || a.startedAt)),
          h('td', null, h('button', { class: 'btn small', type: 'button', 'aria-label': 'Open ' + a.clientName, onclick: function () { openAssessment(a.assessmentId); } }, 'Open'))); })))));
  }
  function field(label, control, hint) {
    var id = control.id;
    return h('div', { class: 'field' }, h('label', { for: id }, label), hint ? h('p', { class: 'hint' }, hint) : null, control);
  }
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
      facts: facts, answers: carry ? JSON.parse(JSON.stringify(carry.answers)) : {}, consultantNotes: '',
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
      answers: req.answers || {}, consultantNotes: a.consultantNotes || '', result: a.result || null, errors: [],
      step: a.result ? 'results' : 'estate', view: view === 'client' ? 'client' : 'consultant', saveStatus: a.status === 'completed' || a.status === 'archived' ? statusLabel(a.status) : 'Saved'
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
    render();
  }

  /* ------------------------------ Assessment view --------------------------- */

  function asked(id) { return state.result ? state.result.questions.asked.indexOf(id) >= 0 : false; }
  function inMode(q) { return q.modes.indexOf(state.mode) >= 0; }

  function steps() {
    var list = [{ id: 'estate', label: 'Your estate', questions: schema.questions.filter(function (q) { return q.kind === 'scope' && inMode(q); }) }];
    schema.domains.forEach(function (d) {
      var qs = schema.questions.filter(function (q) { return q.kind === 'maturity' && inMode(q) && capabilityDomain(q.capability) === d.id && (!state.result || asked(q.id)); });
      if (qs.length) list.push({ id: d.id, label: d.name, questions: qs, needsFacts: true });
    });
    var vb = schema.questions.filter(function (q) { return q.kind === 'value_base' && inMode(q) && asked(q.id); });
    if (vb.length) list.push({ id: 'value', label: 'Value inputs', questions: vb, needsFacts: true });
    list.push({ id: 'view', label: 'Your view', questions: schema.questions.filter(function (q) { return q.kind === 'hypothesis' && inMode(q) && (!state.result || asked(q.id)); }), needsFacts: true });
    list.push({ id: 'results', label: 'Results', questions: [], needsFacts: true });
    return list;
  }
  function capabilityDomain(id) { var c = schema.capabilities.find(function (x) { return x.id === id; }); return c && c.domain; }
  function isAnswered(q) {
    if (q.kind === 'scope' || q.kind === 'value_base') return (q.fields || [{ fact: null }]).some(function (f) { return f.fact && get(state.facts, f.fact) !== undefined; }) || (q.id === 'SC-02' && state.facts.footprint.publicCloudProviders.length > 0) || (q.id === 'SC-03' && state.facts.footprint.scopes.length > 0);
    return state.answers[q.id] !== undefined;
  }

  function renderAssessment() {
    var all = steps();
    var current = all.find(function (s) { return s.id === state.step; }) || all[0];
    var ready = !!state.result;
    var nav = h('nav', { class: 'steps', 'aria-label': 'Assessment steps' }, h('ol', null, all.map(function (s) {
      var done = s.questions.filter(isAnswered).length;
      return h('li', null, h('button', {
        type: 'button', 'aria-current': s.id === current.id ? 'step' : null, disabled: s.needsFacts && !ready && !state.result,
        onclick: function () { state.step = s.id; render(); var m = document.getElementById('main'); if (m) m.focus(); }
      }, h('span', null, s.label), s.questions.length ? h('span', { class: 'count' }, done + '/' + s.questions.length) : null));
    })));
    var cov = state.result && state.result.coverage;
    var head = h('div', { class: 'header-row' },
      h('div', null, h('h1', null, state.clientName), h('p', { class: 'muted small' }, MODE_INFO[state.mode].label + ' mode · ' + MODE_INFO[state.mode].duration + ' · ' + statusLabel(state.status) + (state.completedAt ? ' ' + when(state.completedAt) : ''))),
      cov ? h('div', { class: 'small muted', style: 'min-width:200px' }, cov.answered + ' of ' + cov.asked + ' questions answered', h('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(cov.asked), 'aria-valuenow': String(cov.answered), 'aria-label': 'Questions answered' }, h('i', { style: 'width:' + (cov.asked ? Math.round(100 * cov.answered / cov.asked) : 0) + '%' }))) : null);
    var body = h('div', { class: isFinal() ? 'read-only' : '' });
    if (state.saveError) body.appendChild(h('div', { class: 'notice error', role: 'alert' }, h('strong', null, 'Not saved. '), h('ul', null, state.saveError.slice(0, 6).map(function (e) { return h('li', null, e); }))));
    if (current.id === 'results') renderResults(body);
    else {
      body.appendChild(h('h2', null, current.label));
      if (current.id === 'estate') {
        body.appendChild(h('p', { class: 'muted' }, 'Scope and spend decide which capabilities and questions apply. They are never scored.'));
        if (state.errors.length) body.appendChild(factsNotice());
      }
      if (current.id === 'value') body.appendChild(h('p', { class: 'muted' }, 'Measured inputs from your billing data and provider tools. Without them, the matching value lever is listed but not quantified.'));
      if (current.id === 'view') body.appendChild(h('p', { class: 'muted' }, 'Your own view, shown beside the model. It never changes a rating or a number.'));
      current.questions.forEach(function (q) { body.appendChild(question(q)); });
      if (current.id === 'estate' && state.mode === 'executive' && state.view !== 'client') body.appendChild(setupCard());
      if (current.id === 'view' && state.view !== 'client') body.appendChild(notesCard());
    }
    var idx = all.indexOf(current);
    body.appendChild(h('div', { class: 'nav-row' },
      idx > 0 ? h('button', { class: 'btn', type: 'button', onclick: function () { state.step = all[idx - 1].id; render(); window.scrollTo(0, 0); } }, '← ' + all[idx - 1].label) : h('span'),
      idx < all.length - 1 ? h('button', { class: 'btn primary', type: 'button', disabled: all[idx + 1].needsFacts && !ready, onclick: function () { state.step = all[idx + 1].id; render(); window.scrollTo(0, 0); } }, all[idx + 1].label + ' →') : null));
    append(app, [head, h('div', { class: 'layout' }, nav, body)]);
  }

  function factsNotice() {
    var errs = state.errors.map(function (e) { return e.replace(/^facts\./, ''); });
    return h('div', { class: 'notice warn', role: 'status' }, h('strong', null, 'To continue, complete:'), h('ul', null, errs.slice(0, 8).map(function (e) { return h('li', null, e); })));
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

  function notesCard() {
    var id = 'notes';
    return h('div', { class: 'card consultant' }, h('h3', null, 'Notes'),
      h('label', { for: id, class: 'small muted' }, 'Saved with the assessment; never shown in client view or sent to the scoring engine.'),
      h('textarea', { id: id, maxlength: '20000', disabled: isFinal(), oninput: function (e) { state.consultantNotes = e.target.value; showSave('Unsaved changes'); clearTimeout(timers.save); timers.save = setTimeout(function () { persist('save'); }, 1200); } }, state.consultantNotes));
  }

  /* -------------------------------- Questions ------------------------------- */

  function question(q) {
    var wrap = h('fieldset', { class: 'question', id: 'q-' + q.id, disabled: isFinal() });
    wrap.appendChild(h('legend', null, h('span', { class: 'q-id' }, q.id + ' '), q.text));
    if (q.help) wrap.appendChild(h('p', { class: 'help' }, q.help));
    if (q.kind === 'scope' || q.kind === 'value_base') wrap.appendChild(factControl(q));
    else wrap.appendChild(answerControl(q));
    var foot = h('div', { class: 'q-foot' });
    if (q.basis && q.basis.length) foot.appendChild(h('details', { class: 'basis' }, h('summary', null, 'Based on'), h('ul', null, q.basis.map(function (b) { return h('li', null, b.citation); }))));
    if ((q.kind === 'maturity' || q.kind === 'hypothesis') && state.answers[q.id] !== undefined && !isFinal()) {
      foot.appendChild(h('button', { class: 'btn link small', type: 'button', onclick: function () { delete state.answers[q.id]; changed(); render(); } }, 'Clear answer'));
    }
    wrap.appendChild(foot);
    return wrap;
  }

  function radios(name, options, value, onPick) {
    return h('div', { class: 'options', role: 'radiogroup' }, options.map(function (o, i) {
      var id = name + '-' + i;
      return h('label', { class: 'option' + (o.value === 'unknown' || o.value === 'dont_know' ? ' unknown' : ''), for: id },
        h('input', { type: 'radio', name: name, id: id, value: o.value, checked: value === o.value, onchange: function () { onPick(o.value); } }), h('span', null, o.label));
    }));
  }
  function checks(name, options, values, onToggle) {
    return h('div', { class: 'options' }, options.map(function (o, i) {
      var id = name + '-' + i;
      return h('label', { class: 'option', for: id },
        h('input', { type: 'checkbox', name: name, id: id, value: o.value, checked: values.indexOf(o.value) >= 0, onchange: function (e) { onToggle(o.value, e.target.checked); } }), h('span', null, o.label));
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
        fd.allowUnknown ? h('label', { class: 'option', for: id + '-unknown' }, h('input', { type: 'checkbox', id: id + '-unknown', checked: v === 'unknown', onchange: function (e) {
          set(state.facts, path, e.target.checked ? 'unknown' : undefined); changed(); render();
        } }), h('span', null, 'Don\'t know')) : null));
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
      } }, [h('option', { value: '' }, 'Not stated (the lower published maximum is used)')].concat(opts.map(function (o) { return h('option', { value: o.value, selected: current === o.value }, o.label); }))));
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

  function renderResults(body) {
    var r = state.result;
    body.appendChild(h('h2', null, 'Results'));
    if (!r) { body.appendChild(state.errors.length ? factsNotice() : h('p', { class: 'muted' }, 'Scoring…')); return; }
    var client = state.view === 'client';
    var cur = r.value.currency || state.facts.org.currency;
    if (!isFinal()) body.appendChild(h('div', { class: 'notice warn', role: 'note' }, 'Preview. The result is recorded when you complete the assessment; until then it changes with every answer.'));

    if (r.needVerdict) {
      var nv = r.needVerdict;
      body.appendChild(h('section', { class: 'card', 'aria-labelledby': 'need-h' }, h('h3', { id: 'need-h' }, 'Do you need to act now?'),
        h('div', { class: 'verdict' }, h('div', null, h('div', { class: 'big' }, String(Math.round(nv.needIndex))), h('div', { class: 'small muted' }, 'Need index, 0–100')),
          h('div', null, h('p', null, h('strong', null, nv.bandLabel)), h('p', { class: 'small muted' }, nv.basisLine), h('p', { class: 'small' }, 'Confidence: ' + nv.confidence),
            nv.blindSpots && nv.blindSpots.length ? h('p', { class: 'small muted' }, 'Blind spots (unanswered or "Don\'t know"): ' + blindSpotLabels(nv.blindSpots).join('; ')) : null))));
    }

    var inScope = r.capabilities.filter(function (c) { return c.rating !== 'not_in_scope'; });
    var workshopOnly = inScope.filter(function (c) { return c.rating === 'not_assessed'; });
    var profiled = inScope.filter(function (c) { return c.rating !== 'not_assessed'; });
    body.appendChild(h('section', { class: 'card', 'aria-labelledby': 'profile-h' }, h('h3', { id: 'profile-h' }, 'Capability profile'), h('p', null, r.headline.statement),
      h('div', { class: 'table-wrap' }, h('table', null, h('thead', null, h('tr', null, ['Capability', 'Today', 'Target'].map(function (t) { return h('th', { scope: 'col' }, t); }))),
        h('tbody', null, profiled.map(function (c) {
          // "Not answered" already says the rating is unconfirmed; the note is for "Don't know" answers.
          var note = c.unconfirmed && c.ratingLabel !== 'Not answered' ? h('span', { class: 'small muted' }, ' (unconfirmed)') : null;
          var gap = typeof c.gap === 'number' ? (c.gap > 0 ? h('span', { class: 'small muted' }, ' · ' + c.gap + (c.gap === 1 ? ' level below' : ' levels below')) : h('span', { class: 'chip ok' }, 'At target')) : null;
          return h('tr', null, h('td', null, c.displayName), h('td', null, c.ratingLabel, note),
            h('td', null, c.target && c.target.level ? LEVEL_LABEL[c.target.level] : '—', gap ? ' ' : null, gap));
        })))),
      workshopOnly.length ? h('p', { class: 'small muted' }, workshopOnly.length + ' more capabilities are assessed in the workshop: ' + workshopOnly.map(function (c) { return c.displayName; }).join(', ') + '.') : null));

    body.appendChild(valueSection(r.value, cur));

    var ids = state.mode === 'executive' ? r.topFindingIds : r.findings.map(function (f) { return f.id; });
    var shown = ids.map(function (id) { return r.findings.find(function (f) { return f.id === id; }); }).filter(Boolean);
    body.appendChild(h('section', { class: 'card', 'aria-labelledby': 'findings-h' }, h('h3', { id: 'findings-h' }, state.mode === 'executive' ? 'Top findings' : 'Findings (' + shown.length + ')'),
      shown.length ? shown.map(findingCard) : h('p', { class: 'muted' }, 'No gaps against the targets for this estate.')));

    if (!client) body.appendChild(consultantPanel(r));
    body.appendChild(methodology(r));

    if (!isFinal() && !client) {
      body.appendChild(h('div', { class: 'card' }, h('h3', null, 'Complete the assessment'),
        h('p', { class: 'small muted' }, 'The server scores the saved answers, records the result and dates it today. After that the answers cannot be changed; start a new assessment to revise them.'),
        h('button', { class: 'btn primary', type: 'button', onclick: complete }, 'Complete assessment')));
    }
    if (state.status === 'completed' && !client) {
      body.appendChild(h('div', { class: 'card' }, h('h3', null, 'After completion'),
        state.mode === 'executive' ? h('p', null, h('button', { class: 'btn', type: 'button', onclick: continueInWorkshop }, 'Continue in workshop mode'), h('span', { class: 'small muted' }, ' Starts a workshop assessment with these answers filled in.')) : null,
        h('button', { class: 'btn', type: 'button', onclick: archive }, 'Archive')));
    }
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
      h('p', null, n.disclaimer),
      h('p', null, n.data),
      h('p', { class: 'small muted' }, 'FinOps IQ engine ' + r.versions.engine + ' · value model ' + r.versions.valueModel + ' · ' + r.versions.kb + ' · claims register ' + r.versions.claimsRegister + (r.assessmentDate ? ' · assessed ' + r.assessmentDate : '') + ' · data provided by ' + state.clientName));
  }

  async function complete() {
    clearTimeout(timers.save);
    var data = await persist('complete');
    if (data) { state.step = 'results'; render(); }
  }
  async function archive() { var data = await persist('archive'); if (data) render(); }
  function continueInWorkshop() {
    startNew(null, { mode: 'workshop', clientName: state.clientName, clientSector: state.clientSector, facts: state.facts, answers: state.answers });
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
