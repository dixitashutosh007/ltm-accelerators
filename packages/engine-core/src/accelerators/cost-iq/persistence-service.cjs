'use strict';

const {
  LIFECYCLE,
  createAssessmentSnapshot,
  transitionAssessment,
  toPersistenceRecord,
  fromPersistenceRecord
} = require('./persistence.cjs');
const { createPersistenceAdapter } = require('./persistence-adapter.cjs');

function createCostIqPersistenceService(store, clock) {
  const adapter = createPersistenceAdapter(store);
  const time = clock || (() => new Date().toISOString());

  return Object.freeze({
    async createDraft(input) {
      const snapshot = createAssessmentSnapshot({ ...input, status: LIFECYCLE.DRAFT }, time);
      return adapter.createDraft(toPersistenceRecord(snapshot));
    },

    async saveProgress(record) {
      const snapshot = fromPersistenceRecord(record);
      const next = transitionAssessment(
        snapshot,
        record.status || LIFECYCLE.IN_PROGRESS,
        undefined,
        time
      );
      return adapter.saveProgress(toPersistenceRecord(next));
    },

    async resume(assessmentId) {
      const record = await adapter.resume(assessmentId);
      return record ? fromPersistenceRecord(record) : null;
    },

    async history() {
      return adapter.history();
    },

    async complete(record, result) {
      const snapshot = fromPersistenceRecord(record);
      const completed = transitionAssessment(snapshot, LIFECYCLE.COMPLETED, result, time);
      return adapter.complete(toPersistenceRecord(completed));
    }
  });
}

module.exports = { createCostIqPersistenceService };
