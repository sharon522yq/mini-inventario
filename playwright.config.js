import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';

try {
  process.loadEnvFile(fileURLToPath(new URL('./.env', import.meta.url)));
} catch (error) {
  if (error.code !== 'ENOENT') throw new Error('No se pudo cargar .env para Playwright.');
}
for (const nombre of ['TEST_EMAIL', 'TEST_PASSWORD', 'SUPABASE_URL', 'SUPABASE_KEY']) {
  if (!process.env[nombre]) throw new Error(`Falta la variable de entorno ${nombre}.`);
}

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never' }]]
    : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm start',
    url: 'http://localhost:3000/health',
    env: { PORT: '3000' },
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
