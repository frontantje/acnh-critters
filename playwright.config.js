import { defineConfig } from '@playwright/test';

// Browser tests (see tests/). Run with `npm run test:e2e`. They use the installed
// Chrome, so no browser download is needed.
//
// Two projects:
// - "dev": almost all tests, against the dev server (reused if already running on 5173).
// - "built": the offline test, against a fresh production build served under
//   /acnh-critters/ like on GitHub Pages, since the service worker only exists in builds.
export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  reporter: 'list',
  use: {
    channel: 'chrome',
    locale: 'en-US',
    timezoneId: 'Europe/Berlin',
    viewport: { width: 1280, height: 800 },
  },
  projects: [
    {
      name: 'dev',
      testIgnore: /offline\.spec\.js/,
      use: { baseURL: 'http://localhost:5173' },
    },
    {
      name: 'built',
      testMatch: /offline\.spec\.js/,
      use: { baseURL: 'http://localhost:4173/acnh-critters/' },
    },
  ],
  webServer: [
    {
      command: 'npm run dev -- --port 5173 --strictPort',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
    },
    {
      command: 'npm run build && npx vite preview --port 4173 --strictPort --base /acnh-critters/',
      url: 'http://localhost:4173/acnh-critters/',
      // Always a fresh build, never a leftover preview of an older one.
      reuseExistingServer: false,
    },
  ],
});
