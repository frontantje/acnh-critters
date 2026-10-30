/// <reference types="vitest/config" />
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // Relative asset paths, so the build works under any path, e.g. /acnh-critters/ on GitHub Pages.
  base: './',
  plugins: [
    tailwindcss(),
    svelte(),
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
        // Includes the 200 critter icons, so they work offline too.
        globPatterns: ['**/*.{js,css,html,png}'],
      },
      // The pattern above already covers the manifest's icons.
      includeManifestIcons: false,
    }),
  ],
  // Only src/, since tests/ holds the Playwright browser tests.
  test: {
    include: ['src/**/*.test.js'],
    environment: 'jsdom',
  },
})
