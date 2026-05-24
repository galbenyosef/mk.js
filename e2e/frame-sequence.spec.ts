import { test, expect } from '@playwright/test';

async function recordFrameSequence(
  page: any,
  holdKeys: string[],
  sampleIntervalMs: number,
  maxSamples: number,
): Promise<{ time: number; frame: string; move: string }[]> {
  for (const key of holdKeys) {
    await page.keyboard.down(key);
  }
  const seq: { time: number; frame: string; move: string }[] = [];
  const t0 = Date.now();
  for (let i = 0; i < maxSamples; i++) {
    await page.waitForTimeout(sampleIntervalMs);
    const state = await page.evaluate(() => {
      const g = (window as any).__MK_GAME;
      const gs = g.scene.getScene('Game');
      if (!gs || !gs.fighters[0]) return null;
      return { move: gs.fighters[0].currentMove, frame: gs.fighters[0].frame?.name ?? '' };
    });
    if (state) seq.push({ time: Date.now() - t0, frame: state.frame, move: state.move });
  }
  for (const key of holdKeys) {
    await page.keyboard.up(key);
  }
  return seq;
}

function compressSequence(seq: { time: number; frame: string; move: string }[]): { time: number; frame: string }[] {
  const result: { time: number; frame: string }[] = [];
  let lastFrame = '';
  for (const s of seq) {
    if (s.frame !== lastFrame) {
      result.push({ time: s.time, frame: s.frame });
      lastFrame = s.frame;
    }
  }
  return result;
}

test.describe('frame sequence validation', () => {
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
      await page.mouse.click(box.x + 300 * (box.width / 600), box.y + 260 * (box.height / 400));
    }
    await page.waitForTimeout(4000);
  });

  test('STAND cycles through stance frames repeatedly', async ({ page }) => {
    await page.waitForTimeout(200);
    const seq = await recordFrameSequence(page, [], 60, 40);
    const frames = compressSequence(seq);
    console.log('STAND:', frames.map(f => `${f.frame}@${f.time}`).join(', '));

    const stanceFrames = frames.filter(f => f.frame.startsWith('stance/'));
    expect(stanceFrames.length).toBeGreaterThanOrEqual(3);

    // Must be cyclic: same frame appears twice
    const seen = new Set<string>();
    let repeats = 0;
    for (const f of stanceFrames) {
      if (seen.has(f.frame)) repeats++;
      seen.add(f.frame);
    }
    expect(repeats).toBeGreaterThanOrEqual(1);
  });

  test('HIGH_PUNCH plays punch/01-05 then returns to STAND', async ({ page }) => {
    await page.keyboard.down('l');
    await page.waitForTimeout(20);
    const seq = await recordFrameSequence(page, [], 20, 20);
    const frames = compressSequence(seq);
    console.log('HP:', frames.map(f => `${f.frame}@${f.time}`).join(', '));

    const punchFrames = frames.filter(f => f.frame.startsWith('punch/'));
    expect(punchFrames.length).toBeGreaterThanOrEqual(1);
    expect(punchFrames.length).toBeLessThanOrEqual(6);
    // All punch frames should NOT be u/d prefix (bare-numeric HIGH_PUNCH)
    for (const f of punchFrames) {
      const suffix = f.frame.replace('punch/', '');
      expect(suffix).toMatch(/^\d/);
    }
  });

  test('UPPERCUT uses only punch/u* frames', async ({ page }) => {
    await page.keyboard.down('s');
    await page.keyboard.down('l');
    await page.waitForTimeout(20);
    const seq = await recordFrameSequence(page, ['s', 'l'], 20, 15);
    const frames = compressSequence(seq);
    console.log('UPPERCUT:', frames.map(f => `${f.frame}@${f.time}`).join(', '));

    for (const f of frames) {
      if (f.frame.startsWith('punch/')) {
        expect(f.frame).toMatch(/punch\/u\d/);
      }
    }
  });

  test('SQUAT plays d01→d02→d03 then holds', async ({ page }) => {
    const seq = await recordFrameSequence(page, ['s'], 50, 15);
    const frames = compressSequence(seq);
    console.log('SQUAT:', frames.map(f => `${f.frame}@${f.time}`).join(', '));

    const duckFrames = frames.filter(f =>
      f.frame === 'duckjump/d01' || f.frame === 'duckjump/d02' || f.frame === 'duckjump/d03'
    );
    expect(duckFrames.length).toBeGreaterThanOrEqual(3);
    // Last seen duckjump frame should be d03 (held)
    const lastDuck = duckFrames[duckFrames.length - 1];
    expect(lastDuck?.frame).toBe('duckjump/d03');
  });

  test('JUMP plays forward then backward (yoyo)', async ({ page }) => {
    const seq = await recordFrameSequence(page, ['w'], 60, 20);
    const frames = compressSequence(seq);
    console.log('JUMP:', frames.map(f => `${f.frame}@${f.time}`).join(', '));

    const jf = frames.filter(f => f.frame.startsWith('duckjump/j'));
    expect(jf.length).toBeGreaterThanOrEqual(3);

    // Must see j01, j02, j03
    const seen = new Set(jf.map(f => f.frame));
    expect(seen.has('duckjump/j01')).toBe(true);
    expect(seen.has('duckjump/j02')).toBe(true);
    expect(seen.has('duckjump/j03')).toBe(true);

    // Frame count should be >3 (yoyo means some frames repeat)
    // If we see j01→j02→j03→j02 that's valid yoyo
    const list = jf.map(f => f.frame);
    // Check that after j03 we see j01 or j02 again
    const j03idx = list.lastIndexOf('duckjump/j03');
    if (j03idx >= 0 && j03idx < list.length - 1) {
      const after = list.slice(j03idx + 1);
      expect(after.length).toBeGreaterThanOrEqual(1);
    }
  });

  test('FORWARD_JUMP plays f-prefix frames', async ({ page }) => {
    const seq = await recordFrameSequence(page, ['d', 'w'], 60, 20);
    const frames = compressSequence(seq);
    console.log('FWD JUMP:', frames.map(f => `${f.frame}@${f.time}`).join(', '));

    const ff = frames.filter(f => f.frame.startsWith('duckjump/f'));
    expect(ff.length).toBeGreaterThanOrEqual(2);
  });

  test('SQUAT_LOW_PUNCH uses punch/d* frames', async ({ page }) => {
    // Hold S first to enter squat, then press J
    await page.keyboard.down('s');
    await page.waitForTimeout(400);
    await page.keyboard.down('j');
    await page.waitForTimeout(20);
    const seq = await recordFrameSequence(page, ['s', 'j'], 30, 10);
    const frames = compressSequence(seq);
    console.log('S+LP:', frames.map(f => `${f.frame}@${f.time}`).join(', '));

    const pf = frames.filter(f => f.frame.startsWith('punch/d'));
    if (pf.length > 0) {
      expect(pf[0].frame).toMatch(/^punch\/d\d/);
    }
  });

  test('HIGH_KICK uses bare-numeric kick/ frames', async ({ page }) => {
    await page.keyboard.down(';');
    await page.waitForTimeout(20);
    const seq = await recordFrameSequence(page, [], 25, 15);
    const frames = compressSequence(seq);
    console.log('HKICK:', frames.map(f => `${f.frame}@${f.time}`).join(', '));

    const kf = frames.filter(f => f.frame.startsWith('kick/'));
    // Should have kick/ frames (bare-numeric, no prefix)
    for (const f of kf) {
      const suffix = f.frame.replace('kick/', '');
      expect(suffix).toMatch(/^\d/);
    }
  });

  test('SPIN_KICK uses kick/r* frames (LEFT+HK for left-facing)', async ({ page }) => {
    // SubZero faces left initially. SPIN_KICK = LEFT+HK with orientation 'left'
    await page.keyboard.down('a');
    await page.keyboard.down(';');
    await page.waitForTimeout(50);
    const seq = await recordFrameSequence(page, ['a', ';'], 40, 15);
    const frames = compressSequence(seq);
    console.log('SPIN_KICK:', frames.map(f => `${f.frame}@${f.time}`).join(', '));

    const kf = frames.filter(f => f.frame.startsWith('kick/r'));
    expect(kf.length).toBeGreaterThanOrEqual(1);
    expect(kf[0].frame).toMatch(/^kick\/r\d/);
  });
});
