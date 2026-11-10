'use strict';

const canon = require('./canon/costiq-engine-v10.cjs');
const config = require('./canon/config/master-v6.6.json');
const calibration = require('./canon/config/finding-activation-calibration-v7.1.1.json');
const opportunityGates = require('./canon/config/opportunity-recommendation-gates-v7.1.0.json');
const RELEASE_MANIFEST = require('./canon/RELEASE_MANIFEST.json');
const { cioContext } = require('./cio-context.cjs');

function evaluateCostIq({ answers = {}, scope = null, evidence = {}, feasibilityEvidence = {}, options = {} } = {}) {
  const result = canon.evaluate(config, {
    calibration,
    opportunityGates,
    answers,
    selectedAreas: Array.isArray(scope?.selectedAreas) ? scope.selectedAreas : null,
    options: { ...options, evidence, feasibilityEvidence }
  });
  // What the client said about their context, priorities and hotspots, set against the findings (CQ12 slice 2). Moves no score.
  return { ...result, cio: cioContext(answers, result.findings) };
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

// The questions a run is asked and the ones answered, by the same selection the engine counts completeness over.
function scopeCounts({ answers = {}, scope = null } = {}) {
  const shown = canon.shownQuestionIds(config, Array.isArray(scope?.selectedAreas) ? scope.selectedAreas : null, answers);
  const has = id => answers[id] != null && answers[id] !== '' && !(Array.isArray(answers[id]) && answers[id].length === 0);
  return { shown: shown.size, answered: [...shown].filter(has).length };
}

module.exports = { evaluateCostIq, metadata, questions, scopeCounts, RELEASE_MANIFEST };
