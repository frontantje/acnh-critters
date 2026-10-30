/// <reference types="vitest/config" />
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // Relative asset paths, so the build works under any path, e.g. GitHub Pages'
  // https://frontantje.github.io/acnh-critters/. Dev and preview still serve at /.
  base: './',
  plugins: [
    tailwindcss(),
    svelte(),
    // Installable app that works offline: a service worker (built only, not in
    // dev) keeps the app and all critter icons on the device after the first
    // visit. A new version takes over in the background and shows on the next
    // start.
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'ACNH Critters',
        short_name: 'Critters',
        description: 'Keep track of the fish, insects and sea creatures caught in Animal Crossing: New Horizons.',
        lang: 'en',
        display: 'standalone',
        background_color: '#fffbeb',
        theme_color: '#fffbeb',
        icons: [
          { src: 'app-icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'app-icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'app-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Everything, including the 200 critter icons in public/icons (about 2 MB).
        globPatterns: ['**/*.{js,css,html,png}'],
      },
      // The pattern above already covers the manifest's icons.
      includeManifestIcons: false,
    }),
  ],
  // Unit tests (Vitest). The browser tests in tests/ are run by Playwright instead.
  test: {
    include: ['src/**/*.test.js'],
    environment: 'jsdom',
  },
})
