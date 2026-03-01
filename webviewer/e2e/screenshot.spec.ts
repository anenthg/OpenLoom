import { test } from "@playwright/test";

test("capture hero screenshot", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("http://localhost:3001");
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "e2e/hero-screenshot.png", fullPage: false });
});
