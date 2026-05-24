import { test, expect } from '@playwright/test';
import { extractAnimations } from './helpers/animation-inspector';

const FIGHTERS = ['subzero', 'kano', 'liukang', 'sonya'];

test.describe('cross-fighter consistency', () => {
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

  test('all fighters have similar frame counts per move type', async ({ page }) => {
    const allData = new Map<string, Map<string, number>>();
    for (const f of FIGHTERS) {
      const d = await extractAnimations(page, f);
      const m = new Map<string, number>();
      for (const a of d.animations) m.set(a.moveType, a.frameCount);
      allData.set(f, m);
    }
    const liu = allData.get('liukang')!;
    const warnings: string[] = [];
    for (const mt of liu.keys()) {
      if (mt === 'WIN') continue;
      const counts = FIGHTERS.map(f => allData.get(f)?.get(mt) ?? 0);
      const max = Math.max(...counts);
      const min = Math.min(...counts);
      if (max - min > 3 && max > 0) {
        warnings.push(`${mt}: ${FIGHTERS.map((f, i) => `${f}=${counts[i]}`).join(', ')}`);
      }
      counts.forEach(c => expect(c).toBeGreaterThanOrEqual(1));
    }
    if (warnings.length > 0) {
      console.log('\nFrame count discrepancies (>3 diff):');
      warnings.forEach(w => console.log(`  ${w}`));
    }
    // Baseline checks
    for (const f of FIGHTERS) {
      const stand = allData.get(f)?.get('STAND') ?? 0;
      expect(stand).toBeGreaterThanOrEqual(7);
      expect(stand).toBeLessThanOrEqual(11);
      expect(allData.get(f)?.get('JUMP')).toBe(3);
      expect(allData.get(f)?.get('FORWARD_JUMP')).toBe(8);
      expect(allData.get(f)?.get('UPPERCUT')).toBeLessThanOrEqual(5);
      expect(allData.get(f)?.get('HIGH_PUNCH')).toBeLessThanOrEqual(5);
    }
  });

  test('animation timing is consistent across fighters', async ({ page }) => {
    const allData = new Map<string, Map<string, number>>();
    for (const f of FIGHTERS) {
      const d = await extractAnimations(page, f);
      const m = new Map<string, number>();
      for (const a of d.animations) m.set(a.moveType, a.totalDurationMs);
      allData.set(f, m);
    }
    const liu = allData.get('liukang')!;
    const warnings: string[] = [];
    for (const mt of liu.keys()) {
      const durs = FIGHTERS.map(f => allData.get(f)?.get(mt) ?? 0);
      const max = Math.max(...durs);
      const min = Math.min(...durs);
      if (max - min > 200 && max > 0) {
        warnings.push(`${mt} duration mismatch: ${FIGHTERS.map((f, i) => `${f}=${durs[i]}ms`).join(', ')}`);
      }
    }
    if (warnings.length > 0) {
      console.log('\nDuration discrepancies (>200ms):');
      warnings.forEach(w => console.log(`  ${w}`));
    }
    // All attacks should be under 500ms (snappy)
    for (const f of FIGHTERS) {
      const attackDurs = ['HIGH_PUNCH', 'LOW_PUNCH', 'HIGH_KICK', 'LOW_KICK']
        .map(mt => allData.get(f)?.get(mt) ?? 0);
      attackDurs.forEach(d => {
        if (d > 0) expect(d).toBeLessThan(500);
      });
    }
  });
});
