import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { manageResilienceAssessmentFunction } from '../functions/manage-resilience-assessment/resource';
import { manageResilienceEvidenceFunction } from '../functions/manage-resilience-evidence/resource';
import { manageFinOpsAssessmentFunction } from '../functions/manage-finops-assessment/resource';
import { manageSovereignAssessmentFunction } from '../functions/manage-sovereign-assessment/resource';
import { sovereignIqReportFunction } from '../functions/sovereign-iq-report/resource';
import { sovereignIqNarrativeFunction } from '../functions/sovereign-iq-narrative/resource';
import { finopsIqReportFunction } from '../functions/finops-iq-report/resource';

/**
 * Defines DynamoDB tables via Amplify Data Schema:
 * 1. Accelerator: Registry of accelerators (Q&A vs Q&A + Scoring)
 * 2. QuestionBank: Versioned questions for each accelerator
 * 3. ScoringModel: Private scoring models, weights, and rules
 * 4. AssessmentSubmission: Client answers and computed boardroom results
 * 5. ResilienceEvidence: Governed evidence metadata and validation lifecycle for Resilience IQ
 * 6. UserAllowlist: Pre-approved email directory with RBAC roles
 * 7. FinOpsIqAssessment: saved FinOps IQ assessments (request, consultant notes, server-computed result)
 * 8. SovereignIqAssessment: saved Sovereign IQ v4 assessments (same shape, no logo)

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

  ResilienceAssessment: a
    .model({
      assessmentId: a.string().required(),
      clientName: a.string().required(),
      clientSector: a.string(),
      respondentEmail: a.string().required(),
      status: a.string().required(),
      questionBankVersion: a.string().required(),
      scoringModelVersion: a.string().required(),
      decisionTreeVersion: a.string().required(),
      blueprintEngineVersion: a.string().required(),
      executiveReportVersion: a.string().required(),
      engineVersion: a.string().required(),
      answersJson: a.string().required(),
      resultJson: a.string(),
      decisionLogJson: a.string(),
      recommendationSensitivityJson: a.string(),
      startedAt: a.datetime().required(),
      completedAt: a.datetime(),
      finalizedAt: a.datetime()
    })
    .authorization(allow => [
      allow.groups(['Admin', 'Consultant']).to(['create', 'read', 'update'])
    ]),

  CostIqAssessment: a
    .model({
      assessmentId: a.string().required(),
      acceleratorId: a.string().required(),
      releaseId: a.string().required(),
      methodologyVersion: a.string().required(),
      status: a.string().required(),
      clientName: a.string(),
      clientSector: a.string(),
      clientCurrency: a.string(),
      selectedAreasJson: a.string().required(),
      answersJson: a.string().required(),
      subjectiveJson: a.string(),
      resultJson: a.string(),
      startedAt: a.datetime().required(),
      updatedAt: a.datetime().required(),
      completedAt: a.datetime()
    })
    .identifier(['assessmentId'])
    .authorization(allow => [
      allow.group('Admin').to(['create', 'read', 'update', 'delete']),
      allow.group('Consultant').to(['create', 'read', 'update', 'delete']),
      allow.owner().to(['create', 'read', 'update'])
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
      evidenceFileKey: a.string(),
      evidenceFileName: a.string(),
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

  // Read and written only by the manage-finops-assessment Lambda, which checks ownership from the caller's JWT.
  FinOpsIqAssessment: a
    .model({
      assessmentId: a.string().required(),
      clientName: a.string().required(),
      clientSector: a.string(),
      respondentEmail: a.string().required(),
      status: a.string().required(),
      mode: a.string().required(),
      engineVersion: a.string().required(),
      requestJson: a.string().required(),
      consultantNotes: a.string(),
      // The client's logo (PNG or JPEG data URL, about 100 KB at most) for the report cover.
      clientLogo: a.string(),
      resultJson: a.string(),
      startedAt: a.datetime().required(),
      completedAt: a.datetime(),
      archivedAt: a.datetime(),
      // Retention (M6): epoch seconds 24 months after the last change; DynamoDB time to live deletes the record then.
      expiresAt: a.integer()
    })
    .identifier(['assessmentId'])
    .authorization(allow => [
      allow.group('Admin').to(['read'])
    ]),

  SovereignIqAssessment: a
    .model({
      assessmentId: a.string().required(),
      clientName: a.string().required(),
      clientSector: a.string(),
      respondentEmail: a.string().required(),
      status: a.string().required(),
      mode: a.string().required(),
      engineVersion: a.string().required(),
      requestJson: a.string().required(),
      consultantNotes: a.string(),
      resultJson: a.string(),
      // AI narrative (PLAN S9): the consultant's per-engagement switch and the last grounded run.
      aiEnabled: a.boolean(),
      narrativeJson: a.string(),
      startedAt: a.datetime().required(),
      completedAt: a.datetime(),
      archivedAt: a.datetime(),
      // Epoch seconds 24 months after the last change; DynamoDB time to live deletes the record then.
      expiresAt: a.integer()
    })
    .identifier(['assessmentId'])
    .authorization(allow => [
      allow.group('Admin').to(['read'])
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
})
.authorization(allow => [
  allow.resource(manageResilienceAssessmentFunction).to(['query', 'mutate']),
  allow.resource(manageResilienceEvidenceFunction).to(['query', 'mutate']),
  allow.resource(manageFinOpsAssessmentFunction).to(['query', 'mutate']),
  allow.resource(manageSovereignAssessmentFunction).to(['query', 'mutate']),
  allow.resource(sovereignIqReportFunction).to(['query']),
  allow.resource(sovereignIqNarrativeFunction).to(['query', 'mutate']),
  // The report reads completed assessments only.
  allow.resource(finopsIqReportFunction).to(['query'])
]);

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool'
  }
});
