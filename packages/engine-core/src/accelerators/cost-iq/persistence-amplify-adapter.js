/**
 * Browser-side Cost IQ persistence adapter.
 *
 * This module deliberately does not import aws-amplify. The UI can inject the
 * configured Amplify Data client once the browser dependency is packaged.
 * Keeping the adapter dependency-injected lets us test the persistence contract
 * without touching Amplify infrastructure or bypassing owner authorization.
 */

function requireModel(client) {
  const model = client?.models?.CostIqAssessment;
  if (!model || typeof model.create !== 'function' || typeof model.get !== 'function' ||
      typeof model.list !== 'function' || typeof model.update !== 'function') {
    throw new Error('Cost IQ Amplify Data client is not configured.');
  }
  return model;
}

function unwrap(result) {
  if (result?.errors?.length) {
    const message = result.errors.map(error => error.message || 'Unknown Data API error').join('; ');
    throw new Error(message);
  }
  return result?.data ?? null;
}

export function createCostIqAmplifyAdapter(client) {
  return {
    async create(record) {
      const model = requireModel(client);
      return unwrap(await model.create(record));
    },

    async update(record) {
      const model = requireModel(client);
      return unwrap(await model.update(record));
    },

    async get(assessmentId) {
      const model = requireModel(client);
      return unwrap(await model.get({ assessmentId }));
    },

    async list() {
      const model = requireModel(client);
      return unwrap(await model.list());
    }
  };
}
