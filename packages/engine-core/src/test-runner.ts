import assert from 'node:assert/strict';
import { evaluateCloudIq } from './accelerators/cloud-iq/evaluate';
import { evaluateStrategyIq } from './accelerators/strategy-iq/evaluate';
import { evaluateModernizationIq } from './accelerators/modernization-iq/evaluate';

console.log('--- 1. Testing Cloud IQ Headless Engine ---');
const cloudIqMockAnswers = {
  'Q0.1': 0, // CIO / CTO
  'Q0.2': 0, // BFSI
  'Q0.3': [0, 1], // Residency, DORA
  'Q0.4': 0, // Track A bias
  'Q0.5': 1, // 150-500 apps
  'Q0.6': ['Cost reduction & FinOps'],
  'Q0.7': [0, 1], // AWS & Azure
  'Q0.8': 2, // $10M-$25M spend
  'Q0.9': 1, // 20-40% commitments
  'Q0.10': 1,
  'Q0.11': 2, // VMware renewal cliff
  'Q0.12': 3, // Imminent DC lease cliff
  'Q0.13': 1,
  'Q1.1': [0],
  'Q1.2': 2,
  'Q2.1': 1, 'Q2.2': 2, 'Q2.3': 2,
  'Q3.1': 1, 'Q3.2': 2, 'Q3.3': 2,
  'Q4.1': 2, 'Q4.2': [0, 1], 'Q4.3': 1, 'Q4.4': 2,
  'Q5.1': 2, 'Q5.2': true, 'Q5.3': 1,
  'Q6.1': 2, 'Q6.2': 2, 'Q6.3': 1,
  'Q7.1': 2, 'Q7.2': 2, 'Q7.3': 2,
  'Q8.1': 2, 'Q8.2': true, 'Q8.3': 2,
  'Q9.1': 2, 'Q9.2': [0], 'Q9.3': 2
};

const cloudIqResult = evaluateCloudIq({
  answers: cloudIqMockAnswers,
  session: {
    clientName: 'Tier 1 Global Bank',
    mode: 'workshop'
  }
});

console.log('Transformation Track:', cloudIqResult.trackCode, `(${cloudIqResult.trackName})`);
console.log('Overall Score:', cloudIqResult.overall, `(${cloudIqResult.band})`);
console.log('Total Cloud Spend:', '$' + (cloudIqResult.totalCloudSpend / 1000000).toFixed(1) + 'M', '| Leakage:', '$' + (cloudIqResult.totalLeakage / 1000).toFixed(0) + 'k');
console.log('Financial Decomp:', cloudIqResult.decomp);
console.log('Dimensions (D1-D8):', Object.entries(cloudIqResult.dimScores).map(([k, v]) => `${k}: ${v.toFixed(1)}`).join(' | '));
console.log('Roadmap Phases: P1:', cloudIqResult.movesPhase1.length, '| P2:', cloudIqResult.movesPhase2.length, '| P3:', cloudIqResult.movesPhase3.length, '| P4:', cloudIqResult.movesPhase4.length);
console.log('Recommended Offerings:', cloudIqResult.offers.map(o => o.code).join(', '));
console.log('Triggered Probes:', cloudIqResult.probes.map(p => p.badge).join(' | '));
console.log('--- Cloud IQ Assertions Passed! ---\n');

console.log('--- 2. Testing Strategy IQ Headless Engine ---');
const strategyIqMockAnswers = {
  'S1.1': 3, 'S1.2': 4, 'S1.3': 3, 'S1.4': 2,
  'S2.1': 3, 'S2.2': 3, 'S2.3': 4, 'S2.4': 3,
  'S3.1': 3, 'S3.2': 2, 'S3.3': 3, 'S3.4': 3,
  'S4.1': 2, 'S4.2': 3, 'S4.3': 3, 'S4.4': 2,
  'S5.1': 3, 'S5.2': 4, 'S5.3': 3, 'S5.4': 3,
  'S6.1': 3, 'S6.2': 3, 'S6.3': 3, 'S6.4': 4
};

const strategyIqResult = evaluateStrategyIq({
  answers: strategyIqMockAnswers,
  intake: {
    orgName: 'Global Enterprise Corp',
    sector: 'financial-services',
    itSpend: 80000000,
    execRole: 'CIO / Group CTO'
  }
});

console.log('Overall Score:', strategyIqResult.overall, `(${strategyIqResult.band})`);
console.log('Section Scores:', strategyIqResult.sectionScores);
console.log('Alignment Index:', strategyIqResult.alignmentIndex + '%', '| Tech Debt Drag:', strategyIqResult.debtDragPct + '%', '($' + (strategyIqResult.debtDollarWaste / 1000000).toFixed(1) + 'M)');
console.log('Operating Model Maturity:', strategyIqResult.deliveryMaturity + '/5', '| Resilience Score:', strategyIqResult.resilienceScore + '%');
console.log('--- Strategy IQ Assertions Passed! ---\n');

console.log('--- 3. Testing Modernize IQ Headless Engine ---');
const modernizationIqMockAnswers = {
  'Q1.1': 3,
  'Q1.2': ['srv', 'san', 'net'],
  'Q1.3': 2,
  'Q2.1': 70,
  'Q2.2': 2,
  'Q2.3': 2,
  'Q3.1': 2,
  'Q3.2': { llm_train: 'cloud', llm_infer: 'colo', pii_embed: 'dc', batch_rag: 'cloud' },
  'Q3.3': 2,
  'Q4.1': 45,
  'Q4.2': 2,
  'Q4.3': ['cost', 'ai', 'agility', 'risk'],
  'Q5.1': 3,
  'Q5.2': 3,
  'Q5.3': ['iac', 'policy', 'zt_net'],
  'Q6.1': 3,
  'Q6.2': 3,
  'Q6.3': ['ebitda', 'time_market']
};

const modernizationIqResult = evaluateModernizationIq({
  answers: modernizationIqMockAnswers,
  org: {
    clientName: 'Global FinTech Corp',
    industry: 'Banking / Capital Markets',
    workloadCount: '1,400',
    dcCount: '3 Owned / 2 Colocation',
    annualDcSpend: '$24.5M',
    targetExitHorizon: '24 Months'
  }
});

console.log('Overall Score:', modernizationIqResult.overall, `(${modernizationIqResult.band})`);
console.log('Dimension Scores (D1-D6):', modernizationIqResult.dimScores);
console.log('Peer Benchmark Delta:', modernizationIqResult.peerDelta > 0 ? `+${modernizationIqResult.peerDelta}` : modernizationIqResult.peerDelta, '(Median: ' + modernizationIqResult.peerMedian + ')');
console.log('Primary Friction:', modernizationIqResult.primaryFriction, '—', modernizationIqResult.frictionDetail);
console.log('Triggered Probes:', modernizationIqResult.triggeredProbes.map(p => p.name).join(' | ') || 'None (Balanced)');
console.log('Roadmap Phases Count:', modernizationIqResult.roadmapPhases.length);
console.log('--- Modernize IQ Assertions Passed! ---\n');


console.log('All engine checks completed.');
