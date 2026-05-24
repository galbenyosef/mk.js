import { test, expect } from '@playwright/test';
import { extractAnimations, getTextureFrames } from './helpers/animation-inspector';

const EXPECTED: Record<string, { cat: string; prefix: string; max?: number }> = {
  STAND:               { cat: 'stance',   prefix: '',    max: 11 },
  WALK:                { cat: 'walk',     prefix: '' },
  WALK_BACKWARD:       { cat: 'walk',     prefix: '' },
  SQUAT:               { cat: 'duckjump', prefix: 'd',   max: 3 },
  STAND_UP:            { cat: 'duckjump', prefix: 'dt',  max: 2 },
  BLOCK:               { cat: 'block',    prefix: '',    max: 3 },
  HIGH_PUNCH:          { cat: 'punch',    prefix: '',    max: 5 },
  LOW_PUNCH:           { cat: 'punch',    prefix: '',    max: 5 },
  HIGH_KICK:           { cat: 'kick',     prefix: '',    max: 7 },
  LOW_KICK:            { cat: 'kick',     prefix: '',    max: 6 },
  UPPERCUT:            { cat: 'punch',    prefix: 'u',   max: 5 },
  SPIN_KICK:           { cat: 'kick',     prefix: 'r',   max: 8 },
  JUMP:                { cat: 'duckjump', prefix: 'j',   max: 3 },
  FORWARD_JUMP:        { cat: 'duckjump', prefix: 'f' },
  BACKWARD_JUMP:       { cat: 'duckjump', prefix: 'j',   max: 3 },
  FALL:                { cat: 'fall',     prefix: 'f' },
  KNOCK_DOWN:          { cat: 'fall',     prefix: 'h' },
  WIN:                 { cat: 'victory',  prefix: '' },
  ENDURE:              { cat: 'beinghit', prefix: 'h',   max: 3 },
  SQUAT_ENDURE:        { cat: 'beinghit', prefix: 's',   max: 7 },
  ATTRACTIVE_STAND_UP: { cat: 'stance',   prefix: 't',   max: 2 },
  SQUAT_LOW_KICK:      { cat: 'kick',     prefix: 'd',   max: 3 },
  SQUAT_HIGH_KICK:     { cat: 'kick',     prefix: 'd',   max: 4 },
  SQUAT_LOW_PUNCH:     { cat: 'punch',    prefix: 'd',   max: 3 },
  FORWARD_JUMP_KICK:   { cat: 'duckjump', prefix: 'f' },
  BACKWARD_JUMP_KICK:  { cat: 'duckjump', prefix: 'j',   max: 3 },
  FORWARD_JUMP_PUNCH:  { cat: 'duckjump', prefix: 'f' },
  BACKWARD_JUMP_PUNCH: { cat: 'duckjump', prefix: 'j',   max: 3 },
};

const FIGHTERS = ['subzero', 'kano', 'liukang', 'sonya'];

test.describe('animation frame selection', () => {
  test.beforeEach(async ({ page }) => {
    page.on('pageerror', (err) => {
      if (!err.message.includes('__DEFINES__')) throw err;
    });
    await page.goto('/');
    await page.waitForFunction(() => !!(window as any).__MK_GAME, {}, { timeout: 8000 });
    await page.waitForTimeout(3000);
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.click(box.x + 300 * (box.width / 600), box.y + 260 * (box.height / 400));
    }
    await page.waitForTimeout(4000);
  });

  for (const fighter of FIGHTERS) {
    test(`${fighter}: each move uses correct frame prefix`, async ({ page }) => {
      const debugInfo = await page.evaluate(() => {
        const g = (window as any).__MK_GAME;
        const am = g.anims;
        // Check various methods to enumerate animations
        let result = '';
        if (typeof am.toJSON === 'function') {
          const j = am.toJSON();
          result += `toJSON type=${typeof j} `;
          if (Array.isArray(j)) result += `len=${j.length}`;
          else if (j && typeof j === 'object') result += `keys=${Object.keys(j).slice(0,5).join(',')}`;
        }
        // Try iterating anims as Map2
        const map = am.anims;
        if (map) {
          if (typeof map.entries === 'function') {
            const entries = map.entries();
            const first = entries.next();
            result += ` | entries() done=${first.done} value=${first.done ? 'none' : JSON.stringify(first.value).slice(0,60)}`;
          }
          if (typeof map.keys === 'function') {
            const kiter = map.keys();
            const firstK = kiter.next();
            result += ` | keys() done=${firstK.done} value=${firstK.value}`;
          }
        }
        return result || 'nothing worked';
      });
      console.log(`[${fighter}] ${debugInfo}`);

      const data = await extractAnimations(page, fighter);
      expect(data.animations.length).toBeGreaterThan(15);

      const errors: string[] = [];
      for (const anim of data.animations) {
        const exp = EXPECTED[anim.moveType];
        if (!exp) {
          errors.push(`${anim.moveType}: no expected config`);
          continue;
        }
        for (const frameName of anim.frameNames) {
          const suffix = frameName.replace(`${exp.cat}/`, '');
          if (exp.prefix === '') {
            if (!/^\d/.test(suffix)) {
              errors.push(`${anim.moveType}: frame "${frameName}" should be bare-numeric in ${exp.cat}/`);
            }
          } else {
            if (!suffix.startsWith(exp.prefix)) {
              errors.push(`${anim.moveType}: frame "${frameName}" should have prefix "${exp.prefix}" in ${exp.cat}/`);
            }
          }
        }
        if (exp.max !== undefined && anim.frameCount > exp.max) {
          errors.push(`${anim.moveType}: ${anim.frameCount} frames exceeds max ${exp.max}`);
        }
        // Validate numeric ordering
        const nums = anim.frameNames.map(n => {
          const s = n.replace(`${exp.cat}/`, '');
          return parseInt(s.replace(/^[a-z]+/, ''), 10);
        });
        for (let i = 1; i < nums.length; i++) {
          if (nums[i] < nums[i - 1]) {
            errors.push(`${anim.moveType}: frames out of order at index ${i} (${nums[i]} < ${nums[i-1]})`);
          }
        }
      }

      if (errors.length > 0) {
        console.log(`\n=== ${fighter} errors ===`);
        for (const e of errors) console.log(`  ${e}`);
      }
      expect(errors).toEqual([]);
    });

    test(`${fighter}: no junk frames in core animation categories`, async ({ page }) => {
      const frames = await getTextureFrames(page, `fighters/${fighter}`);
      const badCats = ['duckjump', 'beinghit', 'fall'];
      const catFrames: Record<string, typeof frames> = {};
      for (const f of frames) {
        const cat = f.name.split('/')[0];
        if (!catFrames[cat]) catFrames[cat] = [];
        catFrames[cat].push(f);
      }
      const suspicious: string[] = [];
      for (const cat of badCats) {
        const cf = catFrames[cat] || [];
        for (const f of cf) {
          const suffix = f.name.replace(`${cat}/`, '');
          if (/^\d/.test(suffix) && f.width < 30 && f.height < 30) {
            suspicious.push(`${f.name}: ${f.width}x${f.height}`);
          }
        }
      }
      if (suspicious.length > 0) {
        console.log(`Suspicious junk frames in ${fighter}:`, suspicious.join(', '));
      }
      // For duckjump/beinghit/fall: no bare-numeric frames should exist (they were junk)
      for (const cat of badCats) {
        const cf = catFrames[cat] || [];
        const bare = cf.filter(f => /^\d/.test(f.name.replace(`${cat}/`, '')) && f.width < 30);
        expect(bare.length).toBe(0);
      }
    });
  }
});
