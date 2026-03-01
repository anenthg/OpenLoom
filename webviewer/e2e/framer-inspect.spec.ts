import { test } from "@playwright/test";

test("inspect framer hero font styles", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("https://www.framer.com/design/", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  const styles = await page.evaluate(() => {
    // Find the hero heading — likely an h1 or large text element
    const candidates = document.querySelectorAll("h1, h2, [class*='hero'], [class*='heading'], [class*='title']");
    const results: Record<string, string>[] = [];

    for (const el of candidates) {
      const cs = window.getComputedStyle(el);
      const text = (el as HTMLElement).innerText?.slice(0, 60);
      if (!text || text.length < 10) continue;
      results.push({
        text,
        fontFamily: cs.fontFamily,
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        lineHeight: cs.lineHeight,
        letterSpacing: cs.letterSpacing,
        color: cs.color,
        textAlign: cs.textAlign,
      });
    }

    // Also check large text elements by font size
    const allEls = document.querySelectorAll("p, span, div, h1, h2, h3");
    for (const el of allEls) {
      const cs = window.getComputedStyle(el);
      const size = parseFloat(cs.fontSize);
      if (size >= 40) {
        const text = (el as HTMLElement).innerText?.slice(0, 60);
        if (!text || text.length < 10) continue;
        const alreadyAdded = results.some(r => r.text === text);
        if (!alreadyAdded) {
          results.push({
            text,
            fontFamily: cs.fontFamily,
            fontSize: cs.fontSize,
            fontWeight: cs.fontWeight,
            lineHeight: cs.lineHeight,
            letterSpacing: cs.letterSpacing,
            color: cs.color,
            textAlign: cs.textAlign,
          });
        }
      }
    }

    return results;
  });

  console.log(JSON.stringify(styles, null, 2));
});
