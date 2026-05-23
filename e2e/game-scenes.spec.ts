import { test, expect } from '@playwright/test';

const BENIGN = ['__DEFINES__', 'GL Driver', 'GPU stall', 'no longer repeat', 'favicon.ico'];

test.describe('mk.js game scenes', () => {
  const pageErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    pageErrors.length = 0;
    page.on('pageerror', (err) => {
      if (!BENIGN.some((b) => err.message.includes(b))) {
        pageErrors.push(`[PAGE_ERROR] ${err.message}`);
      }
    });
  });

  test('game loads and exposes __MK_GAME', async ({ page }) => {
    await page.goto('/');
    const hasGame = await page.waitForFunction(() => !!(window as any).__MK_GAME, {}, { timeout: 8000 });
    expect(hasGame).toBeTruthy();
    expect(pageErrors).toHaveLength(0);
  });

  test('scene transitions: Boot -> Preload -> Menu', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => !!(window as any).__MK_GAME, {}, { timeout: 8000 });
    await page.waitForTimeout(2000);

    const scene = await page.evaluate(() => {
      const g = (window as any).__MK_GAME;
      const s = g.scene.getScenes(true);
      return s.map((sc: any) => sc.sys.settings.key).join(',');
    });
    expect(scene).toContain('Menu');
    expect(pageErrors).toHaveLength(0);
  });

  test('click VS AI enters GameScene and shows round', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => !!(window as any).__MK_GAME, {}, { timeout: 8000 });
    await page.waitForTimeout(2000);

    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    if (box) {
      const sx = box.width / 600;
      const sy = box.height / 400;
      await page.mouse.click(box.x + 300 * sx, box.y + 210 * sy);
    }

    await page.waitForTimeout(1000);
    const scene = await page.evaluate(() => {
      const g = (window as any).__MK_GAME;
      const s = g.scene.getScenes(true);
      return s.map((sc: any) => sc.sys.settings.key).join(',');
    });
    expect(scene).toContain('Game');
    expect(pageErrors).toHaveLength(0);
  });

  test('game round system works: ROUND -> FIGHT! -> active', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => !!(window as any).__MK_GAME, {}, { timeout: 8000 });
    await page.waitForTimeout(1000);

    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    if (box) {
      const sx = box.width / 600;
      const sy = box.height / 400;
      await page.mouse.click(box.x + 300 * sx, box.y + 210 * sy);
    }

    // Check round becomes active after announcements
    await page.waitForTimeout(3500);
    const active = await page.evaluate(() => {
      const g = (window as any).__MK_GAME;
      const gameScene = g.scene.getScene('Game') as any;
      return gameScene?.roundActive ?? false;
    });
    expect(active).toBe(true);
    expect(pageErrors).toHaveLength(0);
  });

  test('extended play: 10s with no errors', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => !!(window as any).__MK_GAME, {}, { timeout: 8000 });
    await page.waitForTimeout(1000);

    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    if (box) {
      const sx = box.width / 600;
      const sy = box.height / 400;
      await page.mouse.click(box.x + 300 * sx, box.y + 210 * sy);
    }

    await page.waitForTimeout(10000);
    expect(pageErrors).toHaveLength(0);
  });
});
