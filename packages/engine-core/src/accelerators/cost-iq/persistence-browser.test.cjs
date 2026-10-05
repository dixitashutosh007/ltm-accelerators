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
  const calls = [];
  const pages = [
    { items: [{ assessmentId: 'A1' }], nextToken: 'page-2' },
    { items: [{ assessmentId: 'A2' }], nextToken: null }
  ];
  const sessionStorage = { getItem: key => key === 'ltm_auth_user' ? JSON.stringify({ token: 'parent-id-token' }) : null };
  const window = { COST_IQ_DATA_URL: 'https://appsync.example/graphql' };
  const context = {
    window,
    sessionStorage,
    fetch: async (url, init) => {
      calls.push({ url, init, body: JSON.parse(init.body) });
      const body = calls.at(-1).body;
      let data;
      if (body.query.includes('CreateCostIqAssessment')) data = { createCostIqAssessment: body.variables.input };
      else if (body.query.includes('UpdateCostIqAssessment')) data = { updateCostIqAssessment: body.variables.input };
      else if (body.query.includes('GetCostIqAssessment')) data = { getCostIqAssessment: { assessmentId: body.variables.assessmentId } };
      else data = { listCostIqAssessments: pages.shift() };
      return { ok: true, status: 200, json: async () => ({ data }) };
    }
  };
  vm.runInNewContext(source, context);
  const api = window.CostIqPersistence;
  assert.equal(api.configured(), true);
  assert.deepEqual(await api.create({ assessmentId: 'A0' }), { assessmentId: 'A0' });
  assert.deepEqual(await api.update({ assessmentId: 'A0', status: 'completed' }), { assessmentId: 'A0', status: 'completed' });
  assert.deepEqual(await api.get('A0'), { assessmentId: 'A0' });
  assert.equal(JSON.stringify(await api.list()), JSON.stringify([{ assessmentId: 'A1' }, { assessmentId: 'A2' }]));
  assert.equal(calls.length, 5);
  assert.ok(calls.every(call => call.url === window.COST_IQ_DATA_URL));
  assert.ok(calls.every(call => call.init.headers.Authorization === 'parent-id-token'));
  assert.equal(calls[4].body.variables.nextToken, 'page-2');

  window.COST_IQ_DATA_URL = '';
  assert.equal(api.configured(), false);
  await assert.rejects(api.get('A0'), /not configured/);

  console.log('Cost IQ browser persistence GraphQL transport: PASS');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
