import { defineConfig } from 'vite';

export default defineConfig({
  assetsInclude: ['**/*.html'],
  test: {
    globals: true,
    environment: 'happy-dom',
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
});
