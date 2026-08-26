import { defineConfig, devices } from '@playwright/test';

const isPwa = process.env.PLAYWRIGHT_PWA === '1';
const port = isPwa ? 4173 : 3000;
const baseURL = `http://127.0.0.1:${port}`;
const viteCommand = 'node node_modules/vite/bin/vite.js';

export default defineConfig({
  testDir: './e2e',
  testMatch: isPwa ? '**/*.pwa.spec.js' : '**/*.spec.js',
  testIgnore: isPwa ? undefined : '**/*.pwa.spec.js',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  reporter: process.env.CI ? [['dot'], ['html', { open: 'never' }]] : 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    serviceWorkers: isPwa ? 'allow' : 'block',
  },
  projects: [
    {
      name: isPwa ? 'pwa' : 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        serviceWorkers: isPwa ? 'allow' : 'block',
      },
    },
  ],
  webServer: {
    command: isPwa
      ? `${viteCommand} preview --host 127.0.0.1 --port 4173`
      : `${viteCommand} --host 127.0.0.1 --port 3000 --open=false`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      VITE_API_BASE: '/api-v1/api.php',
      REACT_APP_API_BASE: '/api-v1/api.php',
      VITE_FIREBASE_API_KEY: '',
      VITE_FIREBASE_AUTH_DOMAIN: '',
      VITE_FIREBASE_PROJECT_ID: '',
      VITE_FIREBASE_STORAGE_BUCKET: '',
      VITE_FIREBASE_MESSAGING_SENDER_ID: '',
      VITE_FIREBASE_APP_ID: '',
      VITE_FIREBASE_MEASUREMENT_ID: '',
      REACT_APP_FIREBASE_API_KEY: '',
      REACT_APP_FIREBASE_AUTH_DOMAIN: '',
      REACT_APP_FIREBASE_PROJECT_ID: '',
      REACT_APP_FIREBASE_STORAGE_BUCKET: '',
      REACT_APP_FIREBASE_MESSAGING_SENDER_ID: '',
      REACT_APP_FIREBASE_APP_ID: '',
      REACT_APP_FIREBASE_MEASUREMENT_ID: '',
    },
    gracefulShutdown: {
      signal: 'SIGTERM',
      timeout: 5000,
    },
  },
});
