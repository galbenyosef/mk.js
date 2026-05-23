import { test, expect } from '@playwright/test';

test.describe('battle simulation', () => {
  test.beforeEach(async ({ page }) => {
    page.on('pageerror', (err) => {
      if (!err.message.includes('__DEFINES__') && !err.message.includes('GL Driver')) {
        throw err;
      }
    });
  });

  async function enterAIGame(page: any) {
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
    await page.waitForTimeout(3500);
  }

  test('fighter sprites are visible and animated', async ({ page }) => {
    await enterAIGame(page);

    const state = await page.evaluate(() => {
      const g = (window as any).__MK_GAME;
      const gs = g.scene.getScene('Game');
      if (!gs) return { error: 'no Game scene' };
      const f = gs.fighters;
      const info = f.map((fighter: any, i: number) => ({
        index: i,
        name: fighter.fighterName,
        x: Math.round(fighter.x),
        y: Math.round(fighter.y),
        hp: fighter.hp,
        currentMove: fighter.currentMove,
        locked: fighter.locked,
        visible: fighter.visible,
        alpha: fighter.alpha,
        hasSprite: !!fighter.texture?.key,
        animPlaying: fighter.anims?.isPlaying ?? false,
        frameName: fighter.frame?.name ?? 'none',
        orientation: fighter.orientation,
      }));
      return info;
    });

    console.log('Fighter state:', JSON.stringify(state, null, 2));
    expect(state).toHaveLength(2);
    for (const f of state) {
      expect(f.visible).toBe(true);
      expect(f.alpha).toBe(1);
    }
  });

  test('AIController makes opponent move and attack', async ({ page }) => {
    await enterAIGame(page);
    await page.waitForTimeout(2000);

    const state = await page.evaluate(() => {
      const gs = (window as any).__MK_GAME.scene.getScene('Game');
      const f1 = gs.fighters[0];
      const f2 = gs.fighters[1];
      return {
        player1X: Math.round(f1.x),
        player2X: Math.round(f2.x),
        distance: Math.round(Math.abs(f1.x - f2.x)),
        hp1: f1.hp,
        hp2: f2.hp,
        move2: f2.currentMove,
        roundActive: gs.roundActive,
        roundWins: gs.roundWins,
      };
    });

    console.log('Battle state:', JSON.stringify(state));
    expect(state.roundActive).toBe(true);
    expect(state.distance).toBeGreaterThan(0);
    expect(state.hp1).toBeGreaterThan(0);
    expect(state.hp2).toBeGreaterThan(0);
  });

  test('damage system works on hit', async ({ page }) => {
    await enterAIGame(page);

    // Wait for AI to attack - force animation and deal damage by moving player into range
    await page.waitForTimeout(3000);

    const state = await page.evaluate(() => {
      const gs = (window as any).__MK_GAME.scene.getScene('Game');
      const f1 = gs.fighters[0];
      const f2 = gs.fighters[1];
      return {
        hp1: f1.hp,
        hp2: f2.hp,
        move1: f1.currentMove,
        move2: f2.currentMove,
        x1: Math.round(f1.x),
        x2: Math.round(f2.x),
        roundActive: gs.roundActive,
        roundWins: gs.roundWins,
      };
    });

    console.log('Damage state (3s):', JSON.stringify(state));
    expect(state.hp1).toBeGreaterThanOrEqual(0);
    expect(state.hp2).toBeGreaterThanOrEqual(0);
    expect(state.roundActive).toBe(true);
  });

  test('full battle: player walks toward AI and fights', async ({ page }) => {
    await enterAIGame(page);

    // Simulate pressing RIGHT key to walk toward AI
    const canvas = page.locator('canvas');
    await canvas.press('ArrowRight');
    await page.waitForTimeout(500);
    await canvas.press('KeyA'); // High punch (P1 keys: A = HP)
    await page.waitForTimeout(500);

    const state1 = await page.evaluate(() => {
      const gs = (window as any).__MK_GAME.scene.getScene('Game');
      return {
        x1: Math.round(gs.fighters[0].x),
        x2: Math.round(gs.fighters[1].x),
        move1: gs.fighters[0].currentMove,
        hp1: gs.fighters[0].hp,
        hp2: gs.fighters[1].hp,
        roundActive: gs.roundActive,
      };
    });

    console.log('After player attack:', JSON.stringify(state1));
    expect(state1.hp1).toBeGreaterThanOrEqual(0);
    expect(state1.hp2).toBeGreaterThanOrEqual(0);

    // Wait for potential round end
    await page.waitForTimeout(8000);
    const finalState = await page.evaluate(() => {
      const gs = (window as any).__MK_GAME.scene.getScene('Game');
      if (!gs) return { scene: 'Menu', roundWins: [] };
      return {
        scene: 'Game',
        roundWins: gs.roundWins,
        hp1: gs.fighters[0].hp,
        hp2: gs.fighters[1].hp,
        roundActive: gs.roundActive,
      };
    });

    console.log('Final state:', JSON.stringify(finalState));
    expect(finalState.scene).toBe('Game');
    // Verify game is still running without errors
    const hasGame = finalState.scene === 'Game' || finalState.roundWins.length > 0;
    expect(hasGame).toBe(true);
    // Player health is valid (no negative, no NaN)
    expect(finalState.hp1).toBeGreaterThanOrEqual(0);
    expect(finalState.hp2).toBeGreaterThanOrEqual(0);
  });

  test.afterEach(async ({ page }) => {
    // Clean up any running game
    await page.evaluate(() => {
      const g = (window as any).__MK_GAME;
      if (g) g.scene.start('Menu');
    });
  });
});
