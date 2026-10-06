/* Cost IQ browser persistence via the parent's Cognito session and Amplify Data API. */
(function () {
  'use strict';

  const fields = 'assessmentId acceleratorId releaseId methodologyVersion status clientName clientSector clientCurrency selectedAreasJson answersJson subjectiveJson resultJson startedAt updatedAt completedAt';
  const operations = {
    create: 'mutation CreateCostIqAssessment($input: CreateCostIqAssessmentInput!) { createCostIqAssessment(input: $input) { ' + fields + ' } }',
    update: 'mutation UpdateCostIqAssessment($input: UpdateCostIqAssessmentInput!) { updateCostIqAssessment(input: $input) { ' + fields + ' } }',
    get: 'query GetCostIqAssessment($assessmentId: String!) { getCostIqAssessment(assessmentId: $assessmentId) { ' + fields + ' } }',
    list: 'query ListCostIqAssessments($limit: Int, $nextToken: String) { listCostIqAssessments(limit: $limit, nextToken: $nextToken) { items { ' + fields + ' } nextToken } }'
  };

  function sessionToken() {
    try {
      const user = JSON.parse(sessionStorage.getItem('ltm_auth_user') || 'null');
      return typeof user?.token === 'string' ? user.token : '';
    } catch (_) { return ''; }
  }

  async function graphql(operation, variables) {
    const endpoint = window.COST_IQ_DATA_URL;
    const token = sessionToken();
    if (!endpoint) throw new Error('Cost IQ persistence is not configured. Deploy the generated Amplify Data endpoint to enable saved assessments.');
    if (!token) throw new Error('Your parent app session has expired. Sign in again to save or resume assessments.');
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: token },
      body: JSON.stringify({ query: operations[operation], variables })
    });
    let payload;
    try { payload = await response.json(); } catch (_) { throw new Error('Cost IQ Data API returned an invalid response.'); }
    if (!response.ok || payload.errors?.length) {
      const messages = (payload.errors || []).map(error => error.message || 'Data API error');
      throw new Error(messages.join('; ') || ('Cost IQ Data API request failed (' + response.status + ').'));
    }
    return payload.data;
  }

  window.CostIqPersistence = Object.freeze({
    configured: () => Boolean(window.COST_IQ_DATA_URL),
    create: async record => (await graphql('create', { input: record })).createCostIqAssessment,
    update: async record => (await graphql('update', { input: record })).updateCostIqAssessment,
    get: async assessmentId => (await graphql('get', { assessmentId })).getCostIqAssessment,
    list: async () => {
      const items = [];
      let nextToken = null;
      do {
        const page = (await graphql('list', { limit: 1000, nextToken })).listCostIqAssessments;
        items.push(...(page?.items || []).filter(Boolean));
        nextToken = page?.nextToken || null;
      } while (nextToken);
      return items;
    }
  });
})();
