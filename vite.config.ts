import { defineConfig } from 'vite';

export default defineConfig({
  assetsInclude: ['**/*.html'],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
});
