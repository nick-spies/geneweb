// @ts-check
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: '.',
  testMatch: '*.spec.js',
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:2317',
    browserName: 'firefox',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'off',
  },
  reporter: [['list']],
});
