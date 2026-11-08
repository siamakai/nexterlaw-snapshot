import { defineConfig, devices } from '@playwright/test';

// End-to-end tests (spec §6). Run against a LOCAL database in mock mode only:
//   npx prisma dev -d -n snapshot            (local Postgres; then migrate + seed)
//   E2E_DATABASE_URL=postgres://...localhost... npx playwright test
// Uses the installed Google Chrome (no browser download).

const db = process.env.E2E_DATABASE_URL ?? '';
if (db && !/localhost|127\.0\.0\.1/.test(db)) {
  throw new Error('E2E_DATABASE_URL must point at a local database.');
}

export default defineConfig({
  testDir: 'e2e',
  timeout: 180_000,
  expect: { timeout: 30_000 },
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3200',
    channel: 'chrome',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: 'chrome' }, grepInvert: /@phone/ },
    { name: 'phone', use: { ...devices['Pixel 7'], channel: 'chrome' }, grep: /@phone/ },
  ],
  webServer: {
    command: 'npx next dev -p 3200',
    url: 'http://localhost:3200',
    timeout: 240_000,
    reuseExistingServer: true,
    env: {
      DATABASE_URL: db,
      NEXT_PUBLIC_APP_URL: 'http://localhost:3200',
      REPORT_GENERATOR_MODE: 'mock',
      GHL_MODE: 'off',
      NEXT_TELEMETRY_DISABLED: '1',
    },
  },
});
