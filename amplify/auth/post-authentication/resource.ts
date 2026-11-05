import { defineFunction } from '@aws-amplify/backend';

// ACTIVITY_TABLE and write permission on that one table are added in backend.ts, where the table is created.
export const postAuthentication = defineFunction({
  name: 'auth-post-authentication',
  resourceGroupName: 'auth',
  entry: './handler.ts',
  timeoutSeconds: 10
});
