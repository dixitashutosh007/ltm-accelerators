import questionBank from "../../../../../resilience-iq/knowledge/question-bank.json" with { type: "json" };
import decisionTree from "../../../../../resilience-iq/knowledge/decision-tree.json" with { type: "json" };
import scoringModel from "../../../../../resilience-iq/knowledge/scoring-model.json" with { type: "json" };
import recommendationModel from "../../../../../resilience-iq/knowledge/recommendation-model.json" with { type: "json" };
import blueprintEngine from "../../../../../resilience-iq/knowledge/blueprint-engine.json" with { type: "json" };
import patterns from "../../../../../resilience-iq/knowledge/patterns.json" with { type: "json" };
import implementationMappings from "../../../../../resilience-iq/knowledge/implementation-mappings.json" with { type: "json" };
import assessmentModel from "../../../../../resilience-iq/knowledge/assessment-model.json" with { type: "json" };

export const resilienceKnowledge = {
  questionBank,
  decisionTree,
  scoringModel,
  recommendationModel,
  blueprintEngine,
  patterns,
  implementationMappings,
  assessmentModel
} as const;

export type ResilienceKnowledge = typeof resilienceKnowledge;
