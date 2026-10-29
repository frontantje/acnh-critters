import { defineConfig } from '@playwright/test';

// Browser tests (see tests/). Run with `npm test`. They use the installed Chrome,
// so no browser download is needed, and start the dev server unless one is
// already running on port 5173.
export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    channel: 'chrome',
    locale: 'en-US',
    timezoneId: 'Europe/Berlin',
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command: 'npm run dev -- --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
  },
});
