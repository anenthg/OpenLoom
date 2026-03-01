import { test } from "@playwright/test";

test("capture framer design hero", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("https://www.framer.com/design/", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "e2e/framer-hero.png", fullPage: false });
});
