'use strict';

const LIFECYCLE = Object.freeze({
  DRAFT: 'draft',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed'
});

const TERMINAL = new Set([LIFECYCLE.COMPLETED]);

function nowIso() {
  return new Date().toISOString();
}

function assertId(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(field + '_required');
  }
}

function createAssessmentSnapshot(input = {}, clock = nowIso) {
  assertId(input.assessmentId, 'assessmentId');
  assertId(input.releaseId, 'releaseId');
  assertId(input.methodologyVersion, 'methodologyVersion');

  const timestamp = clock();
  return {
    assessmentId: input.assessmentId,
    acceleratorId: 'cost-iq',
    releaseId: input.releaseId,
    methodologyVersion: input.methodologyVersion,
    status: input.status || LIFECYCLE.DRAFT,
    clientName: input.clientName || null,
    clientSector: input.clientSector || null,
    clientCurrency: input.clientCurrency || null,
    selectedAreas: Array.isArray(input.selectedAreas) ? [...input.selectedAreas] : [],
    answers: input.answers && typeof input.answers === 'object' && !Array.isArray(input.answers) ? { ...input.answers } : {},
    subjective: input.subjective && typeof input.subjective === 'object' && !Array.isArray(input.subjective) ? { ...input.subjective } : {},
    result: input.result || null,
    startedAt: input.startedAt || timestamp,
    updatedAt: timestamp,
    completedAt: input.status === LIFECYCLE.COMPLETED ? (input.completedAt || timestamp) : null
  };
}

function transitionAssessment(snapshot, nextStatus, result = undefined, clock = nowIso) {
  if (!snapshot || typeof snapshot !== 'object') throw new Error('assessment_required');
  if (!Object.values(LIFECYCLE).includes(nextStatus)) throw new Error('invalid_status');
  if (TERMINAL.has(snapshot.status) && nextStatus !== snapshot.status) throw new Error('completed_assessment_immutable');

  const next = { ...snapshot, status: nextStatus, updatedAt: clock() };
  if (result !== undefined) next.result = result;
  if (nextStatus === LIFECYCLE.COMPLETED) {
    if (!next.result) throw new Error('completed_result_required');
    next.completedAt = next.completedAt || next.updatedAt;
  }
  return next;
}

function toPersistenceRecord(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') throw new Error('assessment_required');
  return {
    assessmentId: snapshot.assessmentId,
    acceleratorId: snapshot.acceleratorId,
    releaseId: snapshot.releaseId,
    methodologyVersion: snapshot.methodologyVersion,
    status: snapshot.status,
    clientName: snapshot.clientName,
    clientSector: snapshot.clientSector,
    clientCurrency: snapshot.clientCurrency,
    selectedAreasJson: JSON.stringify(snapshot.selectedAreas || []),
    answersJson: JSON.stringify(snapshot.answers || {}),
    subjectiveJson: JSON.stringify(snapshot.subjective || {}),
    resultJson: snapshot.result == null ? null : JSON.stringify(snapshot.result),
    startedAt: snapshot.startedAt,
    updatedAt: snapshot.updatedAt,
    completedAt: snapshot.completedAt || null
  };
}

function fromPersistenceRecord(record) {
  if (!record || typeof record !== 'object') throw new Error('record_required');
  return {
    assessmentId: record.assessmentId,
    acceleratorId: record.acceleratorId,
    releaseId: record.releaseId,
    methodologyVersion: record.methodologyVersion,
    status: record.status,
    clientName: record.clientName || null,
    clientSector: record.clientSector || null,
    clientCurrency: record.clientCurrency || null,
    selectedAreas: JSON.parse(record.selectedAreasJson || '[]'),
    answers: JSON.parse(record.answersJson || '{}'),
    subjective: JSON.parse(record.subjectiveJson || '{}'),
    result: record.resultJson ? JSON.parse(record.resultJson) : null,
    startedAt: record.startedAt,
    updatedAt: record.updatedAt,
    completedAt: record.completedAt || null
  };
}

module.exports = {
  LIFECYCLE,
  createAssessmentSnapshot,
  transitionAssessment,
  toPersistenceRecord,
  fromPersistenceRecord
};
