import { test, expect } from '@playwright/test';
import { compareScreenshot } from './helpers/pixelmatch.js';
import { injectReplay } from './helpers/replay.js';
import { VISUAL_TESTS } from './visual-regression.config.js';

for (const { name, threshold, replayFile, waitMs } of VISUAL_TESTS) {
  test(`visual regression: ${name}`, async ({ page }) => {
    await page.goto('/?deterministic=1');
    await page.waitForFunction(() => !!(window as any).__MK_GAME, {}, { timeout: 8000 });
    await page.waitForTimeout(2000);

    if (replayFile) {
      const canvas = page.locator('canvas');
      const box = await canvas.boundingBox();
      if (box) {
        const sx = box.width / 600;
        const sy = box.height / 400;
        await page.mouse.click(box.x + 300 * sx, box.y + 210 * sy);
      }
      await page.waitForTimeout(1000);
      await injectReplay(page, replayFile);
    } else {
      const canvas = page.locator('canvas');
      const box = await canvas.boundingBox();
      if (box) {
        const sx = box.width / 600;
        const sy = box.height / 400;
        await page.mouse.click(box.x + 300 * sx, box.y + 210 * sy);
      }
    }

    await page.waitForTimeout(waitMs);

    const screenshot = await page.screenshot();
    const result = await compareScreenshot(screenshot, name, threshold);

    if (!result.passed) {
      const pct = ((result.diffPixels / result.totalPixels) * 100).toFixed(2);
      expect(result.passed, `${name}: ${result.diffPixels}/${result.totalPixels} pixels differ (${pct}%)`).toBe(true);
    }
  });
}
