/**
 * Sovereign IQ page (PLAN S5): the merged Sovereign IQ and Posture IQ. One page, executive and workshop modes, and
 * client mode; questions step by step, a Review and complete step, then the completed result as a dashboard with the
 * two headlines that are never blended: sovereignty control maturity and compliance exposure.
 *
 * The page holds no scoring, trigger or regulatory logic. It sends the answers to the server
 * (POST /api/evaluate/sovereign-iq/v4) and shows what comes back, including which questions are asked. Client mode
 * asks the server for the client view (?view=client), so consultant-only content never reaches the browser.
 * Assessments are saved and resumed on the server (/api/sovereign-iq/assessment); no assessment data is kept in the
 * browser. Layout, styles and charts are shared with FinOps IQ.
 */
(function () {
  'use strict';

  var API = window.LTM_API;
  var C = window.FinOpsIqCharts;
  var EVALUATE = '/api/evaluate/sovereign-iq/v4';
  var ASSESSMENT = '/api/sovereign-iq/assessment';
  var REPORT = '/api/sovereign-iq/report';
  var MODE_INFO = {
    executive: { label: 'Executive', duration: '15–20 minutes', text: 'Which regulations apply, how exposed are we, and do our controls meet the level our data needs? 17 questions for the CIO.' },
    workshop: { label: 'Workshop', duration: '60–90 minutes', text: 'Requirement per kind of data, every control, and a ranked roadmap. Consultant-led, with the CISO, DPO or General Counsel and the head of cloud.' }
  };
  /** Questions asked in executive mode only when an earlier answer calls for them, until the server says otherwise. */
  var CONDITIONAL = { T2: true, I1: true };
  /** Scope questions the result depends on: marked required on the Review step. */
  var REQUIRED_SCOPE = ['A1', 'A2', 'A3', 'A4', 'B1', 'B4', 'D1', 'D3', 'P1', 'L1'];
  var STATE_WORD = { 3: 'in place', 2: 'largely in place', 1: 'partly in place', 0: 'not in place', unknown: 'unconfirmed', not_answered: 'not answered' };
  var GRADE = { applies: 'Applies', likely_confirm: 'Likely – confirm', advisory: 'Advisory', not_applicable: 'Not applicable' };
  var RAG = { red: 'Red', amber: 'Amber', green: 'Green', not_rated: 'Not rated' };
  var SEVERITIES = ['Critical', 'High', 'Medium', 'Low'];
  var SEV_COLOR = { Critical: '#9F1D12', High: '#D9822B', Medium: '#2F7FA0', Low: '#3C8D5A' };
  var CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'INR', 'SGD', 'AUD', 'NZD', 'JPY', 'HKD', 'CNY', 'KRW', 'CAD'];
  var TABS = [
    { id: 'overview', label: 'Overview' }, { id: 'regulations', label: 'Regulations' }, { id: 'controls', label: 'Controls' },
    { id: 'findings', label: 'Findings' }, { id: 'seal', label: 'SEAL view' }, { id: 'advisory', label: 'Cloud advisory' }, { id: 'roadmap', label: 'Roadmap' }, { id: 'method', label: 'Method' }
  ];
  /** Placement status (PLAN S7) in words, with the heatmap colour it shares with control states. */
  var PLACEMENT = { meets: ['Meets the level', 'gap0'], gap: ['Gap to close', 'gap2'], unconfirmed: ['To confirm', 'unknown'], move: ['Needs a sovereign offering', 'gap3'] };
  var HYPERSCALERS = ['aws', 'azure', 'gcp'];
  var AVAILABILITY = { preview: 'preview', announced: 'announced, not yet available', per_engagement: 'per engagement' };

  var schema = null;
  var Q = {};
  var state = null;
  var timers = {};
  var listNotice = null;
  var app = document.getElementById('app');
  var actions = document.getElementById('topbar-actions');

  /* ------------------------------- DOM helpers ------------------------------ */

  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      var v = attrs[k];
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') el.className = v;
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

  /** Re-render, keeping focus and scroll position. Answering a question does not call this (see refresh). */
  function render() {
    var active = document.activeElement;
    var focusId = active && active.id;
    var y = window.scrollY;
    clear(app);
    renderTopbar();
    if (!state) renderStart(); else renderAssessment();
    if (focusId) { var el = document.getElementById(focusId); if (el) el.focus({ preventScroll: true }); }
    window.scrollTo(0, y);
  }
  /** Moves focus to the new view's heading (WCAG 2.4.3). */
  function focusHeading() {
    var el = document.getElementById('hero-h') || document.getElementById('step-h');
    if (el) el.focus({ preventScroll: true });
  }
  function announce(text) {
    var live = document.getElementById('live');
    if (!live) return;
    live.textContent = '';
    setTimeout(function () { live.textContent = text; }, 50);
  }

  async function call(path, options) {
    var res = await API.fetch(path, options);
    var body = await res.json().catch(function () { return {}; });
    return { status: res.status, body: body };
  }

  function when(iso) { try { return new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }); } catch (e) { return iso || ''; } }
  function money(n, cur) {
    if (typeof n !== 'number') return '—';
    try { return new Intl.NumberFormat('en-GB', { style: 'currency', currency: cur || 'EUR', notation: 'compact', maximumFractionDigits: 1 }).format(n); }
    catch (e) { return (cur || '') + ' ' + Math.round(n).toLocaleString('en-GB'); }
  }
  function clean(t) { return String(t || '').replace(/\s*\[CLM-[A-Z]+-\d+\]/g, ''); }
  function statusLabel(s) { return { draft: 'Draft', in_progress: 'In progress', completed: 'Completed', archived: 'Archived' }[s] || s; }
  function regimeName(id) { var r = schema.regimes.find(function (x) { return x.id === id; }); return r ? r.name : id; }
  function controlInfo(id) { return schema.controls.find(function (x) { return x.id === id; }) || { id: id, name: id }; }
  function className(c) { return schema.dataClasses[c] || c; }
  function zoneName(z) { return z === 'unknown' ? 'Unknown' : schema.zones[z] || z; }
  /** A control's state in words, from the consultant result (state) or the client result (status). */
  function stateWord(x) { return x.status || STATE_WORD[String(x.state)] || 'not answered'; }
  function stateCls(x) {
    var w = stateWord(x);
    return w === 'in place' ? 'gap0' : w === 'largely in place' ? 'gap1' : w === 'partly in place' ? 'gap2' : w === 'not in place' ? 'gap3' : 'unknown';
  }

  /* --------------------------------- Top bar -------------------------------- */

  function renderTopbar() {
    clear(actions);
    if (!state) return;
    actions.appendChild(h('span', { class: 'status', id: 'save-status' }, state.saveStatus || ''));
    actions.appendChild(h('button', {
      class: 'btn small', type: 'button', 'aria-pressed': state.view === 'client' ? 'true' : 'false',
      onclick: function () { setView(state.view === 'client' ? 'consultant' : 'client'); }
    }, state.view === 'client' ? 'Client view: on' : 'Client view: off'));
    actions.appendChild(h('button', { class: 'btn small', type: 'button', onclick: closeAssessment }, 'All assessments'));
  }

  /* ------------------------------- Start screen ----------------------------- */

  async function renderStart() {
    var listCard = h('section', { class: 'card', 'aria-labelledby': 'saved-h' }, h('h2', { id: 'saved-h' }, 'Your assessments'), h('p', { class: 'muted' }, 'Loading…'));
    var sectors = (Q.A3.options || []).filter(function (o) { return o.value !== 'unknown'; });
    var form = h('form', { onsubmit: function (e) { e.preventDefault(); startNew(new FormData(e.target)); } },
      field('Client organisation', h('input', { type: 'text', name: 'clientName', id: 'start-client', required: true, maxlength: '200', autocomplete: 'organization' })),
      field('Sector (optional)', h('select', { name: 'clientSector', id: 'start-sector' }, h('option', { value: '' }, 'Choose…'), sectors.map(function (s) { return h('option', { value: s.value }, s.label); }))),
      h('fieldset', { class: 'field' }, h('legend', null, 'Mode'),
        h('div', { class: 'mode-choice' }, ['executive', 'workshop'].map(function (m, i) {
          return h('label', null, h('input', { type: 'radio', name: 'mode', value: m, checked: i === 0 }),
            h('strong', null, MODE_INFO[m].label + ' · ' + MODE_INFO[m].duration), h('br'), h('span', { class: 'small muted' }, MODE_INFO[m].text));
        }))),
      h('div', null, h('button', { class: 'btn primary', type: 'submit' }, 'Start assessment')));
    append(app, [
      h('h1', null, 'Sovereign IQ'),
      h('p', { class: 'muted' }, 'Where each kind of your data may run, which regulations apply across the EU and UK, the US and Asia-Pacific, how exposed you are under each, and whether your controls meet the sovereignty level your data needs. Sovereign IQ now includes Posture IQ.'),
      h('div', { class: 'notice', role: 'note' }, h('strong', null, 'Not legal advice. '), schema.notices.disclaimer.replace(/^.*?Not legal advice: /, '')),
      h('section', { class: 'card start', 'aria-labelledby': 'new-h' }, h('h2', { id: 'new-h' }, 'New assessment'), form),
      listCard
    ]);
    var res = await call(ASSESSMENT);
    clear(listCard);
    listCard.appendChild(h('h2', { id: 'saved-h' }, 'Your assessments'));
    if (listNotice) {
      var notice = h('p', { class: 'small', role: 'status', tabindex: '-1', id: 'list-notice' }, listNotice);
      listNotice = null; listCard.appendChild(notice); notice.focus();
    }
    if (res.status !== 200) { listCard.appendChild(h('p', { class: 'notice error' }, 'Saved assessments could not be loaded. Please try again.')); return; }
    var items = res.body.data || [];
    if (!items.length) { listCard.appendChild(h('p', { class: 'muted' }, 'No saved assessments yet.')); return; }
    listCard.appendChild(h('div', { class: 'table-wrap' }, h('table', null,
      h('thead', null, h('tr', null, ['Client', 'Mode', 'Status', 'Last saved', ''].map(function (t) { return h('th', { scope: 'col' }, t); }))),
      h('tbody', null, items.map(function (a) {
        return h('tr', null, h('td', null, a.clientName), h('td', null, MODE_INFO[a.mode] ? MODE_INFO[a.mode].label : a.mode),
          h('td', null, statusLabel(a.status)), h('td', null, when(a.updatedAt || a.startedAt)),
          h('td', { class: 'actions' }, h('button', { class: 'btn small', type: 'button', 'aria-label': 'Open ' + a.clientName, onclick: function () { openAssessment(a.assessmentId); } }, 'Open'), deleteControl(a)));
      })))));
  }

  /** Permanent deletion at the client's request, confirmed in place; focus follows the control. */
  function deleteControl(a) {
    var cell = h('span', { class: 'delete' });
    function ask() {
      var yes = h('button', { class: 'btn small danger', type: 'button', 'aria-label': 'Confirm delete ' + a.clientName, onclick: confirm }, 'Delete');
      clear(cell);
      append(cell, [h('span', { class: 'small', role: 'status' }, 'Delete permanently? '), yes, h('button', { class: 'btn small', type: 'button', onclick: function () { reset().focus(); } }, 'Cancel')]);
      yes.focus();
    }
    function reset() {
      var btn = h('button', { class: 'btn small', type: 'button', 'aria-label': 'Delete ' + a.clientName, onclick: ask }, 'Delete');
      clear(cell); cell.appendChild(btn); return btn;
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
  function field(label, control) {
    return h('div', { class: 'field' }, h('label', { for: control.id }, label), control);
  }

  /* --------------------------- Open, start and close ------------------------ */

  function newId() {
    var rnd = (window.crypto && crypto.randomUUID) ? crypto.randomUUID().replace(/-/g, '').slice(0, 12) : Math.random().toString(36).slice(2, 14);
    return 'SIQ-' + Date.now().toString(36) + '-' + rnd;
  }

  async function startNew(form, carry) {
    var session = API.readSession() || {};
    var sector = carry ? carry.clientSector : form.get('clientSector') || undefined;
    var answers = carry ? JSON.parse(JSON.stringify(carry.answers)) : {};
    if (sector && !answers.A3) answers.A3 = sector;
    state = {
      assessmentId: newId(), clientName: carry ? carry.clientName : String(form.get('clientName')).trim(), clientSector: sector,
      respondentEmail: session.email, status: 'draft', startedAt: new Date().toISOString(), mode: carry ? carry.mode : form.get('mode'),
      answers: answers, consultantNotes: '', result: null, errors: [], step: schema.steps[0].id, view: 'consultant', saveStatus: ''
    };
    var saved = await persist('save');
    if (!saved) { state = null; render(); return; }
    setUrl(); render(); focusHeading(); evaluate(true);
  }

  async function openAssessment(id, view) {
    var res = await call(ASSESSMENT + '?assessmentId=' + encodeURIComponent(id) + (view === 'client' ? '&view=client' : ''));
    if (res.status !== 200) { clear(app); app.appendChild(h('p', { class: 'notice error' }, res.status === 404 ? 'This assessment was not found.' : 'This assessment could not be opened.')); return; }
    var a = res.body.data, req = a.request || {};
    state = {
      assessmentId: a.assessmentId, clientName: a.clientName, clientSector: a.clientSector || undefined, respondentEmail: a.respondentEmail,
      status: a.status, startedAt: a.startedAt, completedAt: a.completedAt, mode: a.mode, answers: req.answers || {},
      consultantNotes: a.consultantNotes || '', result: a.result || null, errors: [],
      step: a.result && (a.status === 'completed' || a.status === 'archived') ? 'results' : schema.steps[0].id,
      view: view === 'client' ? 'client' : 'consultant', saveStatus: a.status === 'completed' || a.status === 'archived' ? statusLabel(a.status) : 'Saved'
    };
    setUrl(); render(); focusHeading();
    if (!isFinal()) evaluate(true);
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
    state.view = view; setUrl();
    if (isFinal()) { await openAssessment(state.assessmentId, view); return; }
    render(); evaluate(true);
  }

  /* ------------------------------ Save and score ---------------------------- */

  function request() { return { mode: state.mode, answers: state.answers }; }
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
      state.saveError = res.body.details && res.body.details.length ? res.body.details : [res.body.message || res.body.error || 'The assessment could not be saved.'];
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

  function changed() {
    if (isFinal()) return;
    updateLive();
    showSave('Unsaved changes');
    clearTimeout(timers.save);
    timers.save = setTimeout(function () { persist('save'); }, 1200);
    evaluate();
  }
  function evaluate(now) {
    clearTimeout(timers.evaluate);
    timers.evaluate = setTimeout(runEvaluate, now ? 0 : 400);
  }
  async function runEvaluate() {
    timers.evaluate = null;
    var seq = (timers.seq = (timers.seq || 0) + 1);
    timers.inFlight = (timers.inFlight || 0) + 1;
    var res;
    try { res = await call(EVALUATE + (state.view === 'client' ? '?view=client' : ''), { method: 'POST', body: JSON.stringify(request()) }); }
    finally { timers.inFlight--; }
    if (!state || seq !== timers.seq) return;
    if (res.status === 200) { state.result = res.body.data; state.errors = []; }
    else if (res.status === 400) { state.errors = res.body.details || [res.body.error]; }
    else state.errors = ['Scoring is unavailable right now. Your answers are kept; try again shortly.'];
    refresh();
  }

  /** After a scoring reply, redraw only when the questions on this step changed (a follow-up came or went). */
  var shown = { key: null, ids: [] };
  function structureKey() {
    var all = steps(), cur = currentStep(all);
    return [state.mode, state.view, isFinal(), cur.id, cur.questions.map(function (q) { return q.id; }).join(','), classesKey()].join('|');
  }
  /** Matrix rows follow the data classes chosen in D1 and the platforms chosen in P1. */
  function classesKey() { return [].concat(state.answers.D1 || []).join(',') + '/' + [].concat(state.answers.P1 || []).join(','); }
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
    var navEl = document.querySelector('nav.steps');
    if (navEl && navEl.getAttribute('data-key') !== navKey(all)) navEl.replaceWith(stepNav(all, currentStep(all)));
    all.forEach(function (st) {
      var btn = document.querySelector('nav.steps button[data-step="' + st.id + '"]');
      if (!btn) return;
      btn.className = stepClass(st);
      var c = btn.querySelector('.count'); if (c) c.textContent = stepCount(st);
    });
    currentStep(all).questions.forEach(function (q) {
      var el = document.getElementById('q-' + q.id);
      if (!el) return;
      var st = questionStatus(q);
      el.classList.remove('is-answered', 'is-missing', 'is-unknown', 'is-required');
      el.classList.add.apply(el.classList, st.classes);
      var pill = el.querySelector('.q-status'); if (pill) pill.replaceWith(statusPill(st));
    });
    var err = document.getElementById('score-notice'); if (err) err.replaceWith(scoreNotice());
    var rv = document.getElementById('review-body'); if (rv) rv.replaceWith(reviewBody());
  }

  /* ------------------------------ Assessment view --------------------------- */

  function isShown(q) {
    if (state.result && state.result.asked) return state.result.asked.indexOf(q.id) >= 0;
    if (CONDITIONAL[q.id] || q.mode === 'follow_up') return false;
    return state.mode === 'workshop' || q.mode === 'executive';
  }
  function steps() {
    var list = schema.steps.map(function (s) {
      return { id: s.id, label: s.label, intro: s.intro, questions: s.questions.map(function (id) { return Q[id]; }).filter(isShown) };
    }).filter(function (s) { return s.questions.length; });
    list.push(isFinal() ? { id: 'results', label: 'Results', questions: [] } : { id: 'review', label: 'Review & complete', questions: [] });
    return list;
  }
  function currentStep(all) {
    var want = state.step === 'results' || state.step === 'review' ? (isFinal() ? 'results' : 'review') : state.step;
    return all.find(function (x) { return x.id === want; }) || all[0];
  }
  function value(q) { return state.answers[q.id]; }
  function isAnswered(q) {
    var v = value(q);
    if (v === undefined || v === null || v === '') return false;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'object') return Object.keys(v).some(function (k) { var x = v[k]; return x !== undefined && x !== '' && !(Array.isArray(x) && !x.length) && !(x && typeof x === 'object' && !Array.isArray(x) && !Object.keys(x).length); });
    return true;
  }
  function isRequired(q) { return q.kind === 'maturity' && !!q.control && controlInfo(q.control).scored !== false || REQUIRED_SCOPE.indexOf(q.id) >= 0; }
  function isUnknown(q) { var v = value(q); return v === 'unknown' || (Array.isArray(v) && v.length === 1 && v[0] === 'unknown'); }
  function questionStatus(q) {
    var visited = state.ui && state.ui.visited && state.ui.visited[stepOf(q)];
    if (isAnswered(q)) return isUnknown(q) ? { key: 'unknown', text: 'Unknown', classes: ['is-answered', 'is-unknown'] } : { key: 'answered', text: 'Answered', classes: ['is-answered'] };
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

  function stepNav(all, current) {
    return h('nav', { class: 'steps', 'aria-label': 'Assessment steps', 'data-key': navKey(all) }, h('ol', null, all.map(function (st, i) {
      return h('li', null, h('button', {
        type: 'button', class: stepClass(st), 'data-step': st.id, 'aria-current': st.id === current.id ? 'step' : null,
        onclick: function () { leaveStep(st.id); render(); focusHeading(); window.scrollTo(0, 0); }
      }, h('span', { class: 'step-no', 'aria-hidden': 'true' }, st.id === 'review' || st.id === 'results' ? '✓' : String(i + 1)), h('span', { class: 'step-label' }, st.label), h('span', { class: 'count' }, stepCount(st))));
    })));
  }

  function renderAssessment() {
    var all = steps(), current = currentStep(all);
    var nav = stepNav(all, current);
    var head = h('div', { class: 'header-row' }, h('div', null, h('h1', null, state.clientName),
      h('p', { class: 'muted small' }, MODE_INFO[state.mode].label + ' mode · ' + MODE_INFO[state.mode].duration + ' · ' + statusLabel(state.status) + (state.completedAt ? ' ' + when(state.completedAt) : ''))));
    var body = h('div', { class: 'step-body' + (isFinal() ? ' read-only' : '') });
    if (state.saveError) body.appendChild(h('div', { class: 'notice error', role: 'alert' }, h('strong', null, 'Not saved. '), h('ul', null, state.saveError.slice(0, 6).map(function (e) { return h('li', null, e); }))));
    if (current.id === 'results') renderResults(body);
    else if (current.id === 'review') renderReview(body);
    else {
      body.appendChild(h('div', { class: 'step-head' }, h('h2', { id: 'step-h', tabindex: '-1' }, current.label), h('p', { class: 'muted' }, current.intro)));
      body.appendChild(scoreNotice());
      current.questions.forEach(function (q, i) { body.appendChild(question(q, i + 1)); });
      if (current.id === all[all.length - 2].id && state.view !== 'client') body.appendChild(notesCard());
    }
    if (current.id !== 'results') body.appendChild(navRow(all, current));
    append(app, current.id === 'results' ? [h('div', { class: 'layout results-layout' }, nav, body)] : [head, h('div', { class: 'layout' }, nav, body)]);
    shown.key = structureKey();
    shown.ids = current.questions.map(function (q) { return q.id; });
  }
  function navRow(all, current) {
    var idx = all.indexOf(current);
    return h('div', { class: 'nav-row', id: 'nav-row' },
      idx > 0 ? h('button', { class: 'btn', type: 'button', onclick: function () { leaveStep(all[idx - 1].id); render(); focusHeading(); window.scrollTo(0, 0); } }, '← ' + all[idx - 1].label) : h('span'),
      idx < all.length - 1 ? h('button', { class: 'btn primary', type: 'button', onclick: function () { leaveStep(all[idx + 1].id); render(); focusHeading(); window.scrollTo(0, 0); } }, all[idx + 1].label + ' →') : null);
  }
  function scoreNotice() {
    if (!state.errors.length) return h('div', { id: 'score-notice' });
    return h('div', { class: 'notice warn', role: 'status', id: 'score-notice' }, h('strong', null, 'Check these answers: '), h('ul', null, state.errors.slice(0, 8).map(function (e) { return h('li', null, e); })));
  }
  function notesCard() {
    return h('div', { class: 'card consultant' }, h('h3', null, 'Notes'),
      h('label', { for: 'notes', class: 'small muted' }, 'Saved with the assessment; never shown in client view or sent to the scoring engine. Do not record personal details about individuals.'),
      h('textarea', { id: 'notes', maxlength: '20000', disabled: isFinal(), oninput: function (e) { state.consultantNotes = e.target.value; showSave('Unsaved changes'); clearTimeout(timers.save); timers.save = setTimeout(function () { persist('save'); }, 1200); } }, state.consultantNotes));
  }

  /* ---------------------------------- Review -------------------------------- */

  function renderReview(body) {
    body.appendChild(h('div', { class: 'step-head' }, h('h2', { id: 'step-h', tabindex: '-1' }, 'Review and complete'), h('p', { class: 'muted' }, 'Check what is still open, then complete the assessment. The server scores the saved answers, records the result and dates it today.')));
    body.appendChild(scoreNotice());
    body.appendChild(reviewBody());
  }
  function reviewBody() {
    var all = steps().filter(function (x) { return x.questions.length; });
    var qs = [].concat.apply([], all.map(function (x) { return x.questions; }));
    var req = qs.filter(isRequired), reqDone = req.filter(isAnswered).length, missing = req.length - reqDone;
    var unknown = qs.filter(function (q) { return isAnswered(q) && isUnknown(q); }).length;
    var box = h('div', { id: 'review-body' });
    box.appendChild(h('div', { class: 'review-kpis' },
      kpi(missing ? 'warn' : 'ok', reqDone + ' / ' + req.length, 'Required answered'), kpi(missing ? 'bad' : 'ok', String(missing), 'Required still open'),
      kpi('neutral', String(unknown), '"Unknown" answers'), kpi('neutral', state.result && state.result.maturity ? String(state.result.maturity.controlsAssessed) : '—', 'Controls required')));
    box.appendChild(h('div', { class: 'card review-steps' }, h('h3', null, 'By step'), h('ul', null, all.map(function (st) {
      var miss = missingIn(st), done = st.questions.filter(isAnswered).length;
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
          h('p', { class: 'small muted' }, missing ? missing + ' required ' + (missing === 1 ? 'question is' : 'questions are') + ' still open. An unanswered control counts as not in place and is listed as "not answered"; you can complete now or answer first.' : 'Everything required is answered. After completion the answers cannot be changed; start a new assessment to revise them.')),
        h('button', { class: 'btn primary big-btn', type: 'button', disabled: !state.result, onclick: complete }, missing ? 'Complete anyway' : 'Complete assessment')));
    }
    return box;
  }
  function kpi(tone, v, label) { return h('div', { class: 'rk ' + tone }, h('strong', null, v), h('span', null, label)); }
  function goToQuestion(stepId, qid) {
    leaveStep(stepId); render();
    var el = document.getElementById('q-' + qid);
    if (el) { el.scrollIntoView({ block: 'center' }); var first = el.querySelector('input, select, textarea, button'); if (first) first.focus({ preventScroll: true }); el.classList.add('q-new'); }
  }

  /* -------------------------------- Questions ------------------------------- */

  function optionsOf(x) { return x.options || (x.optionsFrom ? optionsOf(Q[x.optionsFrom]) : []); }
  function zoneOptions(withUnknown) { return Object.keys(schema.zones).map(function (z) { return { value: z, label: schema.zones[z] }; }).concat(withUnknown ? [{ value: 'unknown', label: 'Unknown' }] : []); }
  function chosenClasses() { return [].concat(state.answers.D1 || []).filter(function (c) { return c !== 'unknown'; }); }

  function question(q, n) {
    var st = questionStatus(q);
    var wrap = h('fieldset', { class: ['question'].concat(st.classes).join(' ') + (q.mode === 'follow_up' ? ' follow-up' : ''), id: 'q-' + q.id, disabled: isFinal() });
    wrap.appendChild(h('legend', { class: 'q-legend' }, h('span', { class: 'q-num', 'aria-hidden': 'true' }, String(n)), h('span', { class: 'q-text' }, q.text)));
    wrap.appendChild(h('div', { class: 'q-meta' }, h('span', { class: 'q-id' }, q.id),
      q.control ? h('span', { class: 'q-cap' }, controlInfo(q.control).name) : h('span', { class: 'q-cap' }, q.kind === 'preference' ? 'Not scored' : 'Scope: never scored'),
      q.mode === 'follow_up' ? h('span', { class: 'q-follow' }, 'Follow-up') : null, statusPill(st)));
    if (q.help) wrap.appendChild(h('p', { class: 'help' }, q.help));
    if (q.id === 'L1' && schema.seal) wrap.appendChild(sealExplainer());
    wrap.appendChild(control(q));
    var foot = h('div', { class: 'q-foot' });
    if (q.basis && q.basis.length) foot.appendChild(h('details', { class: 'basis' }, h('summary', null, 'Basis'), h('ul', null, q.basis.map(function (b) { return h('li', null, b); }))));
    if (isAnswered(q) && !isFinal()) foot.appendChild(h('button', { class: 'btn link small', type: 'button', onclick: function () { delete state.answers[q.id]; changed(); render(); } }, 'Clear answer'));
    wrap.appendChild(foot);
    return wrap;
  }

  function setAnswer(q, v) { if (v === undefined) delete state.answers[q.id]; else state.answers[q.id] = v; changed(); }

  var LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  function radios(name, options, current, onPick) {
    var lettered = 0;
    return h('div', { class: 'options', role: 'radiogroup' }, options.map(function (o, i) {
      var id = name + '-' + i, unknown = o.value === 'unknown';
      return h('label', { class: 'option' + (unknown ? ' unknown' : ''), for: id },
        h('input', { type: 'radio', name: name, id: id, value: o.value, checked: current === o.value, onchange: function () { onPick(o.value); } }),
        h('span', { class: 'opt-mark', 'aria-hidden': 'true' }, unknown ? '?' : LETTERS.charAt(lettered++ % 26)),
        h('span', { class: 'opt-text' }, o.label));
    }));
  }
  /** Check boxes; "none" and "unknown" exclude every other choice. */
  function checks(name, options, current, onChange, compact) {
    var vals = [].concat(current || []);
    return h('div', { class: 'options' + (compact ? ' chips-select' : '') }, options.map(function (o, i) {
      var id = name + '-' + i;
      return h('label', { class: 'option check' + (compact ? ' chip' : ''), for: id },
        h('input', { type: 'checkbox', name: name, id: id, value: o.value, checked: vals.indexOf(o.value) >= 0, onchange: function (e) {
          var next = vals.filter(function (x) { return x !== o.value; });
          if (e.target.checked) next = (o.value === 'none' || o.value === 'unknown') ? [o.value] : next.filter(function (x) { return x !== 'none' && x !== 'unknown'; }).concat(o.value);
          onChange(next.length ? next : undefined);
          if (o.value === 'none' || o.value === 'unknown' || vals.indexOf('none') >= 0 || vals.indexOf('unknown') >= 0) render();
        } }),
        h('span', { class: 'opt-mark', 'aria-hidden': 'true' }), h('span', { class: 'opt-text' }, o.label));
    }));
  }

  function control(q) {
    var name = 'a-' + q.id, v = value(q);
    if (q.type === 'single') return radios(name, optionsOf(q), v, function (x) { setAnswer(q, x); });
    if (q.type === 'multi') return checks(name, optionsOf(q), v, function (x) { setAnswer(q, x); });
    if (q.type === 'compound') return compound(q);
    if (q.id === 'A2') return regionMatrix(q);
    if (q.id === 'D3') return locationMatrix(q);
    if (q.id === 'L2') return requirementMatrix(q);
    if (q.id === 'C1') return serviceMatrix(q);
    return h('p', { class: 'muted' }, 'Unsupported question type.');
  }

  function compound(q) {
    var v = value(q) || {};
    var put = function (key, x) { var next = Object.assign({}, value(q) || {}); if (x === undefined) delete next[key]; else next[key] = x; setAnswer(q, Object.keys(next).length ? next : undefined); };
    return h('div', { class: 'compound' }, q.fields.map(function (f) {
      var name = 'a-' + q.id + '-' + f.key;
      var title = h('p', { class: 'field-title' }, f.label + (f.optional ? ' (optional)' : ''));
      if (f.type === 'single') return h('div', { class: 'compound-field' }, title, radios(name, optionsOf(f), v[f.key], function (x) { put(f.key, x); }));
      if (f.type === 'multi') return h('div', { class: 'compound-field' }, title, checks(name, optionsOf(f), v[f.key], function (x) { put(f.key, x); }, true));
      var m = v[f.key] || {};
      var amount = h('input', { type: 'number', id: name, min: '0', step: '1000', inputmode: 'decimal', value: m.amount != null ? String(m.amount) : '',
        oninput: function (e) { var n = Number(e.target.value); put(f.key, e.target.value === '' || !(n > 0) ? undefined : { amount: n, currency: (document.getElementById(name + '-cur') || {}).value || 'EUR' }); } });
      var cur = h('select', { id: name + '-cur', 'aria-label': f.label + ': currency', onchange: function (e) { var a = Number(amount.value); if (a > 0) put(f.key, { amount: a, currency: e.target.value }); } },
        CURRENCIES.map(function (c) { return h('option', { value: c, selected: (m.currency || 'EUR') === c }, c); }));
      return h('div', { class: 'compound-field' }, h('label', { for: name, class: 'field-title' }, f.label + (f.optional ? ' (optional)' : '')), h('div', { class: 'amount-row' }, amount, cur));
    }));
  }

  /** A2: for each region, an entity there, and personal data of people there. */
  function regionMatrix(q) {
    var v = value(q) || {};
    var col = function (key, zone, checked) {
      var list = [].concat(v[key] || []);
      var id = 'a-A2-' + key + '-' + zone;
      return h('td', null, h('input', { type: 'checkbox', id: id, checked: checked, 'aria-label': (key === 'entity' ? 'Entity or office in ' : 'Personal data of people in ') + zoneName(zone),
        onchange: function (e) {
          var next = list.filter(function (x) { return x !== zone && x !== 'unknown'; });
          if (e.target.checked) next.push(zone);
          var out = Object.assign({}, value(q) || {}); out[key] = next; setAnswer(q, out);
        } }));
    };
    var people = [].concat(v.people || []);
    return h('div', null, h('div', { class: 'table-wrap' }, h('table', { class: 'matrix-table' },
      h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Region'), h('th', { scope: 'col' }, 'Entity or office here'), h('th', { scope: 'col' }, 'Personal data of people here'))),
      h('tbody', null, Object.keys(schema.zones).map(function (z) {
        return h('tr', null, h('th', { scope: 'row' }, zoneName(z)), col('entity', z, [].concat(v.entity || []).indexOf(z) >= 0), col('people', z, people.indexOf(z) >= 0));
      })))),
      h('label', { class: 'option check inline', for: 'a-A2-people-unknown' }, h('input', { type: 'checkbox', id: 'a-A2-people-unknown', checked: people.indexOf('unknown') >= 0,
        onchange: function (e) { var out = Object.assign({}, value(q) || {}); out.people = e.target.checked ? ['unknown'] : []; setAnswer(q, out); render(); } }),
        h('span', { class: 'opt-mark', 'aria-hidden': 'true' }), h('span', { class: 'opt-text' }, 'We do not know where the people whose data we hold are')));
  }

  /** D3: for each kind of data chosen in D1, where it is stored and processed, and where its backups are. */
  function locationMatrix(q) {
    var classes = chosenClasses();
    if (!classes.length) return h('p', { class: 'muted' }, 'Choose the kinds of data you hold (D1) first.');
    var v = value(q) || {};
    return h('div', { class: 'class-rows' }, classes.map(function (c) {
      var row = v[c] || {};
      var put = function (key, x) { var out = JSON.parse(JSON.stringify(value(q) || {})); out[c] = Object.assign({}, out[c] || {}); if (x) out[c][key] = x; else delete out[c][key]; if (!Object.keys(out[c]).length) delete out[c]; setAnswer(q, Object.keys(out).length ? out : undefined); };
      return h('div', { class: 'class-row' }, h('h4', null, className(c)),
        h('p', { class: 'field-title' }, 'Stored and processed'), checks('a-D3-' + c + '-primary', zoneOptions(true), row.primary, function (x) { put('primary', x); }, true),
        h('p', { class: 'field-title' }, 'Backups and disaster recovery'), checks('a-D3-' + c + '-backup', zoneOptions(true), row.backup, function (x) { put('backup', x); }, true));
    }));
  }

  /** L2: for each kind of data, its level, allowed regions and platforms (platforms from P1). */
  function requirementMatrix(q) {
    var classes = chosenClasses();
    if (!classes.length) return h('p', { class: 'muted' }, 'Choose the kinds of data you hold (D1) first.');
    var v = value(q) || {};
    var platforms = optionsOf(Q.P1).filter(function (o) { return [].concat(state.answers.P1 || []).indexOf(o.value) >= 0; });
    return h('div', { class: 'class-rows' }, classes.map(function (c) {
      var row = v[c] || {};
      var put = function (key, x) { var out = JSON.parse(JSON.stringify(value(q) || {})); out[c] = Object.assign({}, out[c] || {}); if (x) out[c][key] = x; else delete out[c][key]; if (!Object.keys(out[c]).length) delete out[c]; setAnswer(q, Object.keys(out).length ? out : undefined); };
      var id = 'a-L2-' + c + '-level';
      return h('div', { class: 'class-row' }, h('h4', null, className(c)),
        h('label', { for: id, class: 'field-title' }, 'Level'),
        h('select', { id: id, onchange: function (e) { put('level', e.target.value || undefined); } }, h('option', { value: '' }, 'Same as the board\'s choice (L1)'),
          optionsOf(Q.L1).map(function (o) { return h('option', { value: o.value, selected: row.level === o.value }, o.label); })),
        h('p', { class: 'field-title' }, 'Regions where it may sit'), checks('a-L2-' + c + '-zones', zoneOptions(false), row.zones, function (x) { put('zones', x); }, true),
        platforms.length ? h('p', { class: 'field-title' }, 'Platforms that hold it') : null,
        platforms.length ? checks('a-L2-' + c + '-platforms', platforms, row.platforms, function (x) { put('platforms', x); }, true) : null);
    }));
  }

  /** C1: for each kind of data, the kinds of service holding it on each hyperscaler chosen in P1 (or in L2 for that data). */
  function serviceMatrix(q) {
    var classes = chosenClasses();
    if (!classes.length) return h('p', { class: 'muted' }, 'Choose the kinds of data you hold (D1) first.');
    var p1 = [].concat(state.answers.P1 || []);
    var l2 = state.answers.L2 || {};
    var v = value(q) || {};
    return h('div', { class: 'class-rows' }, classes.map(function (c) {
      var held = [].concat((l2[c] || {}).platforms || []);
      var clouds = HYPERSCALERS.filter(function (p) { return p1.indexOf(p) >= 0 && (!held.length || held.indexOf(p) >= 0); });
      var row = v[c] || {};
      var put = function (key, x) { var out = JSON.parse(JSON.stringify(value(q) || {})); out[c] = Object.assign({}, out[c] || {}); if (x && x.length) out[c][key] = x; else delete out[c][key]; if (!Object.keys(out[c]).length) delete out[c]; setAnswer(q, Object.keys(out).length ? out : undefined); };
      return h('div', { class: 'class-row' }, h('h4', null, className(c)),
        clouds.length ? clouds.map(function (p) {
          return [h('p', { class: 'field-title' }, schema.platforms[p]), checks('a-C1-' + c + '-' + p, optionsOf(q), row[p], function (x) { put(p, x); }, true)];
        }) : h('p', { class: 'small muted' }, 'Not held on AWS, Azure or Google Cloud.'));
    }));
  }

  /* --------------------------------- Results -------------------------------- */

  function renderResults(body) {
    var r = state.result;
    if (!r) { body.appendChild(h('p', { class: 'muted' }, 'Loading the result…')); return; }
    var tab = TABS.some(function (t) { return t.id === state.tab; }) ? state.tab : 'overview';
    body.appendChild(hero(r));
    body.appendChild(h('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Result views' }, TABS.map(function (t) {
      return h('button', { type: 'button', role: 'tab', id: 'tab-' + t.id, class: 'tab', 'aria-selected': t.id === tab ? 'true' : 'false', 'aria-controls': 'panel-' + t.id, tabindex: t.id === tab ? '0' : '-1',
        onclick: function () { state.tab = t.id; render(); var b = document.getElementById('tab-' + t.id); if (b) b.focus({ preventScroll: true }); },
        onkeydown: function (e) {
          var i = TABS.indexOf(t), j = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? TABS.length - 1 : -2;
          if (j === -2) return;
          e.preventDefault(); state.tab = TABS[(j + TABS.length) % TABS.length].id; render(); document.getElementById('tab-' + state.tab).focus({ preventScroll: true });
        } }, t.label);
    })));
    var panel = h('div', { class: 'tab-panel', role: 'tabpanel', id: 'panel-' + tab, 'aria-labelledby': 'tab-' + tab, tabindex: '0' });
    if (tab === 'overview') overviewPanel(panel, r);
    else if (tab === 'regulations') regulationsPanel(panel, r);
    else if (tab === 'controls') controlsPanel(panel, r);
    else if (tab === 'findings') findingsPanel(panel, r);
    else if (tab === 'seal') sealPanel(panel, r);
    else if (tab === 'advisory') advisoryPanel(panel, r);
    else if (tab === 'roadmap') roadmapPanel(panel, r);
    else methodPanel(panel, r);
    body.appendChild(panel);
  }

  function inScope(r) { return r.regimes.filter(function (g) { return g.grade !== 'not_applicable'; }); }
  function sevCounts(r) { var s = {}; r.findings.forEach(function (f) { s[f.severity] = (s[f.severity] || 0) + 1; }); return s; }
  function capText(c) {
    if (!c) return null;
    var fig = c.amount != null ? money(c.amount, c.currency) : c.range ? (c.range[1] != null ? money(c.range[0], c.currency) + ' to ' + money(c.range[1], c.currency) : 'at least ' + money(c.range[0], c.currency)) : '—';
    return fig;
  }

  function hero(r) {
    var m = r.maturity, kpis = [];
    if (m.score != null) {
      var g = h('div', { class: 'kpi-card kpi-gauge' }, h('span', { class: 'kpi-label' }, 'Sovereignty control maturity'),
        C.gauge({ value: m.score, label: 'Maturity ' + m.score + ' of 100: ' + m.band }),
        h('div', { class: 'gauge-value' }, h('strong', { class: 'count' }), h('span', null, '/100')), h('span', { class: 'kpi-sub' }, m.band + (m.provisional ? ' · provisional' : '')));
      C.countUp(g.querySelector('.count'), m.score, function (x) { return String(Math.round(x)); });
      kpis.push(g);
    } else {
      kpis.push(h('div', { class: 'kpi-card kpi-money' }, h('span', { class: 'kpi-label' }, 'Sovereignty control maturity'), h('strong', { class: 'kpi-big small-big' }, m.withheld ? 'No score' : 'Nothing required'), h('span', { class: 'kpi-sub' }, m.wording)));
    }
    var regs = inScope(r);
    var counts = { applies: 0, likely_confirm: 0, advisory: 0 };
    regs.forEach(function (g) { counts[g.grade] = (counts[g.grade] || 0) + 1; });
    var parts = [{ k: 'applies', color: '#9F1D12' }, { k: 'likely_confirm', color: '#D9822B' }, { k: 'advisory', color: '#2F7FA0' }].map(function (x) { return { value: counts[x.k], color: x.color, label: GRADE[x.k], display: counts[x.k] }; });
    kpis.push(h('div', { class: 'kpi-card' }, h('span', { class: 'kpi-label' }, 'Regulations in scope'),
      h('div', { class: 'kpi-donut' }, C.donut({ label: 'Regulations: ' + parts.map(function (x) { return x.label + ' ' + x.value; }).join(', '), parts: parts, center: String(regs.length) })),
      h('span', { class: 'kpi-sub' }, counts.applies + ' apply · ' + counts.likely_confirm + ' to confirm · ' + counts.advisory + ' advisory')));
    var rag = { red: 0, amber: 0, green: 0 };
    r.exposure.regimes.forEach(function (e) { if (rag[e.rag] !== undefined) rag[e.rag]++; });
    kpis.push(h('div', { class: 'kpi-card' }, h('span', { class: 'kpi-label' }, 'Compliance exposure'), h('div', { class: 'rag-row' },
      ['red', 'amber', 'green'].map(function (k) { return h('span', { class: 'rag-chip ' + k }, h('strong', null, String(rag[k])), ' ' + RAG[k]); })),
      h('span', { class: 'kpi-sub' }, 'Obligations rated against your controls')));
    var cap = r.exposure.largestCap;
    kpis.push(h('div', { class: 'kpi-card kpi-money' }, h('span', { class: 'kpi-label' }, 'Largest single statutory cap'), h('strong', { class: 'kpi-big' + (cap ? '' : ' small-big') }, cap ? capText(cap) : 'Not quantified'),
      h('span', { class: 'kpi-sub' }, cap ? regimeName(cap.regime) + ' ' + cap.article + (cap.grade === 'likely_confirm' ? ' · likely – confirm' : '') + ' · cap, not expected fine' : r.exposure.capNote)));
    var sev = sevCounts(r), gaps = r.findings.length;
    var fc = h('div', { class: 'kpi-card' }, h('span', { class: 'kpi-label' }, 'Findings'), h('strong', { class: 'kpi-big count' }),
      h('div', { class: 'sev-strip', 'aria-hidden': 'true' }, SEVERITIES.map(function (k) { return sev[k] ? h('i', { style: 'flex:' + sev[k] + ';background:' + SEV_COLOR[k], title: k + ': ' + sev[k] }) : null; })),
      h('span', { class: 'kpi-sub' }, SEVERITIES.filter(function (k) { return sev[k]; }).map(function (k) { return sev[k] + ' ' + k.toLowerCase(); }).join(' · ') || 'No gaps'));
    C.countUp(fc.querySelector('.count'), gaps, function (x) { return String(Math.round(x)); }, 900);
    kpis.push(fc);
    var acts = h('div', { class: 'hero-actions' });
    var status = h('p', { class: 'small hero-status', id: 'report-status', role: 'status', 'aria-live': 'polite' });
    if (isFinal()) {
      acts.appendChild(h('button', { class: 'btn primary', type: 'button', onclick: function (e) { download('pdf', e.currentTarget, status); } }, 'Download report (PDF)'));
      acts.appendChild(h('button', { class: 'btn ghost', type: 'button', onclick: function (e) { download('csv', e.currentTarget, status); } }, 'Download backlog (CSV)'));
    }
    if (isFinal() && state.status === 'completed' && state.mode === 'executive' && state.view !== 'client') acts.appendChild(h('button', { class: 'btn ghost', type: 'button', onclick: continueInWorkshop }, 'Continue in workshop mode'));
    if (isFinal() && state.status === 'completed' && state.view !== 'client') acts.appendChild(h('button', { class: 'btn ghost', type: 'button', onclick: archive }, 'Archive assessment'));
    acts.appendChild(status);
    return h('section', { class: 'hero', 'aria-labelledby': 'hero-h' },
      h('div', { class: 'hero-top' }, h('div', null,
        h('p', { class: 'hero-eyebrow' }, 'Sovereign IQ · ' + MODE_INFO[state.mode].label + ' assessment'),
        h('h1', { id: 'hero-h', tabindex: '-1' }, state.clientName),
        h('p', { class: 'hero-meta' }, [statusLabel(state.status) + (state.completedAt ? ' ' + when(state.completedAt) : ''), r.exposure.summary, state.view === 'client' ? 'Client edition' : 'Consultant view'].join(' · '))), acts),
      m.label ? h('p', { class: 'hero-headline' }, m.label + (m.coverage < 1 ? ' · coverage ' + Math.round(m.coverage * 100) + '%' : '')) : null,
      h('div', { class: 'kpi-row' }, kpis));
  }

  function card(title, sub, content, cls) {
    var id = 'c-' + title.toLowerCase().replace(/[^a-z]+/g, '-');
    return h('section', { class: 'dash-card ' + (cls || ''), 'aria-labelledby': id }, h('div', { class: 'dash-card-head' }, h('h2', { id: id }, title), sub ? h('p', { class: 'small muted' }, sub) : null), content);
  }

  function overviewPanel(p, r) {
    var grid = h('div', { class: 'dash-grid' });
    grid.appendChild(card('Required level by kind of data', 'The higher of the legal minimum and the board\'s choice', h('div', { class: 'table-wrap' }, h('table', null,
      h('thead', null, h('tr', null, ['Data', 'Required level', 'Allowed regions', 'Set by'].map(function (t) { return h('th', { scope: 'col' }, t); }))),
      h('tbody', null, r.requirements.map(function (q) {
        return h('tr', null, h('th', { scope: 'row' }, className(q.dataClass)), h('td', null, schema.levels[q.required] || q.required),
          h('td', null, q.allowedZone.length ? q.allowedZone.map(zoneName).join(', ') : 'No restriction'),
          h('td', null, q.floor ? 'Law: ' + regimeName(q.floor.regime) + (q.floor.provisional ? ' (provisional – confirm)' : '') : q.choice && q.choice !== 'unknown' ? 'Board choice' : 'Legal minimum only'));
      })))), 'wide'));
    var dom = (r.maturity.byDomain || []).filter(function (d) { return d.score >= 0; });
    if (dom.length >= 3) {
      grid.appendChild(card('Maturity by area', 'Share of each area\'s required controls in place; the outer ring is 100, the dashed line 80 (sovereign-ready)', h('div', { class: 'radar-wrap' }, C.radar({
        label: 'Maturity by area: ' + dom.map(function (d) { return d.label + ' ' + d.score + ' of 100'; }).join('; '),
        max: 4, levels: ['25', '50', '75', '100'],
        axes: dom.map(function (d) { return { label: d.label, today: d.score / 25, todayLabel: d.score + ' of 100', target: 3.2, targetLabel: '80' }; })
      }), h('ul', { class: 'legend' }, h('li', null, h('i', { class: 'lg-today', 'aria-hidden': 'true' }), h('span', null, 'Today')), h('li', null, h('i', { class: 'lg-target', 'aria-hidden': 'true' }), h('span', null, 'Sovereign-ready (80)'))))));
    }
    var sevParts = SEVERITIES.map(function (k) { var n = r.findings.filter(function (f) { return f.severity === k; }).length; return { value: n, color: SEV_COLOR[k], label: k, display: n }; });
    grid.appendChild(card('Findings by severity', 'Gaps, scope confirmations and decisions', h('div', { class: 'donut-wrap' }, C.donut({ label: 'Findings by severity: ' + sevParts.map(function (x) { return x.label + ' ' + x.value; }).join(', '), parts: sevParts, center: String(r.findings.length), sub: 'findings' }), C.legend(sevParts))));
    grid.appendChild(card('Regulation heatmap', 'Regulations in scope by market; red, amber or green against your controls, grey where no duty is rated', regulationHeatmap(r), 'wide'));
    grid.appendChild(card('Control heatmap', 'Each required control by the level that needs it; green in place, amber to red below, grey unconfirmed or not answered', controlHeatmap(r), 'wide'));
    var top = r.topGaps.map(function (id) { return typeof id === 'string' ? r.findings.find(function (f) { return f.id === id; }) : id; }).filter(Boolean);
    if (top.length) grid.appendChild(card('Top gaps', 'Where to start', h('div', null, top.map(findingCard)), 'wide'));
    var notes = r.notes || [];
    if (notes.length) grid.appendChild(card('Notes', null, h('ul', { class: 'small' }, notes.map(function (n) { return h('li', null, n); })), 'wide'));
    p.appendChild(grid);
  }

  function controlHeatmap(r) {
    var rows = [['L1', 'Residency (L1)'], ['L2', 'Access and keys (L2)'], ['L3', 'Operational (L3)'], ['L4', 'Jurisdictional (L4)'], [null, 'Required by regulations']];
    var data = rows.map(function (x) {
      var cs = r.controls.filter(function (c) { return (controlInfo(c.control).level || null) === x[0]; });
      return { label: x[1], cells: cs.map(function (c) { var w = stateWord(c); return { label: c.name, sub: w, cls: stateCls(c), title: c.name + ': ' + w }; }) };
    }).filter(function (x) { return x.cells.length; });
    if (!data.length) return h('p', { class: 'muted' }, 'No control is required at the level you set.');
    return C.heatmap({ label: 'Control heatmap: ' + data.map(function (x) { return x.label + ': ' + x.cells.map(function (c) { return c.title; }).join('; '); }).join('. '), rows: data });
  }

  function regulationHeatmap(r) {
    var exp = {};
    r.exposure.regimes.forEach(function (e) { exp[e.regime] = e; });
    var markets = [['eu_uk', 'EU and UK'], ['us', 'United States'], ['apac', 'Asia-Pacific']];
    var cls = { red: 'gap3', amber: 'gap2', green: 'gap0', not_rated: 'unknown' };
    var rows = markets.map(function (m) {
      var regs = inScope(r).filter(function (g) { var info = schema.regimes.find(function (x) { return x.id === g.regime; }); return info && info.market === m[0]; });
      return { label: m[1], cells: regs.map(function (g) { var e = exp[g.regime] || {}; var word = GRADE[g.grade] + (e.rag && e.rag !== 'not_rated' ? ' · ' + RAG[e.rag] : ''); return { label: g.name, sub: word, cls: cls[e.rag] || 'unknown', title: g.name + ': ' + word }; }) };
    }).filter(function (x) { return x.cells.length; });
    if (!rows.length) return h('p', { class: 'muted' }, 'No regulation is in scope on these answers.');
    return C.heatmap({ label: 'Regulation heatmap: ' + rows.map(function (x) { return x.label + ': ' + x.cells.map(function (c) { return c.title; }).join('; '); }).join('. '), rows: rows });
  }

  /** The report PDF or backlog CSV of the completed assessment, built on the server from the stored result. */
  async function download(format, btn, status) {
    var q = new URLSearchParams({ assessmentId: state.assessmentId, format: format });
    if (state.view === 'client') q.set('view', 'client');
    btn.disabled = true;
    status.textContent = format === 'pdf' ? 'Preparing the report…' : 'Preparing the backlog…';
    try {
      var request = API.fetch(REPORT + '?' + q.toString(), { method: 'GET' });
      var res = format === 'pdf'
        ? await working(['Reading the stored result', 'Laying out the LTM report', 'Adding the heatmaps and the roadmap', 'Adding methodology and sources'], request, 'Report ready')
        : await request;
      if (res.status !== 200) {
        var err = await res.json().catch(function () { return {}; });
        status.textContent = err.message || 'The file could not be produced. Please try again.';
        return;
      }
      var name = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') || '');
      var url = URL.createObjectURL(await res.blob());
      var a = h('a', { href: url, download: name ? name[1] : 'sovereign-iq.' + format });
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
      status.textContent = 'Downloaded.';
    } catch (e) {
      status.textContent = 'The file could not be produced. Please try again.';
    } finally {
      btn.disabled = false;
    }
  }

  function regulationsPanel(p, r) {
    var exp = {};
    r.exposure.regimes.forEach(function (e) { exp[e.regime] = e; });
    var regs = inScope(r);
    var order = { applies: 0, likely_confirm: 1, advisory: 2 };
    regs.sort(function (a, b) { return order[a.grade] - order[b.grade]; });
    var sec = h('section', { class: 'card', 'aria-labelledby': 'regs-h' }, h('h2', { id: 'regs-h' }, 'Regulations in scope'), h('p', { class: 'small muted' }, r.exposure.summary + ' Statutory maximums are caps, not expected fines, and are never added together.'));
    regs.forEach(function (g) {
      var e = exp[g.regime] || {};
      var cap = e.cap;
      sec.appendChild(h('div', { class: 'regime ' + (e.rag || 'not_rated') },
        h('div', { class: 'regime-head' }, h('h3', null, g.name), h('span', { class: 'chip grade ' + g.grade }, GRADE[g.grade]), e.rag && e.rag !== 'not_rated' ? h('span', { class: 'rag-chip ' + e.rag }, RAG[e.rag]) : null,
          g.volatile ? h('span', { class: 'chip' }, 'Status as of ' + g.statusAsOf) : null),
        h('p', null, clean(g.reason)), g.basis ? h('p', { class: 'small muted' }, 'Basis: ' + clean(g.basis) + (g.rule && state.view !== 'client' ? ' · rule ' + g.rule : '')) : null,
        e.controls && e.controls.length ? h('p', { class: 'small' }, h('strong', null, 'Controls required: '), e.controls.map(function (c) { return controlInfo(c.control).name + ' (' + stateWord(c) + ')'; }).join('; ')) : e.reason ? h('p', { class: 'small muted' }, e.reason) : null,
        e.upcoming && e.upcoming.length ? h('p', { class: 'small' }, h('strong', null, 'Upcoming: '), e.upcoming.map(function (u) { return controlInfo(u.control).name + ' from ' + u.appliesFrom; }).join('; ')) : null,
        e.pendingSource && e.pendingSource.length ? h('p', { class: 'small consultant-only' }, 'Requirement pending source (consultant only): ' + e.pendingSource.map(function (c) { return controlInfo(c).name; }).join('; ')) : null,
        cap ? h('p', { class: 'small' }, h('strong', null, 'Statutory maximum: '), capText(cap) + ' · ' + cap.article + ' · ' + clean(cap.basis) + ' (cap, not expected fine)') : e.penaltyNote ? h('p', { class: 'small muted' }, clean(e.penaltyNote)) : null));
    });
    p.appendChild(sec);
    if (state.view !== 'client') {
      var na = r.regimes.filter(function (g) { return g.grade === 'not_applicable'; });
      p.appendChild(h('details', { class: 'card consultant' }, h('summary', null, 'Not applicable (' + na.length + '), consultant only'),
        h('ul', { class: 'small' }, na.map(function (g) { return h('li', null, g.name + (g.rule ? ' · rule ' + g.rule : '') + ': ' + clean(g.reason)); }))));
    } else if (r.regimesNotApplicable) p.appendChild(h('p', { class: 'small muted' }, r.regimesNotApplicable + ' other regulations were checked and do not apply on your answers; ask your consultant for the list.'));
  }

  function controlsPanel(p, r) {
    var m = r.maturity;
    var sec = h('section', { class: 'card', 'aria-labelledby': 'ctl-h' }, h('h2', { id: 'ctl-h' }, 'Required controls (' + r.controls.length + ')'),
      h('p', { class: 'small muted' }, m.wording + (m.score != null ? ' (' + m.score + '/100).' : '.') + ' Unknown answers count as not in place and are shown as unconfirmed; unanswered ones as not answered.'));
    sec.appendChild(h('div', { class: 'table-wrap' }, h('table', null,
      h('thead', null, h('tr', null, ['Control', 'State', 'Required by', 'Owner'].map(function (t) { return h('th', { scope: 'col' }, t); }))),
      h('tbody', null, r.controls.map(function (c) {
        var info = controlInfo(c.control);
        var by = [].concat(c.requiredBy.levels.length ? ['Level: ' + c.requiredBy.levels.map(className).join(', ')] : [], (c.requiredBy.regimes || []).map(function (x) { return regimeName(typeof x === 'string' ? x : x.regime); }));
        var classes = c.byClass ? Object.keys(c.byClass).map(function (k) { return className(k) + ': ' + (STATE_WORD[String(c.byClass[k])] || c.byClass[k]); }).join('; ') : null;
        return h('tr', null, h('th', { scope: 'row' }, info.name, h('span', { class: 'small muted block' }, info.means)),
          h('td', null, h('span', { class: 'state-chip ' + stateCls(c) }, stateWord(c)), classes ? h('span', { class: 'small muted block' }, classes) : null),
          h('td', { class: 'small' }, by.join('; ')), h('td', { class: 'small' }, info.ownerRole));
      })))));
    p.appendChild(sec);
  }

  function findingsPanel(p, r) {
    var fs = r.findings;
    var waves = [1, 2, 3, 4];
    var cells = SEVERITIES.map(function (s) { return waves.map(function (w) { return { count: fs.filter(function (f) { return f.severity === s && f.wave === w; }).length }; }); });
    var pick = state.findingFilter;
    var list = pick ? fs.filter(function (f) { return f.severity === SEVERITIES[pick[0]] && f.wave === waves[pick[1]]; }) : fs;
    p.appendChild(card('Priority matrix', 'Severity by roadmap wave; choose a cell to filter the list', C.matrix({
      rows: SEVERITIES, cols: waves.map(function (w) { return 'Wave ' + w; }), cells: cells, unit: ['finding', 'findings'], corner: 'Severity', picked: pick, rowClass: SEVERITIES.map(function (s) { return s.toLowerCase(); }),
      onPick: function (ri, ci) { state.findingFilter = pick && pick[0] === ri && pick[1] === ci ? null : [ri, ci]; render(); }
    })));
    var sec = h('section', { class: 'card', 'aria-labelledby': 'findings-h' }, h('h2', { id: 'findings-h' }, 'Findings (' + list.length + ')'));
    list.forEach(function (f) { sec.appendChild(findingCard(f)); });
    if (!list.length) sec.appendChild(h('p', { class: 'muted' }, 'No findings.'));
    p.appendChild(sec);
  }

  function findingCard(f) {
    return h('article', { class: 'finding ' + String(f.severity).toLowerCase() },
      h('div', { class: 'header-row', style: 'margin:0' }, h('h3', { style: 'margin:0' }, f.title), h('span', { class: 'chip ' + String(f.severity).toLowerCase() }, f.severity)),
      h('p', { class: 'small' }, clean(f.businessConsequence)),
      h('p', { class: 'small muted' }, [f.type === 'control_gap' ? 'Gap' : f.type === 'scope_confirmation' ? 'Confirm scope' : f.type === 'conflict' ? 'Conflicting answers' : 'Decision',
        'Owner: ' + f.ownerRole, f.upcoming ? 'By ' + f.upcoming : 'Time frame: ' + f.timeFrame, f.dataClasses && f.dataClasses.length ? 'Data: ' + f.dataClasses.map(className).join(', ') : null,
        f.referral ? 'Verify in ' + f.referral : null].filter(Boolean).join(' · ')),
      f.remedy ? h('p', { class: 'small' }, h('strong', null, 'What good looks like: '), f.remedy) : null);
  }

  function sealName(n) { return n == null ? '—' : 'SEAL-' + n; }

  /** Beside L1 (PLAN S7b): the SEAL 0–4 ladder in plain words, and the SEAL each level implies. */
  function sealExplainer() {
    var s = schema.seal;
    var mapped = s.objectives.filter(function (o) { return o.mapped; });
    return h('details', { class: 'basis seal-explainer' }, h('summary', null, 'What the EU SEAL levels mean'),
      h('p', { class: 'small' }, s.intro + ' This is an LTM mapping, not the Commission\'s, and it is not a SEAL assessment or certification.'),
      h('ul', { class: 'small' }, s.levels.map(function (l) { return h('li', null, h('strong', null, 'SEAL-' + l.id + ', ' + l.name.toLowerCase() + '. '), l.plain, l.note ? h('span', { class: 'block muted' }, l.note) : null); })),
      h('p', { class: 'small' }, h('strong', null, 'What each choice asks of your providers: ')),
      h('ul', { class: 'small' }, ['L1', 'L2', 'L3', 'L4'].map(function (lv) {
        var m = s.mapping[lv] || {};
        return h('li', null, h('strong', null, lv + ': '), mapped.filter(function (o) { return m[o.id] != null; }).map(function (o) { return o.name + ' ' + sealName(m[o.id]); }).join('; '));
      })),
      h('p', { class: 'small muted' }, 'Source: ' + s.framework + '. Status as of ' + s.statusAsOf + '.'));
  }

  /** SEAL view (PLAN S7b): the minimum provider SEAL each kind of data needs, and the controls behind each objective. */
  function sealPanel(p, r) {
    var v = r.seal;
    if (!v) { p.appendChild(h('p', { class: 'muted' }, 'The SEAL view needs a newer result; complete the assessment again.')); return; }
    var mapped = schema.seal.objectives.filter(function (o) { return o.mapped; });
    p.appendChild(card('Minimum provider SEAL by kind of data', 'From the required level, using the LTM mapping; SEAL rates the provider\'s service, not you', v.byClass.length ? h('div', { class: 'table-wrap' }, h('table', null,
      h('thead', null, h('tr', null, [h('th', { scope: 'col' }, 'Data'), h('th', { scope: 'col' }, 'Level')].concat(mapped.map(function (o) { return h('th', { scope: 'col' }, o.id + ' ' + o.name.replace(/ sovereignty$/, '')); })))),
      h('tbody', null, v.byClass.map(function (c) {
        return h('tr', null, [h('th', { scope: 'row' }, className(c.dataClass)), h('td', null, c.level)].concat(mapped.map(function (o) { return h('td', null, sealName(c.minimums[o.id])); })));
      }).concat([h('tr', null, [h('th', { scope: 'row' }, 'Highest needed'), h('td', null, '')].concat(mapped.map(function (o) { return h('td', null, h('strong', null, sealName(v.organisation[o.id]))); })))])))) : h('p', { class: 'muted' }, 'No kind of data needs more than L0, so no minimum SEAL applies.'), 'wide'));
    if (v.l4Note) p.appendChild(h('p', { class: 'small muted' }, v.l4Note));
    p.appendChild(card('Your controls by sovereignty objective', 'The required controls that support each objective; a count of controls, not a rating', h('div', { class: 'table-wrap' }, h('table', null,
      h('thead', null, h('tr', null, ['Objective', 'In place', 'Controls'].map(function (t) { return h('th', { scope: 'col' }, t); }))),
      h('tbody', null, v.objectives.map(function (o) {
        return h('tr', null, h('th', { scope: 'row' }, o.id + ' ' + o.name + (o.mapped ? '' : ' (provider selection)')),
          h('td', null, o.controls.length ? o.inPlace + ' of ' + o.controls.length : '—'),
          h('td', { class: 'small' }, o.controls.length ? o.controls.map(function (c) { return controlInfo(c.control).name + ' (' + stateWord(c) + ')'; }).join('; ') : o.mapped ? 'No required control' : 'Assessed when choosing a provider (Cloud advisory)'));
      })))), 'wide'));
    var t = v.tender;
    if (t) p.appendChild(card('EU tender minimums', 'From your answer to L3', h('div', null,
      h('p', { class: 'small' }, 'Minimums: ' + Object.keys(t.minimums).map(function (o) { return o + ' ' + sealName(t.minimums[o]); }).join('; ') + '. These need at least ' + t.level + ' for ' + t.classes.map(className).join(', ') + '.'),
      t.raised.length ? h('p', { class: 'small' }, 'Raised the required level of ' + t.raised.map(function (x) { return className(x.dataClass) + ' from ' + x.from + ' to ' + x.to; }).join('; ') + '.') : null,
      t.beyondMapping.length ? h('p', { class: 'small' }, 'No level in the mapping reaches the minimum for ' + t.beyondMapping.join(', ') + ': discuss with your consultant.') : null,
      t.selectionCriteria.length ? h('p', { class: 'small' }, 'Provider-selection criteria: ' + t.selectionCriteria.map(function (x) { return x.objective + ' ' + sealName(x.minimum); }).join('; ') + '.') : null), 'wide'));
    if (state.view !== 'client' && v.commissionTenderResults) p.appendChild(h('p', { class: 'small consultant-only' }, 'Consultant only: ' + v.commissionTenderResults.statement));
    p.appendChild(h('p', { class: 'small muted' }, v.statement));
  }

  function rungName(id) { var x = (schema.rungs || []).find(function (g) { return g.id === id; }); return x ? id + ' ' + x.label : id; }

  /** One playbook action: what to do, the approach, options and how to check it (PLAN S7). */
  function actionItem(a) {
    return h('li', { class: 'small' }, h('strong', null, a.action + '.'), ' ', a.approach + '.',
      a.options && a.options.length ? h('span', { class: 'block' }, 'Options: ' + a.options.map(function (o) { return o.name; }).join('; ') + (a.confirmRegionalAvailability ? ' (confirm availability in your regions)' : '')) : null,
      h('span', { class: 'block muted' }, 'Check: ' + a.verification + ' · Owner: ' + a.ownerRole + (a.discoveryNeeded ? ' · Needs: ' + a.discoveryNeeded : '')));
  }

  /** Cloud advisory (PLAN S7): where each kind of data should sit on AWS, Azure or Google Cloud, then actions by platform. */
  function advisoryPanel(p, r) {
    var a = r.advisory || { placement: [], technical: [] };
    var rows = a.placement;
    p.appendChild(card('Placement matrix', 'For each kind of data on AWS, Azure or Google Cloud: the lowest rung of the placement ladder its level needs, and whether it is there today', rows.length ? h('div', { class: 'table-wrap' }, h('table', null,
      h('thead', null, h('tr', null, ['Data', 'Platform', 'Required level', 'Needs', 'Today'].map(function (t) { return h('th', { scope: 'col' }, t); }))),
      h('tbody', null, rows.map(function (x) {
        var st = PLACEMENT[x.status];
        return h('tr', null, h('th', { scope: 'row' }, className(x.dataClass)), h('td', null, schema.platforms[x.platform]), h('td', null, x.requiredLevel),
          h('td', null, rungName(x.minimumRung)), h('td', null, h('span', { class: 'state-chip ' + st[1] }, st[0])));
      })))) : h('p', { class: 'muted' }, 'No data at L1 or above is held on AWS, Azure or Google Cloud.'), 'wide'));

    rows.filter(function (x) { return x.status !== 'meets'; }).forEach(function (x) {
      var st = PLACEMENT[x.status];
      var ctl = x.rungControls.filter(function (c) { return stateWord(c) !== 'in place'; });
      p.appendChild(h('section', { class: 'card', 'aria-label': className(x.dataClass) + ' data on ' + schema.platforms[x.platform] },
        h('div', { class: 'header-row', style: 'margin:0' }, h('h3', { style: 'margin:0' }, className(x.dataClass) + ' data on ' + schema.platforms[x.platform]), h('span', { class: 'state-chip ' + st[1] }, st[0])),
        h('p', { class: 'small muted' }, 'Required ' + x.requiredLevel + ' in ' + (x.allowedZone.length ? x.allowedZone.map(zoneName).join(', ') : 'any region') + ': needs ' + rungName(x.minimumRung) + '.' + (x.services.length ? ' Services: ' + x.services.join(', ').replace(/_/g, ' ') + '.' : '')),
        x.confirmOperatingModel ? h('p', { class: 'small' }, 'Your answer says these services are run only by staff in the region through a local entity, but the data sits in standard regions of a provider based outside it. Confirm who operates and supports them, including escalations.') : null,
        ctl.length ? h('p', { class: 'small' }, h('strong', null, 'Not yet in place: '), ctl.map(function (c) { return controlInfo(c.control).name + ' (' + stateWord(c) + ')'; }).join('; ')) : null,
        x.options.length ? h('div', null, h('p', { class: 'small' }, h('strong', null, 'Options on ' + schema.platforms[x.platform] + ' at ' + x.minimumRung + ':')),
          h('ul', null, x.options.map(function (o) { return h('li', { class: 'small' }, h('strong', null, o.name), AVAILABILITY[o.availability] ? ' (' + AVAILABILITY[o.availability] + ')' : '', o.detail ? ': ' + o.detail : '', o.caveat ? h('span', { class: 'block muted' }, o.caveat) : null, o.confirmRegionalAvailability && !o.caveat ? h('span', { class: 'block muted' }, 'Confirm availability in your regions.') : null); }))) : null,
        x.r4Facts && x.r4Facts.length ? h('div', null, h('p', { class: 'small' }, h('strong', null, 'Facts for counsel')), h('div', { class: 'table-wrap' }, h('table', null,
          h('thead', null, h('tr', null, ['Offering', 'Owner', 'Operator', 'Operator\'s law', 'Technology'].map(function (t) { return h('th', { scope: 'col' }, t); }))),
          h('tbody', null, x.r4Facts.map(function (f) { return h('tr', null, h('th', { scope: 'row' }, f.name), h('td', { class: 'small' }, f.owner), h('td', { class: 'small' }, f.operator), h('td', { class: 'small' }, f.operatorLaw), h('td', { class: 'small' }, f.technologySupplier)); })))),
          h('p', { class: 'small muted' }, 'Whether this meets R4 is for your counsel.')) : null,
        x.noOfferingZones.length ? h('p', { class: 'small' }, schema.platforms[x.platform] + ' has no option at ' + x.minimumRung + ' listed for ' + x.noOfferingZones.map(zoneName).join(', ') + (x.alternatives.length ? '. Alternatives:' : '. Ask your consultant for alternatives.')) : null,
        x.alternatives.length ? h('ul', null, x.alternatives.map(function (o) { return h('li', { class: 'small' }, (o.provider ? schema.platforms[o.provider] + ': ' : '') + o.name + (o.detail ? ': ' + o.detail : '')); })) : null,
        x.actions.length ? h('div', null, h('p', { class: 'small' }, h('strong', null, 'Actions')), h('ul', null, x.actions.map(actionItem))) : null));
    });

    var by = {};
    (a.technical || []).forEach(function (x) { (by[x.platform] = by[x.platform] || []).push(x); });
    var platforms = Object.keys(by);
    p.appendChild(card('Actions by platform', 'Every gap with a technical remedy, on each platform that holds the affected data', platforms.length ? h('div', null, platforms.map(function (k) {
      return h('details', { class: 'basis' }, h('summary', null, schema.platforms[k] + ' (' + by[k].length + ')'), h('ul', null, by[k].map(actionItem)));
    })) : h('p', { class: 'muted' }, 'Platform actions are being sourced for this release.'), 'wide'));
    if (state.view !== 'client' && a.gaps && a.gaps.length) p.appendChild(h('p', { class: 'small consultant-only' }, 'Playbook gaps (consultant only): ' + a.gaps.map(function (g) { return controlInfo(g.control).name + ' on ' + g.platforms.map(function (x) { return schema.platforms[x] || x; }).join(', '); }).join('; ')));
    p.appendChild(h('p', { class: 'small muted' }, a.statement || ''));
  }

  function roadmapPanel(p, r) {
    var byId = {};
    r.findings.forEach(function (f) { byId[f.id] = f; });
    var names = { 1: 'Wave 1 · decide, confirm and fix critical gaps', 2: 'Wave 2 · high-severity gaps', 3: 'Wave 3 · medium-severity gaps', 4: 'Wave 4 · lower-severity and upcoming obligations' };
    var sec = h('section', { class: 'card', 'aria-labelledby': 'roadmap-h' }, h('h2', { id: 'roadmap-h' }, 'Roadmap'), h('p', { class: 'small muted' }, 'Waves follow severity, then dependencies: what a control needs comes first in the same wave or earlier.'));
    r.roadmap.forEach(function (w) {
      sec.appendChild(h('div', { class: 'wave' }, h('h3', null, names[w.wave] || 'Wave ' + w.wave),
        h('ol', null, w.findings.map(function (id) { var f = byId[id]; return f ? h('li', null, h('strong', null, f.title), h('span', { class: 'small muted' }, ' · ' + f.severity + ' · ' + f.ownerRole + ' · ' + (f.upcoming ? 'by ' + f.upcoming : f.timeFrame))) : null; }))));
    });
    p.appendChild(sec);
  }

  function methodPanel(p, r) {
    var v = r.versions;
    p.appendChild(h('section', { class: 'card methodology', 'aria-labelledby': 'method-h' }, h('h2', { id: 'method-h' }, 'Methodology and sources'),
      h('p', null, 'Each kind of data gets a required sovereignty level, L0 to L4: the higher of what the law requires and what the board chose. Every control that level needs, plus every control a regulation in scope requires, is rated from your answers. Maturity is the weighted share of those controls in place; it is shown only when at least ' + schema.minScoredControls + ' controls are required, because below that one answer would decide it. Unknown answers count as not in place.'),
      h('p', null, 'Compliance exposure is rated per regulation: red when a critical or high-weight control it requires is absent, unconfirmed or not answered, amber when any is below full, green when all are in place. Statutory maximums come from the cited articles; they are caps, not expected fines, and are never added together. Provider nationality matters only at L4; foreign-access laws are shown as exposure, never as a duty on you.'),
      h('p', { class: 'small muted' }, schema.notices.disclaimer + ' ' + schema.notices.review),
      h('p', { class: 'small muted' }, 'Engine ' + v.engine + ' · questions ' + v.questionSet + ' · controls ' + v.controls + ' · regulation registry ' + v.registry + ' (status as of ' + v.registryStatusAsOf + ') · claims register ' + v.claimsRegister + (r.assessmentDate ? ' · assessed ' + r.assessmentDate : ''))));
  }

  /* ----------------------------- Complete and more ---------------------------- */

  async function complete() {
    clearTimeout(timers.save);
    var data = await working(['Scoring your answers on the server', 'Checking which regulations apply', 'Setting the required level for each kind of data', 'Rating the required controls', 'Building the exposure view and the roadmap'], persist('complete'), 'Result ready', 3200);
    if (data) { state.step = 'results'; state.tab = 'overview'; state.findingFilter = null; render(); focusHeading(); window.scrollTo(0, 0); }
  }
  async function archive() { var data = await persist('archive'); if (data) render(); }
  function continueInWorkshop() {
    startNew(null, { mode: 'workshop', clientName: state.clientName, clientSector: state.clientSector, answers: state.answers });
  }

  var MIN_MS = 1600;
  async function working(list, promise, done, minMs) {
    var min = minMs || MIN_MS, started = Date.now();
    var items = list.map(function (t) { return h('li', null, h('span', { class: 'wl-icon', 'aria-hidden': 'true' }), h('span', null, t)); });
    var log = h('p', { class: 'working-step', role: 'status', 'aria-live': 'polite' }, list[0]);
    var bar = h('i');
    var screen = h('div', { class: 'working' }, h('div', { class: 'working-glow', 'aria-hidden': 'true' }),
      h('div', { class: 'working-card' },
        h('div', { class: 'working-emblem', 'aria-hidden': 'true' }, h('span', { class: 'ring r1' }), h('span', { class: 'ring r2' }), h('span', { class: 'ring r3' }), h('span', { class: 'hex' })),
        h('p', { class: 'working-org' }, h('strong', null, 'LTM'), ' Vantage · Responsible Advisory'),
        h('p', { class: 'working-title' }, 'Sovereign ', h('span', null, 'IQ')),
        h('p', { class: 'working-client' }, state ? state.clientName : ''), log,
        h('div', { class: 'working-track', 'aria-hidden': 'true' }, bar), h('ol', { class: 'working-list', 'aria-hidden': 'true' }, items)));
    document.body.appendChild(screen);
    document.getElementById('main').setAttribute('aria-busy', 'true');
    var i = 0;
    var show = function () { log.textContent = list[i]; items.forEach(function (li, j) { li.className = j < i ? 'done' : j === i ? 'active' : ''; }); bar.style.width = Math.round(((i + 1) / (list.length + 1)) * 100) + '%'; };
    show();
    var tick = setInterval(function () { if (i < list.length - 1) { i++; show(); } }, min / list.length);
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
      var res = await fetch('/assets/sovereign-iq/questions.json', { cache: 'no-cache' });
      schema = await res.json();
      schema.questions.forEach(function (q) { Q[q.id] = q; });
    } catch (e) {
      clear(app); app.appendChild(h('p', { class: 'notice error' }, 'Sovereign IQ could not load its questions. Reload the page to try again.'));
      return;
    }
    var p = new URLSearchParams(location.search);
    if (p.get('assessment')) await openAssessment(p.get('assessment'), p.get('view'));
    else render();
  }
  // For browser tests: the page state, and whether scoring is still pending.
  window.SOVEREIGN_IQ = { state: function () { return state; }, busy: function () { return !!timers.evaluate || timers.inFlight > 0; } };
  init();
})();
