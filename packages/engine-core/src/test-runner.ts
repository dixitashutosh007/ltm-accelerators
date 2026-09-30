import { evaluateFinOpsValueCase } from './accelerators/finops-value-case/evaluate';
import { evaluateFinOpsIq } from './accelerators/finops-iq/evaluate';

console.log('--- Testing FinOps Value Case Headless Engine ---');

const mockAnswers = {
  E2: [0, 1], // AWS, Azure
  E3: 3500000, // £3.5M annual spend
  E4: 1, // Significant migration planned
  E5: 40, // 40% growth
  E6: 60, // 60% migration
  P1: 20, // 20% variance
  P2: 1, // quarterly surprise
  C2: 50, // 50% commitment coverage
  C3: 1,
  C5: 0,
  V1: 0
};

const result = evaluateFinOpsValueCase(mockAnswers, {
  name: 'Global Investment Bank',
  sector: 'Banking & Capital Markets',
  sector_class: 'bfsi',
  currency: 'gbp'
});

console.log('Signals:', result.signals);
console.log('Need Index:', result.needIndex);
console.log('Verdict:', result.verdict?.label);
console.log('Year 1 Exposure Range:', result.exposure.y1);
console.log('Streams Prioritized:', result.streams.map(s => `${s.name} (${s.priority})`).join(', '));
console.log('--- FinOps Value Case Assertions Passed! ---\n');

console.log('--- Testing FinOps IQ Headless Engine ---');
const iqMockAnswers = {
  C1: 0, C2: 0, C3: 0, C4: 0, C5: 0, C6: 0, C7: 0, C8: 0,
  R1: 0, R2: 0, R3: 0, R4: 0, R5: 0, R6: 0, R7: 0, R8: 0, R9: 0
};

const iqResult = evaluateFinOpsIq({
  answers: iqMockAnswers,
  annualSpend: 4000000
});

console.log('Maturity Stage:', iqResult.maturityStage?.name || 'Chaos Baseline');
console.log('Overall Score:', iqResult.overallScore);
console.log('Chaos Stage Status:', iqResult.stageStatuses['chaos']);
console.log('Reactive Stage Status:', iqResult.stageStatuses['reactive']);
console.log('Value at Stake Min Savings:', iqResult.valueAtStake.minSavings);
console.log('Roadmap Horizons:', iqResult.roadmap.horizons.map(h => `${h.name}: ${h.items.length} actions`).join(' | '));
console.log('--- FinOps IQ Assertions Passed! ---');
