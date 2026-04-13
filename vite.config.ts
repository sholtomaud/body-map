import { defineConfig } from 'vite';
import { playwright } from '@vitest/browser-playwright';

export default defineConfig({
  assetsInclude: ['**/*.html'],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  test: {
    globals: true,
    browser: {
      enabled: true,
      instances: [{ browser: 'chromium' }],
      provider: playwright(),
      headless: true,
    },
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
});
