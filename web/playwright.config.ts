import { defineConfig, devices } from '@playwright/test';

/**
 * E2E accessibility + keyboard journey tests. Runs against the dev server.
 * Start the app (`npm run dev`) in another terminal, or let Playwright start it.
 */
export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://localhost:5173',
    ...devices['Desktop Chrome']
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120_000
  }
});
