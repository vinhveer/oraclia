import { defineConfig, devices } from '@playwright/test'
import { APP_PORT, authFile, BASE_PATH, localSupabase } from './e2e/env'

const supabase = localSupabase()

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000, toHaveScreenshot: { maxDiffPixelRatio: 0.01 } },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Edge runtime local trả 503 khi nhiều stream dài chạy cùng lúc; hai luồng là
  // mức nó chịu được ổn định.
  workers: 2,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${APP_PORT}${BASE_PATH}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'vi-VN',
  },
  projects: [
    { name: 'setup', testMatch: /global\.setup\.ts/ },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, storageState: authFile('desktop') },
      dependencies: ['setup'],
    },
    {
      name: 'laptop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 }, storageState: authFile('laptop') },
      dependencies: ['setup'],
    },
    {
      name: 'iphone',
      use: { ...devices['iPhone 15'], storageState: authFile('iphone') },
      dependencies: ['setup'],
    },
    {
      name: 'pixel',
      use: { ...devices['Pixel 7'], storageState: authFile('pixel') },
      dependencies: ['setup'],
    },
    {
      name: 'ipad',
      use: { ...devices['iPad (gen 7)'], storageState: authFile('ipad') },
      dependencies: ['setup'],
    },
  ],
  webServer: [
    {
      command: 'npx supabase functions serve --env-file e2e/functions.env',
      // kb-embed trả 403 cho người lạ: đủ để biết function server đã lên.
      // Cổng riêng (5188) để không bám nhầm dev server của dự án khác.
      url: `${supabase.url}/functions/v1/kb-embed`,
      // `supabase start` đã chạy sẵn edge runtime; CI tự serve lại với env E2E
      // trước khi chạy test, nên luôn dùng lại thay vì báo cổng bận.
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: `npx vite --port ${APP_PORT} --strictPort`,
      url: `http://localhost:${APP_PORT}${BASE_PATH}`,
      reuseExistingServer: !process.env.CI,
      env: { VITE_SUPABASE_URL: supabase.url, VITE_SUPABASE_ANON_KEY: supabase.anonKey },
    },
  ],
})
