import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3001";

test.describe("Hero section", () => {
  test("hero headline renders with key words visible", async ({ page }) => {
    await page.goto(BASE);

    const hero = page.locator("section").first();
    await expect(hero).toBeVisible();

    await expect(hero.locator("h1")).toContainText("Opensource");
    await expect(hero.locator("h1")).toContainText("Loom alternative");
    await expect(hero.locator("h1")).toContainText("self hosting");
  });

  test("hero heading has Framer-style typography", async ({ page }) => {
    await page.goto(BASE);

    const h1 = page.locator("section").first().locator("h1");
    await expect(h1).toBeVisible();
    await expect(h1).toHaveCSS("font-weight", "500");
  });

  test("CTA button is visible with outline style", async ({ page }) => {
    await page.goto(BASE);

    const cta = page.locator("section").first().locator("a", { hasText: "Download for macOS" });
    await expect(cta).toBeVisible();
  });

  test("subtitle text is present", async ({ page }) => {
    await page.goto(BASE);

    const subtitle = page.locator("section").first().locator("p");
    await expect(subtitle).toContainText("Open-source screen recorder");
  });
});
