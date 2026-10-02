'use strict';

const canon = require('./canon/costiq-engine-v10.cjs');
const orchestrator = require('./canon/costiq-orchestrator-v10.2.cjs');
const config = require('./canon/config/master-v6.6.json');
const overlay = require('./canon/config/finops-overlay-v7.1.0.json');
const calibration = require('./canon/config/finding-activation-calibration-v7.1.0.json');
const opportunityGates = require('./canon/config/opportunity-recommendation-gates-v7.1.0.json');
const RELEASE_MANIFEST = require('./canon/RELEASE_MANIFEST.json');

function evaluateCostIq({ answers = {}, scope = null, capabilityScores = {}, evidence = {}, feasibilityEvidence = {}, options = {} } = {}) {
  return canon.evaluate(config, {
    overlay,
    calibration,
    opportunityGates,
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
      questions: config.questions.length + (overlay.supplementalQuestions || []).length,
      dimensions: config.dimensions.length,
      findings: config.findings.length,
      recommendations: config.recommendations.length,
      rules: config.rules?.length || 0
    },
    finops: {
      version: overlay.version,
      capabilities: Object.keys(overlay.capabilityMappings || {}).length,
      domains: (overlay.frameworkDomains || []).length
    }
  };
}

function questions() {
  return {
    manifest: config.manifest,
    questions: [...config.questions, ...(overlay.supplementalQuestions || [])],
    dimensions: config.dimensions
  };
}

function orchestrate(args = {}) {
  return orchestrator.orchestrate({ overlay, ...args });
}

module.exports = { evaluateCostIq, metadata, questions, orchestrate, RELEASE_MANIFEST };
