'use strict';

const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '../../../../../../ltm-core/cost-iq/v10_reconstruction');
const ENGINE_PATH = path.join(ROOT, 'engine/costiq-phase-a-engine-v10.js');

function loadJson(file) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'config', file), 'utf8'));
}

// The Amplify/Lambda deployment copies the canonical Cost IQ release artifacts
// into this function package at build time. No scoring logic is duplicated here.
const config = loadJson('master-v6.6.json');
const overlay = loadJson('finops-overlay-v7.1.0.json');
const calibration = loadJson('finding-activation-calibration-v7.1.0.json');
const opportunityGates = loadJson('opportunity-recommendation-gates-v7.1.0.json');
const engine = require(ENGINE_PATH);

function evaluateCostIq({ answers = {}, scope = null, capabilityScores = {}, evidence = {}, feasibilityEvidence = {}, options = {} } = {}) {
  return engine.evaluate(config, {
    overlay,
    calibration,
    opportunityGates,
    answers,
    scope: scope ? {
      ...scope,
      capabilityScores
    } : null,
    capabilityScores,
    options: {
      ...options,
      evidence,
      feasibilityEvidence
    }
  });
}

module.exports = { evaluateCostIq };
