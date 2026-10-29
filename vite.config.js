/// <reference types="vitest/config" />
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), svelte()],
  // Unit tests (Vitest). The browser tests in tests/ are run by Playwright instead.
  test: {
    include: ['src/**/*.test.js'],
    environment: 'jsdom',
  },
})
