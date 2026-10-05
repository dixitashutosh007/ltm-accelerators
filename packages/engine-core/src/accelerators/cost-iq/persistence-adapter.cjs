'use strict';

const { LIFECYCLE } = require('./persistence.cjs');

function assertStatus(status) {
  if (!Object.values(LIFECYCLE).includes(status)) throw new Error('invalid_status');
}

function historySummary(record) {
  if (!record || typeof record !== 'object') throw new Error('record_required');
  assertStatus(record.status);
  return {
    assessmentId: record.assessmentId,
    acceleratorId: record.acceleratorId,
    releaseId: record.releaseId,
    methodologyVersion: record.methodologyVersion,
    status: record.status,
    clientName: record.clientName || null,
    clientSector: record.clientSector || null,
    startedAt: record.startedAt,
    updatedAt: record.updatedAt,
    completedAt: record.completedAt || null
  };
}

function sortHistory(records = []) {
  return [...records]
    .map(historySummary)
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

function createPersistenceAdapter(store) {
  if (!store || typeof store.create !== 'function' || typeof store.update !== 'function' ||
      typeof store.get !== 'function' || typeof store.list !== 'function') {
    throw new Error('persistence_store_contract_invalid');
  }

  return Object.freeze({
    async createDraft(record) {
      if (record.status !== LIFECYCLE.DRAFT) throw new Error('draft_required');
      return store.create(record);
    },

    async saveProgress(record) {
      if (record.status !== LIFECYCLE.DRAFT && record.status !== LIFECYCLE.IN_PROGRESS) {
        throw new Error('active_assessment_required');
      }
      return store.update(record);
    },

    async resume(assessmentId) {
      if (typeof assessmentId !== 'string' || !assessmentId.trim()) throw new Error('assessmentId_required');
      return store.get(assessmentId);
    },

    async history() {
      return sortHistory(await store.list());
    },

    async complete(record) {
      if (record.status !== LIFECYCLE.COMPLETED) throw new Error('completed_assessment_required');
      if (!record.resultJson) throw new Error('completed_result_required');
      return store.update(record);
    }
  });
}

module.exports = { historySummary, sortHistory, createPersistenceAdapter };
