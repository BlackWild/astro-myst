import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    // Integration tests run the real mystmd compiler.
    testTimeout: 120_000,
    hookTimeout: 120_000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // Browser scripts, tested end to end with Playwright (e2e/docs.spec.ts).
      exclude: ['src/client/**'],
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      thresholds: { statements: 80, branches: 65, functions: 80, lines: 80 },
    },
  },
});
