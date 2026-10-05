import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env } from '$amplify/env/evaluate-cost-iq';
import type { Schema } from '../../data/resource';
import type { CostIqAssessmentRepository, CostIqAssessmentRecord } from './repository';

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
Amplify.configure(resourceConfig, libraryOptions);

const client = generateClient<Schema>();

function unwrap<T>(operation: { data?: T | null; errors?: readonly unknown[] | null }): T {
  if (operation.errors?.length) {
    throw new Error('Amplify Data operation failed.');
  }
  if (operation.data == null) {
    throw new Error('Amplify Data returned no record.');
  }
  return operation.data;
}

export const costIqAssessmentRepository: CostIqAssessmentRepository = {
  async create(record) {
    const result = await client.models.CostIqAssessment.create(record);
    return unwrap(result) as CostIqAssessmentRecord;
  },

  async update(record) {
    const result = await client.models.CostIqAssessment.update(record);
    return unwrap(result) as CostIqAssessmentRecord;
  },

  async get(assessmentId) {
    const result = await client.models.CostIqAssessment.get({ assessmentId });
    if (result.errors?.length) throw new Error('Amplify Data operation failed.');
    return (result.data || null) as CostIqAssessmentRecord | null;
  },

  async list() {
    const items: CostIqAssessmentRecord[] = [];
    let nextToken: string | null | undefined = undefined;

    do {
      const result = await client.models.CostIqAssessment.list({
        limit: 1000,
        nextToken
      });
      if (result.errors?.length) throw new Error('Amplify Data operation failed.');
      items.push(...((result.data || []) as CostIqAssessmentRecord[]));
      nextToken = result.nextToken;
    } while (nextToken);

    return items;
  }
};
