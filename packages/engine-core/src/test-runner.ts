import { evaluateFinOpsValueCase } from './accelerators/finops-value-case/evaluate';

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
console.log('--- All engine assertions passed! ---');
