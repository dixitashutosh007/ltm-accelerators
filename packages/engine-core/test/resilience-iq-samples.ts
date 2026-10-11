/**
 * Resilience IQ sample clients, shared by the unit tests (golden outputs) and the browser tests.
 * Answers are exactly what the page sends: option labels, EX-05 as its dependency matrix.
 */
// Chosen to cover each path through the engine.
export const ARCHETYPES: Record<string, Record<string, unknown>> = {
  'regulated-bank-tested': {
    'EX-01': ['Customer-facing services', 'Regulatory/financial reporting'], 'EX-02': '<15 minutes', 'EX-03': '<15 minutes', 'EX-04': 'Near-zero',
    'EX-05': { Applications: 'Validated', Data: 'Validated', Infrastructure: 'Validated', People: 'Partial', 'Third parties': 'Partial' },
    'EX-06': 'Yes, proven by testing', 'EX-07': 'Within 3 months', 'EX-08': 'Yes', 'EX-09': 'Yes, tested', 'EX-10': 'Yes, but alternatives exist',
    'EX-11': 'Moderate concentration', 'EX-12': 'No known SPOFs', 'EX-13': 'Yes, proven', 'EX-14': 'Yes, exercised', 'EX-15': 'Yes, with metrics and actions',
    'EX-16': 'Yes, regularly', 'EX-17': 'Yes, tested', 'EX-18': ['AWS', 'On-premises'], 'EX-19': 'Yes, isolated alternate path exists', 'EX-20': 'High — independently validated'
  },
  'retailer-untested-gated': {
    'EX-01': ['Revenue-generating services', 'Supply-chain/operations services'], 'EX-02': '1-4 hours', 'EX-03': '1-4 hours', 'EX-04': '15-60 minutes',
    'EX-05': { Applications: 'Partial', Data: 'Stale', Infrastructure: 'Partial', People: 'No mapping', 'Third parties': 'Stale' },
    'EX-06': 'Likely, but not recently tested', 'EX-07': '1-2 years ago', 'EX-08': 'Potentially', 'EX-09': 'Recoverable but not immutable',
    'EX-10': 'Yes, with no viable alternative', 'EX-11': 'High concentration', 'EX-12': 'Critical SPOFs exist', 'EX-13': 'Partially', 'EX-14': 'Partially',
    'EX-15': 'Yes, periodic review', 'EX-16': 'Technical tests only', 'EX-17': 'No', 'EX-18': ['Azure', 'SaaS'], 'EX-19': 'Partially',
    'EX-20': 'Medium — documented but not fully tested'
  },
  'objectives-unknown': {
    'EX-01': ['Workforce-critical services'], 'EX-02': 'Unknown', 'EX-03': 'Unknown', 'EX-04': 'Unknown',
    'EX-05': { Applications: 'No mapping', Data: 'No mapping', Infrastructure: 'Partial', People: 'No mapping', 'Third parties': 'No mapping' },
    'EX-06': 'Unknown', 'EX-07': 'Unknown', 'EX-08': 'Unknown', 'EX-09': 'Unknown', 'EX-10': 'Unknown', 'EX-11': 'Unknown', 'EX-12': 'Unknown',
    'EX-13': 'No', 'EX-14': 'No', 'EX-15': 'No', 'EX-16': 'No', 'EX-17': 'No', 'EX-18': ['On-premises'], 'EX-19': 'No', 'EX-20': 'Unknown'
  },
  'empty': {}
};
