'use strict';

const path = require('path');
const canon = require('./canon/costiq-engine-v10.cjs');
const { orchestrate } = require('./canon/costiq-orchestrator-v10.2.cjs');

const RELEASE_MANIFEST = require('./canon/RELEASE_MANIFEST.json');

function evaluateCostIq({ answers = {}, scope = null, capabilityScores = {}, evidence = {}, feasibilityEvidence = {}, options = {} } = {}) {
  return canon.evaluate(null, {
    answers,
    scope: scope ? { ...scope, capabilityScores } : null,
    capabilityScores,
    options: { ...options, evidence, feasibilityEvidence }
  });
}

function metadata() {
  return {
    product: 'Cost IQ',
    release: RELEASE_MANIFEST,
    baseline: {
      questions: canon.config.questions.length + (canon.overlay.supplementalQuestions || []).length,
      dimensions: canon.config.dimensions.length,
      findings: canon.config.findings.length,
      recommendations: canon.config.recommendations.length,
      rules: canon.config.rules?.length || 0
    },
    finops: {
      version: canon.overlay.version,
      capabilities: Object.keys(canon.overlay.capabilityMappings || {}).length,
      domains: (canon.overlay.frameworkDomains || []).length
    }
  };
}

function questions() {
  return {
    manifest: canon.config.manifest,
    questions: [...canon.config.questions, ...(canon.overlay.supplementalQuestions || [])],
    dimensions: canon.config.dimensions
  };
}

module.exports = { evaluateCostIq, metadata, questions, orchestrate, RELEASE_MANIFEST };
