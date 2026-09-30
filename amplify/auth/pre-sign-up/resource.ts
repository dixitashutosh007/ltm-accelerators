import { defineFunction } from '@aws-amplify/backend';

export const preSignUp = defineFunction({
  name: 'auth-pre-sign-up',
  entry: './handler.ts'
});
