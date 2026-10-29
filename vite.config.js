/// <reference types="vitest/config" />
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Relative asset paths, so the build works under any path, e.g. GitHub Pages'
  // https://frontantje.github.io/acnh-critters/. Dev and preview still serve at /.
  base: './',
  plugins: [tailwindcss(), svelte()],
  // Unit tests (Vitest). The browser tests in tests/ are run by Playwright instead.
  test: {
    include: ['src/**/*.test.js'],
    environment: 'jsdom',
  },
})
