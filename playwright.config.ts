import { defineConfig, devices } from '@playwright/test';

// End-to-end tests run against the *built* example sites and documentation, plus the minimal
// example in `astro dev` (MyST assets served from Astro's cache, live recompiles):
//   npm run build && npm run examples:build && npm run docs:build && npm run test:e2e
const ci = !!process.env.CI;
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined;

const preview = (workspace: string, port: number) => ({
  command: `npm run preview -w ${workspace} -- --port ${port} --host 127.0.0.1 --ignore-lock`,
  url: `http://127.0.0.1:${port}`,
  reuseExistingServer: !ci,
  timeout: 60_000,
});

export default defineConfig({
  testDir: './e2e',
  forbidOnly: ci,
  retries: ci ? 1 : 0,
  reporter: ci ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], launchOptions: { executablePath } } }],
  webServer: [
    { ...preview('astro-myst-example-book', 4321) },
    { ...preview('astro-myst-example-paper', 4322) },
    { ...preview('astro-myst-docs', 4323), url: 'http://127.0.0.1:4323/astro-myst/' },
    {
      command: 'npm run dev -w astro-myst-example-minimal -- --port 4324 --host 127.0.0.1 --ignore-lock',
      url: 'http://127.0.0.1:4324',
      reuseExistingServer: !ci,
      timeout: 120_000,
    },
  ],
});
