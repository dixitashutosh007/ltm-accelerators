/* Cost IQ browser persistence through the Advisory API (CQ1). The API checks the signed-in caller and keeps every
   assessment to its owner; the browser no longer calls the Data API. Records keep the shape the page already used. */
(function () {
  'use strict';

  const ENDPOINT = '/api/cost-iq/assessment';

  function toSignIn() {
    location.href = '/?require_login=1&redirect=' + encodeURIComponent(location.pathname + location.search);
  }

  async function request(path, options) {
    const lib = window.LTM_API;
    const token = lib ? await lib.getIdToken() : '';
    if (!token) { toSignIn(); throw new Error('Your session has expired. Sign in again to save or resume assessments.'); }
    const send = t => fetch((window.COST_IQ_API || '') + path, Object.assign({}, options, {
      headers: Object.assign({ 'Content-Type': 'application/json' }, options && options.headers, { Authorization: 'Bearer ' + t })
    }));
    let response = await send(token);
    if (response.status === 401) {
      const renewed = await lib.refreshIdToken();
      if (renewed) response = await send(renewed);
      if (response.status === 401) { toSignIn(); throw new Error('Your session has expired. Sign in again to save or resume assessments.'); }
    }
    let payload;
    try { payload = await response.json(); } catch (_) { throw new Error('Cost IQ returned an invalid response.'); }
    if (!response.ok || !payload.ok) throw new Error(payload.message || payload.error || ('Cost IQ request failed (' + response.status + ').'));
    return payload.data;
  }

  const post = body => request(ENDPOINT, { method: 'POST', body: JSON.stringify(body) });
  const progress = () => (typeof window.costIqProgress === 'function' ? window.costIqProgress() : undefined);

  window.CostIqPersistence = Object.freeze({
    configured: () => Boolean(window.COST_IQ_API),
    create: record => post({ action: 'save', snapshot: record, progress: progress() }),
    // A completed record asks the server to complete it: the result is computed there from the saved answers.
    update: record => post({ action: record.status === 'completed' ? 'complete' : 'save', snapshot: record, progress: progress() }),
    get: assessmentId => request(ENDPOINT + '?assessmentId=' + encodeURIComponent(assessmentId)),
    list: () => request(ENDPOINT),
    remove: assessmentId => post({ action: 'delete', assessmentId }),
    // The cloud line comes from FinOps IQ (one cloud figure per estate): list the caller's completed FinOps IQ assessments, link one, unlink it.
    finopsSessions: () => request(ENDPOINT + '?finopsSessions=1'),
    linkFinops: (assessmentId, finopsAssessmentId) => post({ action: 'link_finops', assessmentId, finopsAssessmentId }),
    unlinkFinops: assessmentId => post({ action: 'unlink_finops', assessmentId })
  });
})();
