'use strict';
const fs=require('fs');
const path=require('path');

const outputsPath=path.resolve('amplify_outputs.json');
if(!fs.existsSync(outputsPath)) throw new Error('Amplify outputs file not found. Accelerator API endpoints cannot be configured.');

const outputs=JSON.parse(fs.readFileSync(outputsPath,'utf8'));
const endpoint=outputs && outputs.custom && outputs.custom.apiUrl;
if(typeof endpoint!=='string'||!endpoint) throw new Error('Amplify custom.apiUrl output is missing.');

const safe=endpoint.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
const target=path.resolve('Accelerators/cost-iq-runtime-config.js');
fs.writeFileSync(target,"window.COST_IQ_API='"+safe+"';\nwindow.RESILIENCE_IQ_API='"+safe+"';\n");
console.log('Generated accelerator runtime API configuration:',endpoint);
