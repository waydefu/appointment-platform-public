import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@appointment-platform/contracts': fileURLToPath(
        new URL('./packages/contracts/src/index.ts', import.meta.url)
      ),
      '@appointment-platform/domain': fileURLToPath(
        new URL('./packages/domain/src/index.ts', import.meta.url)
      )
    }
  },
  test: {
    include: ['apps/*/src/**/*.test.ts', 'packages/*/src/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    pool: 'forks',
    maxWorkers: 1,
    testTimeout: 10_000
  }
});
