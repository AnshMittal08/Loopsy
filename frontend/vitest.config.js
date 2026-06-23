import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Frontend test runner: jsdom for component tests (RTL), plus the pure-logic
// unit tests. Test globals are NOT injected — files import { test, expect }
// from 'vitest' so ESLint stays happy without extra config.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./test/setup.js'],
    include: ['test/**/*.test.{js,jsx}'],
  },
});
