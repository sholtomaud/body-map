import { defineConfig } from 'vite';

export default defineConfig({
  assetsInclude: ['**/*.html'],
  test: {
    globals: true,
    browser: {
      enabled: true,
      name: 'chromium',
      provider: 'playwright',
      headless: true,
    },
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
});
