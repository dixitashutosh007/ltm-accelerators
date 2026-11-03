'use strict';

const canon = require('./canon/costiq-engine-v10.cjs');
const config = require('./canon/config/master-v6.6.json');
const calibration = require('./canon/config/finding-activation-calibration-v7.1.1.json');
const opportunityGates = require('./canon/config/opportunity-recommendation-gates-v7.1.0.json');
const RELEASE_MANIFEST = require('./canon/RELEASE_MANIFEST.json');

function evaluateCostIq({ answers = {}, scope = null, evidence = {}, feasibilityEvidence = {}, options = {} } = {}) {
  return canon.evaluate(config, {
    calibration,
    opportunityGates,
    answers,
    selectedAreas: Array.isArray(scope?.selectedAreas) ? scope.selectedAreas : null,
    options: { ...options, evidence, feasibilityEvidence }
  });
}

function metadata() {
  return {
    product: 'Cost IQ',
    release: RELEASE_MANIFEST,
    baseline: {
      questions: config.questions.length,
      dimensions: config.dimensions.length,
      findings: config.findings.length,
      recommendations: config.recommendations.length,
      rules: config.rules?.length || 0
    }
  };
}

function questions() {
  return {
    manifest: config.manifest,
    questions: config.questions,
    dimensions: config.dimensions,
    selection: config.settings.selection
  };
}

module.exports = { evaluateCostIq, metadata, questions, RELEASE_MANIFEST };
