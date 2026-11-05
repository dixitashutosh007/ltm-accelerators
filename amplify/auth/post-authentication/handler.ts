import type { PostAuthenticationTriggerHandler } from 'aws-lambda';
import { recordLogin } from '../../functions/_shared/activity-recorder.mjs';

// A successful sign-in is recorded for the Activity screen (platform workstream P2): the address and the time, nothing else.
// Best effort: recordLogin never throws, so a problem with the activity table can never stop anyone signing in.
export const createHandler = (record: (email: string) => Promise<void>): PostAuthenticationTriggerHandler => async (event) => {
  await record((event.request.userAttributes?.email || '').toLowerCase().trim());
  return event;
};

export const handler: PostAuthenticationTriggerHandler = (event, context, callback) => createHandler(recordLogin)(event, context, callback);
