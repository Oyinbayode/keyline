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
  /*
   * Each worker runs its own browser, and a cold Firefox takes up to ~20 s to
   * load its first story from the built Storybook. At the default (half the
   * cores) a busy 8-core machine starved those first loads past the 30 s test
   * timeout. Three workers locally and two in CI (GitHub's runners have four
   * cores) keep every worker fed without contending for the CPU.
   */
  workers: isCI ? 2 : 3,
  // Room for that cold first load; a story that is genuinely broken still fails within a minute.
  timeout: 60_000,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${String(port)}`,
    trace: 'retain-on-failure',
    navigationTimeout: 45_000,
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
