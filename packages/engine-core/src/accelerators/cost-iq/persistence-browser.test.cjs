'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

async function main() {
  const source = fs.readFileSync('Accelerators/assets/cost-iq-persistence.js', 'utf8');
  const html = fs.readFileSync('Accelerators/cost-iq-v10.html', 'utf8');
  const inlineScripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.ok(inlineScripts.length, 'Cost IQ page has an inline application script');
  new vm.Script(inlineScripts.at(-1)[1], { filename: 'cost-iq-v10.html:inline-script' });
  assert.match(html, /data-assessment-id=/, 'saved assessment IDs are rendered as escaped data attributes');
  assert.doesNotMatch(html, /onclick="resumeAssessment\(/, 'saved assessment IDs are not interpolated into inline JavaScript');
  assert.doesNotMatch(source, /COST_IQ_DATA_URL|graphql/i, 'the browser no longer calls the Data API (CQ1)');

  const calls = [];
  const window = { COST_IQ_API: 'https://api.example/', LTM_API: { getIdToken: async () => 'parent-id-token', refreshIdToken: async () => null } };
  const context = {
    window,
    location: { pathname: '/cost-iq-v10', search: '', href: '' },
    encodeURIComponent,
    fetch: async (url, init) => {
      calls.push({ url, init, body: init.body ? JSON.parse(init.body) : null });
      return { ok: true, status: 200, json: async () => ({ ok: true, data: { echoed: true } }) };
    }
  };
  vm.runInNewContext(source, context);
  const api = window.CostIqPersistence;
  assert.equal(api.configured(), true);

  window.costIqProgress = () => ({ stage: 'Cloud', percent: 40 });
  await api.create({ assessmentId: 'A0', status: 'draft' });
  await api.update({ assessmentId: 'A0', status: 'in_progress' });
  await api.update({ assessmentId: 'A0', status: 'completed' });
  await api.get('A0');
  await api.list();
  await api.remove('A0');

  assert.equal(calls.length, 6);
  assert.ok(calls.every(c => c.url.startsWith('https://api.example//api/cost-iq/assessment') || c.url.startsWith('https://api.example/') ), 'calls go to the Advisory API');
  assert.ok(calls.every(c => c.url.includes('/api/cost-iq/assessment')));
  assert.ok(calls.every(c => c.init.headers.Authorization === 'Bearer parent-id-token'), 'every call carries the platform token');
  assert.deepEqual(calls.slice(0, 3).map(c => c.body.action), ['save', 'save', 'complete'], 'a completed record asks the server to complete it');
  assert.deepEqual(calls[0].body.progress, { stage: 'Cloud', percent: 40 }, 'saves carry the stage and share answered');
  assert.equal(calls[3].init.method, undefined, 'get is a GET');
  assert.ok(calls[3].url.endsWith('?assessmentId=A0'));
  assert.deepEqual(calls[5].body, { action: 'delete', assessmentId: 'A0' });

  window.COST_IQ_API = '';
  assert.equal(api.configured(), false);

  console.log('Cost IQ browser persistence API transport: PASS');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
