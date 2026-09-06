import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // The frontend is a static export (`output: 'export'`), so there is no
  // `next start`. The e2e suite runs against the real backend, which serves
  // the built `out/` bundle and the auth API from one origin. Run
  // `npm run build` first (see TESTING.md); the backend recreates its
  // throwaway DB on every startup.
  webServer: {
    command:
      "cd ../backend && DATABASE_URL=sqlite:///./data/e2e.db FRONTEND_DIST=../frontend/out uv run uvicorn app.main:app --host 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100/api/health",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
