import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './frontend/e2e',
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
  },
  globalSetup: './frontend/e2e/global-setup.ts',
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
})