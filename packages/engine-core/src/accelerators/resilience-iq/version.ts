export const RESILIENCE_IQ_VERSION = {
  engine: "1.0.0",
  questionBank: "1.0",
  scoringModel: "1.0",
  decisionTree: "1.0",
  blueprintEngine: "1.0",
  executiveReport: "1.0",
} as const;

export type ResilienceIqVersionManifest = typeof RESILIENCE_IQ_VERSION;
