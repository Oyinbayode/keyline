import { defineConfig, devices } from '@playwright/test';

const port = 6007;
const isCI = Boolean(process.env.CI);

/*
 * Runs against the built Storybook, so the stories readers see in the docs are
 * the same markup the keyboard tests drive. Build it first with
 * `pnpm build:storybook`.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${String(port)}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
  webServer: {
    command: `pnpm exec vite preview --outDir storybook-static --port ${String(port)} --strictPort`,
    port,
    reuseExistingServer: !isCI,
  },
});
