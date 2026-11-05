import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/**/test/**/*.test.ts', 'amplify/functions/**/*.spec.ts', 'amplify/auth/**/*.spec.ts'],
    environment: 'node',
    // GitHub runners have two cores: the long FinOps IQ property files and the Cost IQ report files starve the main
    // process and its worker RPC times out ("Timeout calling onTaskUpdate") even though every test passes. One worker
    // leaves a core for the main process.
    maxWorkers: process.env.CI ? 1 : undefined
  }
});
