import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 15000,
  use: {
    baseURL: "http://localhost:3001",
    headless: true,
  },
});
