const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e',
  timeout: 30000,
  expect: { timeout: 10000 },
  fullyParallel: true,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:8000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    { command: 'cd backend && node server.js', port: 5000, reuseExistingServer: true, timeout: 10000 },
    { command: 'npx http-server . -p 8000 -c-1 --cors', port: 8000, reuseExistingServer: true, timeout: 10000 },
  ],
});
