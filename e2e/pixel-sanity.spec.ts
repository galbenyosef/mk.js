import { test, expect } from '@playwright/test';

test.describe('pixel-exact sanity', () => {
  // Test 1: Verify ALL 4 fighter textures load at game start
  test('all 4 fighter spritesheets are loaded in memory', async ({ page }) => {
    page.on('pageerror', (err) => {
      if (!err.message.includes('__DEFINES__')) throw err;
    });

    await page.goto('/');
    await page.waitForFunction(() => !!(window as any).__MK_GAME, {}, { timeout: 8000 });
    await page.waitForTimeout(3000);

    const fighters = ['subzero', 'kano', 'liukang', 'sonya'];
    for (const f of fighters) {
      const result = await page.evaluate((fName) => {
        const g = (window as any).__MK_GAME;
        const tex = g.textures.get(`fighters/${fName}`);
        if (!tex) return { fighter: fName, loaded: false };
        const frames = tex.getFrameNames();
        const hasStance = frames.some((n: string) => n.startsWith('stance/'));
        const hasWalk = frames.some((n: string) => n.startsWith('walk/'));
        const hasPunch = frames.some((n: string) => n.startsWith('punch/'));
        return { fighter: fName, loaded: true, frameCount: frames.length, hasStance, hasWalk, hasPunch };
      }, f);

      console.log(JSON.stringify(result));
      expect(result.loaded).toBe(true);
      expect(result.frameCount).toBeGreaterThan(50);
      expect(result.hasStance).toBe(true);
    }
  });

  // Test 2: After entering game, fighters use real sprite frames (not black rectangles)
  test('fighters show real sprite frames after round starts', async ({ page }) => {
    page.on('pageerror', (err) => {
      if (!err.message.includes('__DEFINES__')) throw err;
    });

    await page.goto('/');
    await page.waitForFunction(() => !!(window as any).__MK_GAME, {}, { timeout: 8000 });
    await page.waitForTimeout(1000);

    // Click "1 PLAYER BASIC" button (y=210 in game coords)
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      const sx = box.width / 600;
      const sy = box.height / 400;
      await page.mouse.click(box.x + 300 * sx, box.y + 210 * sy);
    }
    await page.waitForTimeout(4000);

    const state = await page.evaluate(() => {
      const g = (window as any).__MK_GAME;
      const gs = g.scene.getScene('Game');
      if (!gs) return { error: 'no Game scene' };
      
      const f = gs.fighters.map((fighter: any) => ({
        name: fighter.fighterName,
        frame: fighter.frame?.name ?? 'none',
        texture: fighter.texture?.key ?? 'none',
        visible: fighter.visible,
        playing: fighter.anims?.isPlaying ?? false,
        move: fighter.currentMove,
        x: Math.round(fighter.x),
        y: Math.round(fighter.y),
      }));

      return {
        fighters: f,
        roundActive: gs.roundActive,
        canvasExists: !!document.querySelector('canvas'),
      };
    });

    console.log('Game state:', JSON.stringify(state, null, 2));

    // Both fighters should be visible
    for (const f of state.fighters) {
      expect(f.visible).toBe(true);
      // Frame should be a real sprite like 'stance/01', 'walk/01', not '__BASE' or 'beinghit/01'
      // Both end with a frame number pattern
      expect(f.frame).toMatch(/\d+$/);  // ends with digits
      expect(f.frame).not.toBe('__BASE');
      // Texture should be their fighter key
      expect(f.texture).toBe('fighters/' + f.name);
    }

    // Round should be active
    expect(state.roundActive).toBe(true);
    // Canvas should exist
    expect(state.canvasExists).toBe(true);
  });

  // Test 3: All 4 fighters' textures have correct frame structure
  test('all spritesheets have correct frame categories', async ({ page }) => {
    page.on('pageerror', (err) => {
      if (!err.message.includes('__DEFINES__')) throw err;
    });

    await page.goto('/');
    await page.waitForFunction(() => !!(window as any).__MK_GAME, {}, { timeout: 8000 });
    await page.waitForTimeout(2000);

    const fighters = ['subzero', 'kano', 'liukang', 'sonya'];
    for (const f of fighters) {
      const result = await page.evaluate((fName) => {
        const g = (window as any).__MK_GAME;
        const tex = g.textures.get(`fighters/${fName}`);
        if (!tex) return { error: 'texture not loaded' };
        const names: string[] = tex.getFrameNames();
        const categories = new Set(names.map((n: string) => n.split('/')[0]));
        return {
          fighter: fName,
          totalFrames: names.length,
          categories: [...categories].sort(),
        };
      }, f);

      console.log(JSON.stringify(result));
      expect(result.totalFrames).toBeGreaterThan(50);
      // Must have stance, walk, punch, kick, block, fall, beinghit
      const required = ['stance', 'walk', 'punch', 'kick', 'block', 'fall', 'beinghit'];
      for (const cat of required) {
        expect(result.categories).toContain(cat);
      }
    }
  });
});
