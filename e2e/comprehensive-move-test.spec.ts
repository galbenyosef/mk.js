import { test, expect } from '@playwright/test';

test.describe('comprehensive move and sprite verification', () => {

  test.beforeEach(async ({ page }) => {
    page.on('pageerror', (err) => {
      if (!err.message.includes('__DEFINES__')) throw err;
    });
    await page.goto('/');
    await page.waitForFunction(() => !!(window as any).__MK_GAME, {}, { timeout: 8000 });
    await page.waitForTimeout(2000);
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    if (box) {
      // Click "2 PLAYERS LOCAL" button (y=260 in game coords) to avoid AI opponent
      await page.mouse.click(box.x + 300 * (box.width / 600), box.y + 260 * (box.height / 400));
    }
    await page.waitForTimeout(4000);
  });

  test('all 4 fighters spritesheet frame prefixes are correct', async ({ page }) => {
    const fighters = ['subzero', 'kano', 'liukang', 'sonya'];
    for (const f of fighters) {
      const result = await page.evaluate((fighter) => {
        const g = (window as any).__MK_GAME;
        const tex = g.textures.get(`fighters/${fighter}`);
        if (!tex) return { error: 'no texture' };
        const names = tex.getFrameNames() as string[];
        const cats: Record<string, string[]> = {};
        for (const n of names) {
          const [cat, ...rest] = n.split('/');
          if (!cats[cat]) cats[cat] = [];
          cats[cat].push(rest.join('/'));
        }
        const result: Record<string, { frames: number; prefixes: string }> = {};
        for (const [cat, frames] of Object.entries(cats)) {
          const prefixes = [...new Set(frames.map(f => {
            const m = f.match(/^([a-z]*)\d/);
            return m ? (m[1] || '(none)') : '(none)';
          }))].sort().join(',');
          result[cat] = { frames: frames.length, prefixes };
        }
        return result;
      }, f);
      // Verify core prefix structure
      expect(result['stance']?.prefixes).toContain('(none)');
      expect(result['stance']?.prefixes).toContain('t');
      expect(result['duckjump']?.prefixes).toBe('d,dt,f,j');
      expect(result['punch']?.prefixes).toContain('(none)');
      expect(result['punch']?.prefixes).toContain('d');
      expect(result['punch']?.prefixes).toContain('u');
      expect(result['kick']?.prefixes).toContain('(none)');
      expect(result['kick']?.prefixes).toContain('r');
      expect(result['kick']?.prefixes).toContain('d');
      expect(result['block']?.prefixes).toContain('(none)');
      expect(result['block']?.prefixes).toContain('d');
      expect(result['beinghit']?.prefixes).toBe('d,h,l,s,t');
      expect(result['fall']?.prefixes).toBe('f,h,s');
      // No bare-numeric frames in duckjump, beinghit, fall (junk was removed)
      expect(result['duckjump']?.prefixes.split(',')).not.toContain('(none)');
      expect(result['beinghit']?.prefixes.split(',')).not.toContain('(none)');
      expect(result['fall']?.prefixes.split(',')).not.toContain('(none)');
    }
  });

  test('all basic moves play correct animations', async ({ page }) => {
    async function getState() {
      return await page.evaluate(() => {
        const g = (window as any).__MK_GAME;
        const gs = g.scene.getScene('Game');
        if (!gs) return null;
        const f = gs.fighters[0];
        return {
          move: f.currentMove,
          frame: f.frame?.name ?? '',
          locked: f.locked,
          x: Math.round(f.x),
          y: Math.round(f.y),
          playing: f.anims?.isPlaying ?? false,
        };
      });
    }

    // 1. STAND - animation should be playing
    await page.waitForTimeout(300);
    let state = await getState();
    expect(state?.move).toBe('STAND');
    expect(state?.frame).toMatch(/^stance\/\d+/);
    expect(state?.playing).toBe(true);

    // 2. WALK - press D, check WHILE held
    await page.keyboard.down('d');
    await page.waitForTimeout(300);
    state = await getState();
    expect(state?.move).toBe('WALK');
    expect(state?.x).toBeGreaterThan(152);
    await page.keyboard.up('d');
    await page.waitForTimeout(200);

    // 3. WALK_BACKWARD - press A while held
    await page.keyboard.down('a');
    await page.waitForTimeout(300);
    state = await getState();
    expect(state?.move).toBe('WALK_BACKWARD');
    await page.keyboard.up('a');
    await page.waitForTimeout(200);

    // 4. SQUAT - press S, check while held
    await page.keyboard.down('s');
    await page.waitForTimeout(500);
    state = await getState();
    expect(state?.move).toBe('SQUAT');
    await page.keyboard.up('s');
    await page.waitForTimeout(500);
    state = await getState();
    expect(state?.move).toBe('STAND');

    // 5. JUMP - press W
    await page.keyboard.down('w');
    await page.waitForTimeout(200);
    state = await getState();
    expect(state?.move).toBe('JUMP');
    expect(state?.y).toBeLessThan(228);
    await page.keyboard.up('w');
    await page.waitForTimeout(800);

    // 6. FORWARD_JUMP
    await page.keyboard.down('d');
    await page.keyboard.down('w');
    await page.waitForTimeout(300);
    state = await getState();
    expect(state?.move).toBe('FORWARD_JUMP');
    await page.keyboard.up('w');
    await page.keyboard.up('d');
    await page.waitForTimeout(800);

    // 7. BACKWARD_JUMP
    await page.keyboard.down('a');
    await page.keyboard.down('w');
    await page.waitForTimeout(300);
    state = await getState();
    expect(state?.move).toBe('BACKWARD_JUMP');
    await page.keyboard.up('w');
    await page.keyboard.up('a');
  });

  test('all attack moves play correct animations', async ({ page }) => {
    async function pressAndCheck(keys: string[], expectedMove: string, label: string) {
      for (const key of keys) { await page.keyboard.down(key); }
      await page.waitForTimeout(60);
      const state = await page.evaluate(() => {
        const g = (window as any).__MK_GAME;
        const gs = g.scene.getScene('Game');
        if (!gs) return null;
        return { move: gs.fighters[0].currentMove, frame: gs.fighters[0].frame?.name ?? '', locked: gs.fighters[0].locked };
      });
      console.log(`${label}:`, JSON.stringify(state));
      expect(state?.move).toBe(expectedMove);
      for (const key of keys) { await page.keyboard.up(key); }
      await page.waitForTimeout(800);
    }

    await pressAndCheck(['l'], 'HIGH_PUNCH', 'HP');
    await pressAndCheck(['j'], 'LOW_PUNCH', 'LP');
    await pressAndCheck([';'], 'HIGH_KICK', 'HK');
    await pressAndCheck(['k'], 'LOW_KICK', 'LK');
    await pressAndCheck(['s', 'l'], 'UPPERCUT', 'UPPERCUT');
  });

  test('crouching attacks, jump attacks, and attack-while-moving', async ({ page }) => {
    // Crouching attacks: hold S + attack key while checking
    async function doCrouchAttack(attackKey: string, expectedMove: string, label: string) {
      await page.keyboard.down('s');
      await page.waitForTimeout(400);
      await page.keyboard.down(attackKey);
      await page.waitForTimeout(100);
      const state = await page.evaluate(() => {
        const g = (window as any).__MK_GAME;
        const gs = g.scene.getScene('Game');
        if (!gs) return null;
        return { move: gs.fighters[0].currentMove, frame: gs.fighters[0].frame?.name ?? '' };
      });
      console.log(`${label}:`, JSON.stringify(state));
      expect(state?.move).toBe(expectedMove);
      await page.keyboard.up(attackKey);
      await page.keyboard.up('s');
      await page.waitForTimeout(600);
    }
    await doCrouchAttack('j', 'SQUAT_LOW_PUNCH', 'S+LP');
    await doCrouchAttack('k', 'SQUAT_LOW_KICK', 'S+LK');
    await doCrouchAttack(';', 'SQUAT_HIGH_KICK', 'S+HK');

    // Jump attacks: press W then attack while airborne
    async function doJumpAttack(attackKey: string, expectedMove: string, label: string) {
      await page.keyboard.down('w');
      await page.waitForTimeout(500);
      await page.keyboard.down(attackKey);
      await page.waitForTimeout(150);
      const state = await page.evaluate(() => {
        const g = (window as any).__MK_GAME;
        const gs = g.scene.getScene('Game');
        if (!gs) return null;
        return { move: gs.fighters[0].currentMove, frame: gs.fighters[0].frame?.name ?? '' };
      });
      console.log(`${label}:`, JSON.stringify(state));
      expect(state?.move).toBe(expectedMove);
      await page.keyboard.up(attackKey);
      await page.keyboard.up('w');
      await page.waitForTimeout(800);
    }
    await doJumpAttack('l', 'FORWARD_JUMP_PUNCH', 'W+HP');
    await doJumpAttack(';', 'FORWARD_JUMP_KICK', 'W+HK');

    // Attack-while-moving: press D then L
    await page.keyboard.down('d');
    await page.waitForTimeout(200);
    const xBefore = await page.evaluate(() => ((window as any).__MK_GAME.scene.getScene('Game').fighters[0].x));
    await page.keyboard.down('l');
    await page.waitForTimeout(60);
    const state = await page.evaluate(() => {
      const g = (window as any).__MK_GAME;
      const gs = g.scene.getScene('Game');
      const f = gs.fighters[0];
      return { move: f.currentMove, x: Math.round(f.x), frame: f.frame?.name ?? '' };
    });
    console.log(`D+HP:`, JSON.stringify(state), `x: ${Math.round(xBefore)}→${state.x}`);
    expect(state.move).toBe('HIGH_PUNCH');
    await page.keyboard.up('l');
    await page.keyboard.up('d');
  });

  test('SQUAT holds last frame and transitions on release', async ({ page }) => {
    await page.keyboard.down('s');
    await page.waitForTimeout(600);
    let state = await page.evaluate(() => {
      const g = (window as any).__MK_GAME;
      const gs = g.scene.getScene('Game');
      const f = gs.fighters[0];
      return { move: f.currentMove, frame: f.frame?.name ?? '', playing: f.anims?.isPlaying ?? false };
    });
    expect(state.move).toBe('SQUAT');
    expect(state.frame).toBe('duckjump/d03');
    expect(state.playing).toBe(false);

    await page.keyboard.up('s');
    await page.waitForTimeout(500);
    state = await page.evaluate(() => {
      const g = (window as any).__MK_GAME;
      const gs = g.scene.getScene('Game');
      const f = gs.fighters[0];
      return { move: f.currentMove, frame: f.frame?.name ?? '' };
    });
    expect(state.move).toBe('STAND');
    expect(state.frame).toMatch(/^stance\/\d+/);
  });

  test('initial sprite is correct stance for both fighters', async ({ page }) => {
    const state = await page.evaluate(() => {
      const g = (window as any).__MK_GAME;
      const gs = g.scene.getScene('Game');
      if (!gs) return null;
      return gs.fighters.map((f: any) => ({
        name: f.fighterName,
        frame: f.frame?.name ?? '',
        move: f.currentMove,
      }));
    });
    for (const f of state) {
      expect(f.frame).toMatch(/^stance\/\d+/);
      expect(f.move).toBe('STAND');
    }
  });
});
