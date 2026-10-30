import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  reporter: 'list',
  use: {
    // The installed Chrome, so no browser download is needed.
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
    // The service worker only exists in builds, so the offline test runs on one served like on GitHub Pages.
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
