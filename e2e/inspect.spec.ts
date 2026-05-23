import { test, expect } from '@playwright/test';

test('debug createAnimations', async ({ page }) => {
  const logs: string[] = [];
  page.on('console', (msg) => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', (err) => {
    if (!err.message.includes('__DEFINES__')) logs.push(`[PAGE_ERROR] ${err.message}`);
  });

  await page.goto('/');
  await page.waitForFunction(() => !!(window as any).__MK_GAME, {}, { timeout: 8000 });
  await page.waitForTimeout(1000);

  // Click AI button
  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  if (box) {
    const sx = box.width / 600;
    const sy = box.height / 400;
    await page.mouse.click(box.x + 300 * sx, box.y + 210 * sy);
  }
  await page.waitForTimeout(4000);

  const mkLogs = logs.filter(l => l.includes('[mk.js]'));
  console.log('mk logs:', JSON.stringify(mkLogs));

  // Check scene-scoped anim manager vs global
  const result = await page.evaluate(() => {
    const g = (window as any).__MK_GAME;
    const gs = g.scene.getScene('Game');
    if (!gs) return { error: 'no Game scene' };

    const f0 = gs.fighters[0];
    
    // Check scene-scoped vs global
    const sceneAnimExists = gs.anims?.exists('subzero_STAND');
    const globalAnimExists = g.anims?.exists('subzero_STAND');
    const sceneAnimsType = typeof gs.anims;
    const sceneAnimsKeys = gs.anims ? Object.keys(gs.anims) : [];
    const storageSize = gs.anims?.anims?.size;
    const globalStorageSize = g.anims?.anims?.size;
    // Check storage directly
    const storageKeys: string[] = [];
    if (gs.anims?.anims?.entries instanceof Map) {
      gs.anims.anims.entries.forEach((a: any) => storageKeys.push(a.key));
    } else if (gs.anims?.anims?.entries) {
      for (const k of Object.keys(gs.anims.anims.entries)) storageKeys.push(k);
    }
    // Check the exists method return for a known animation
    const standInStorage = storageKeys.includes('subzero_stand');
    // Check if maybe exists requires scene key prefix
    const altExists = gs.anims?.exists('stand', 'subzero');

    // Force play using the CORRECT uppercase key
    f0.play('subzero_STAND');
    const afterPlay = { playing: f0.anims?.isPlaying, frame: f0.frame?.name, animState: f0.anims?.name };

    // Try setMove with enum value
    f0.trySetMove('WALK', true);
    const afterWalk = { playing: f0.anims?.isPlaying, frame: f0.frame?.name, move: f0.currentMove, x: Math.round(f0.x) };

    return {
      sceneAnimExists,
      globalAnimExists,
      sceneAnimsType,
      sceneAnimsKeys,
      storageSize,
      globalStorageSize,
      afterPlay,
      afterWalk,
    };
  });

  console.log(JSON.stringify(result, null, 2));
  expect(result.sceneAnimExists).toBe(true);

  const webGLErrors = logs.filter(l => l.includes('texImage2D') || l.includes('width or height out of range'));
  expect(webGLErrors).toHaveLength(0);
});
