import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { manageResilienceEvidenceFunction } from '../functions/manage-resilience-evidence/resource';

/**
 * Defines DynamoDB tables via Amplify Data Schema:
 * 1. Accelerator: Registry of accelerators (Q&A vs Q&A + Scoring)
 * 2. QuestionBank: Versioned questions for each accelerator
 * 3. ScoringModel: Private scoring models, weights, and rules
 * 4. AssessmentSubmission: Client answers and computed boardroom results
 * 5. ResilienceEvidence: Governed evidence metadata and validation lifecycle for Resilience IQ
 * 6. UserAllowlist: Pre-approved email directory with RBAC roles

 */
const schema = a.schema({
  Accelerator: a
    .model({
      acceleratorId: a.string().required(),
      name: a.string().required(),
      category: a.string(),
      description: a.string(),
      hasScoringEngine: a.boolean().required(),
      status: a.string().required(),
      version: a.string().required(),
      themeConfig: a.json()
    })
    .authorization(allow => [
      allow.group('Admin').to(['create', 'read', 'update', 'delete']),
      allow.group('Consultant').to(['read']),
      allow.authenticated().to(['read'])
    ]),

  QuestionBank: a
    .model({
      acceleratorId: a.string().required(),
      version: a.string().required(),
      publicQuestionsJson: a.string().required(),
      isPublished: a.boolean().required()
    })
    .authorization(allow => [
      allow.group('Admin').to(['create', 'read', 'update', 'delete']),
      allow.group('Consultant').to(['read']),
      allow.authenticated().to(['read'])
    ]),

  ScoringModel: a
    .model({
      acceleratorId: a.string().required(),
      version: a.string().required(),
      signalsJson: a.string().required(),
      benchmarksJson: a.string().required(),
      dependenciesJson: a.string(),
      isPublished: a.boolean().required()
    })
    .authorization(allow => [
      allow.group('Admin').to(['create', 'read', 'update', 'delete']),
      allow.group('Consultant').to(['read'])
    ]),

  AssessmentSubmission: a
    .model({
      acceleratorId: a.string().required(),
      clientName: a.string().required(),
      clientSector: a.string(),
      clientCurrency: a.string(),
      respondentEmail: a.string().required(),
      answersJson: a.string().required(),
      computedResultsJson: a.string().required()
    })
    .authorization(allow => [
      allow.group('Admin').to(['create', 'read', 'update', 'delete']),
      allow.group('Consultant').to(['create', 'read', 'update', 'delete']),
      allow.owner().to(['create', 'read'])
    ]),

  ResilienceEvidence: a
    .model({
      assessmentId: a.string().required(),
      evidenceId: a.string().required(),
      evidence: a.string().required(),
      type: a.string().required(),
      status: a.string().required(),
      purpose: a.string().required(),
      validationCriteriaJson: a.string().required(),
      affectedGapsJson: a.string().required(),
      affectsRecommendation: a.boolean().required(),
      evidenceLocation: a.string(),
      evidenceChecksum: a.string(),
      validationOutcome: a.string(),
      submittedBy: a.string(),
      validatedBy: a.string(),
      validatedAt: a.datetime(),
      rejectedReason: a.string()
    })
    .authorization(allow => [
      allow.group('Admin').to(['create', 'read', 'update', 'delete']),
      allow.group('Consultant').to(['create', 'read', 'update', 'delete'])
    ]),

  UserAllowlist: a
    .model({
      email: a.string().required(),
      role: a.string().required(), // 'Admin' | 'Consultant'
      addedBy: a.string(),
      notes: a.string()
    })
    .authorization(allow => [
      allow.group('Admin').to(['create', 'read', 'update', 'delete'])
    ])
}).authorization(allow => [
  allow.resource(manageResilienceEvidenceFunction)
]);

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool'
  }
});
