import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:17000',
    headless: true,
    viewport: { width: 800, height: 600 },
  },
});
