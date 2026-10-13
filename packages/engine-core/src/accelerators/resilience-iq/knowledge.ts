import questionBank from "../../../../../resilience-iq/knowledge/question-bank.json" with { type: "json" };
import decisionTree from "../../../../../resilience-iq/knowledge/decision-tree.json" with { type: "json" };
import scoringModel from "../../../../../resilience-iq/knowledge/scoring-model.json" with { type: "json" };
import blueprintEngine from "../../../../../resilience-iq/knowledge/blueprint-engine.json" with { type: "json" };
import patterns from "../../../../../resilience-iq/knowledge/patterns.json" with { type: "json" };
import implementationMappings from "../../../../../resilience-iq/knowledge/implementation-mappings.json" with { type: "json" };
import executiveReport from "../../../../../resilience-iq/knowledge/executive-report.json" with { type: "json" };

// Only files the engine reads. Design references it does not read are in resilience-iq/design/.
export const resilienceKnowledge = {
  questionBank,
  decisionTree,
  scoringModel,
  blueprintEngine,
  patterns,
  implementationMappings,
  executiveReport
} as const;

export type ResilienceKnowledge = typeof resilienceKnowledge;
