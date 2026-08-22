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
    {
      command: 'cd backend && node server.js',
      port: 5000,
      reuseExistingServer: true,
      // Cold start includes better-sqlite3 load + migrations; give it room.
      timeout: 60000,
      // NODE_ENV=test makes the auth API return devCode for MFA challenges
      // so e2e can complete privileged logins without a mailbox.
      env: { ...process.env, NODE_ENV: 'test' },
    },
    {
      command: 'npx http-server . -p 8000 -c-1 --cors',
      port: 8000,
      reuseExistingServer: true,
      timeout: 60000,
    },
  ],
});
