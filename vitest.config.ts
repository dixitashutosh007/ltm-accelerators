import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/**/test/**/*.test.ts', 'amplify/functions/**/*.spec.ts'],
    environment: 'node',
    // GitHub runners: the long FinOps IQ property files starve the main process
    // and its worker RPC times out ("Timeout calling onTaskUpdate").
    maxWorkers: process.env.CI ? 2 : undefined
  }
});
