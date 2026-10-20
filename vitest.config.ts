import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/**/test/**/*.test.ts', 'amplify/functions/**/*.spec.ts'],
    environment: 'node'
  }
});
