'use strict';
/**
 * Writes Accelerators/assets/runtime-config.js from amplify_outputs.json (produced by the
 * backend phase of the Amplify build). Pages read window.LTM_CONFIG for the API address,
 * Cognito settings and feature flags.
 *
 * If the outputs file or the API URL is missing the build fails, rather than shipping a
 * frontend that points at the wrong API.
 */
const fs = require('fs');
const path = require('path');

const outputsPath = path.resolve(process.argv[2] || 'amplify_outputs.json');
const target = path.resolve('Accelerators/assets/runtime-config.js');

if (!fs.existsSync(outputsPath)) {
  throw new Error(`Amplify outputs not found at ${outputsPath}; cannot configure the frontend API.`);
}
const outputs = JSON.parse(fs.readFileSync(outputsPath, 'utf8'));
const custom = (outputs && outputs.custom) || {};
if (typeof custom.apiUrl !== 'string' || !/^https:\/\//.test(custom.apiUrl)) {
  throw new Error('Amplify custom.apiUrl output is missing or not an https URL.');
}
const cognito = custom.cognito || {};
for (const key of ['region', 'userPoolId', 'clientId']) {
  if (!cognito[key]) throw new Error(`Amplify custom.cognito.${key} output is missing.`);
}

const config = {
  apiBase: custom.apiUrl.replace(/\/+$/, ''),
  cognito: { region: cognito.region, userPoolId: cognito.userPoolId, clientId: cognito.clientId },
  features: {
    // Cost IQ stays hidden until its scoring and AI routes are verified on the new API.
    costIq: String(process.env.LTM_FEATURE_COST_IQ || 'false').toLowerCase() === 'true'
  },
  generatedAt: new Date().toISOString()
};

fs.writeFileSync(target,
  '// Generated at build time by scripts/generate-runtime-config.cjs. Do not edit by hand.\n' +
  'window.LTM_CONFIG = ' + JSON.stringify(config, null, 2) + ';\n');
console.log('Generated frontend runtime config:', config.apiBase, `(Cost IQ ${config.features.costIq ? 'enabled' : 'hidden'})`);
