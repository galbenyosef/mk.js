import { test, expect } from '@playwright/test';

test.describe('input & rendering', () => {
  async function go(page: any) {
    await page.goto('/');
    await page.waitForFunction(() => !!(window as any).__MK_GAME, {}, { timeout: 8000 });
    await page.waitForTimeout(1000);
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.click(box.x + 300 * (box.width/600), box.y + 210 * (box.height/400));
    }
    await page.waitForTimeout(4000);
  }

  function keydown(page: any, keyCode: number) {
    return page.evaluate((kc) => {
      window.dispatchEvent(new KeyboardEvent('keydown', { keyCode: kc, bubbles: true, repeat: false }));
    }, keyCode);
  }

  function keyup(page: any, keyCode: number) {
    return page.evaluate((kc) => {
      window.dispatchEvent(new KeyboardEvent('keyup', { keyCode: kc, bubbles: true }));
    }, keyCode);
  }

  test('1. fighters show stance/01, not __BASE', async ({ page }) => {
    await go(page);
    const f = await page.evaluate(() => {
      const gs = (window as any).__MK_GAME.scene.getScene('Game');
      return gs.fighters.map((f: any) => ({ frame: f.frame?.name, tex: f.texture?.key }));
    });
    console.log('Frames:', JSON.stringify(f));
    for (const r of f) {
      expect(r.frame).not.toBe('__BASE');
      expect(r.frame).toMatch(/.+\/\d+/);
    }
  });

  test('2. WASD crouch works: S=DOWN changes to SQUAT', async ({ page }) => {
    await go(page);
    await page.waitForFunction(() => {
      const gs = (window as any).__MK_GAME.scene.getScene('Game');
      return gs && !gs.fighters[0].locked;
    }, { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(50);
    await keydown(page, 83);
    await page.waitForTimeout(100);
    const move = await page.evaluate(() => {
      const gs = (window as any).__MK_GAME.scene.getScene('Game');
      return gs.fighters[0].currentMove;
    });
    console.log('Squat:', move);
    expect(move).toBe('SQUAT');
    await keyup(page, 83);
  });

  test('3. W=JUMP, A=WALK_BACKWARD, D=WALK', async ({ page }) => {
    await go(page);
    await page.waitForFunction(() => {
      const gs = (window as any).__MK_GAME.scene.getScene('Game');
      return gs && !gs.fighters[0].locked;
    }, { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(50);

    await keydown(page, 87); // W = UP = JUMP
    await page.waitForTimeout(100);
    let move = await page.evaluate(() => {
      const gs = (window as any).__MK_GAME.scene.getScene('Game');
      return gs.fighters[0].currentMove;
    });
    console.log('Jump:', move);
    expect(move).toBe('JUMP');
    await keyup(page, 87);

    await keydown(page, 65); // A = LEFT = WALK_BACKWARD
    await page.waitForTimeout(100);
    move = await page.evaluate(() => {
      const gs = (window as any).__MK_GAME.scene.getScene('Game');
      return gs.fighters[0].currentMove;
    });
    console.log('Backpedal:', move);
    expect(move).toBe('WALK_BACKWARD');
    await keyup(page, 65);

    await keydown(page, 68); // D = RIGHT = WALK
    await page.waitForTimeout(100);
    move = await page.evaluate(() => {
      const gs = (window as any).__MK_GAME.scene.getScene('Game');
      return gs.fighters[0].currentMove;
    });
    console.log('Walk:', move);
    expect(move).toBe('WALK');
    await keyup(page, 68);
  });

  test('4. single attack on keypress (no combo on repeat)', async ({ page }) => {
    await go(page);
    // Press L (76 = HIGH_PUNCH) — hold it
    await keydown(page, 76);
    await page.waitForTimeout(200);
    const move = await page.evaluate(() => {
      const gs = (window as any).__MK_GAME.scene.getScene('Game');
      return { move: gs.fighters[0].currentMove, locked: gs.fighters[0].locked };
    });
    console.log('Attack test:', JSON.stringify(move));
    expect(move.move).toBe('HIGH_PUNCH');
    await keyup(page, 76);
  });

  test('5. key repeat ignored', async ({ page }) => {
    await go(page);
    // Dispatch a repeat:true event — should be ignored
    await page.evaluate(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 76, bubbles: true, repeat: true }));
    });
    await page.waitForTimeout(100);
    const move = await page.evaluate(() => {
      const gs = (window as any).__MK_GAME.scene.getScene('Game');
      return gs.fighters[0].currentMove;
    });
    // After repeat:true, move should still be STAND (no change)
    console.log('After repeat key, move:', move);
    expect(move).toBe('STAND');
  });
});
