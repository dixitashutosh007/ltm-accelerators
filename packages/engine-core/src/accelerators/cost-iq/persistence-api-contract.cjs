'use strict';

const ROUTES = Object.freeze({
  CREATE: 'POST /assessment',
  UPDATE: 'PUT /assessment/{id}',
  GET: 'GET /assessment/{id}',
  HISTORY: 'GET /assessment/history',
  COMPLETE: 'POST /assessment/{id}/complete'
});

const REQUIRED_CREATE = Object.freeze([
  'assessmentId',
  'releaseId',
  'methodologyVersion',
  'selectedAreas',
  'answers'
]);

function validateCreate(input = {}) {
  const missing = REQUIRED_CREATE.filter(key => input[key] === undefined || input[key] === null);
  if (missing.length) return { valid: false, error: 'missing_required_fields', fields: missing };
  if (!Array.isArray(input.selectedAreas)) return { valid: false, error: 'selectedAreas_array_required' };
  if (!input.answers || typeof input.answers !== 'object' || Array.isArray(input.answers)) {
    return { valid: false, error: 'answers_object_required' };
  }
  return { valid: true };
}

function validateUpdate(input = {}) {
  if (!input.assessmentId) return { valid: false, error: 'assessmentId_required' };
  if (!input.status) return { valid: false, error: 'status_required' };
  return { valid: true };
}

function validateComplete(input = {}) {
  if (!input.assessmentId) return { valid: false, error: 'assessmentId_required' };
  if (!input.result) return { valid: false, error: 'result_required' };
  return { valid: true };
}

module.exports = {
  ROUTES,
  validateCreate,
  validateUpdate,
  validateComplete
};
