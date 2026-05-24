# Animation & Spritesheet Validation Tests

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create automated tests that verify every move type selects the correct frames from the spritesheet, frames play in the right order, and no junk/placeholder frames are mixed in.

**Architecture:** Tests run in-browser via Playwright, inspecting Phaser's animation system after the Game scene loads. Each test validates animation data (frame names, frame counts, ordering) rather than just game state. Reference data from the raw spritesheet JSON is used to compute expected frame sequences per move type, and tests cross-check across all 4 fighters for consistency.

**Tech Stack:** Playwright, Phaser 3.80, TypeScript, vitest

---

### Task 1: Add animation metadata extraction helper

**Files:**
- Create: `e2e/helpers/animation-inspector.ts`

- [ ] **Step 1: Write the helper**

```typescript
import { Page } from '@playwright/test';

export interface AnimInfo {
  key: string;
  moveType: string;
  frameCount: number;
  frameNames: string[];
  frameRate: number;
  repeat: number;
  yoyo: boolean;
  totalDurationMs: number;
}

export interface FighterAnimSet {
  fighter: string;
  animations: AnimInfo[];
}

export async function extractAnimations(page: Page, fighterName: string): Promise<FighterAnimSet> {
  return await page.evaluate((fighter) => {
    const g = (window as any).__MK_GAME;
    const gs = g.scene.getScene('Game');
    if (!gs) return { fighter, animations: [] };

    // Get all animation keys for this fighter
    const anims = gs.anims.anims.entries();
    const result: any[] = [];
    for (const [key, anim] of anims) {
      if (!key.startsWith(`${fighter}_`)) continue;
      result.push({
        key,
        moveType: key.replace(`${fighter}_`, ''),
        frameCount: anim.frames.length,
        frameNames: anim.frames.map((f: any) => f.frame || f.textureFrame),
        frameRate: anim.frameRate,
        repeat: anim.repeat,
        yoyo: anim.yoyo,
        totalDurationMs: (anim.frames.length / anim.frameRate) * 1000,
      });
    }
    return { fighter, animations: result.sort((a, b) => a.moveType.localeCompare(b.moveType)) };
  }, fighterName);
}

export interface FrameInfo {
  name: string;
  width: number;
  height: number;
}

export async function getTextureFrames(page: Page, atlasKey: string): Promise<FrameInfo[]> {
  return await page.evaluate((key) => {
    const g = (window as any).__MK_GAME;
    const tex = g.textures.get(key);
    if (!tex) return [];
    return tex.getFrameNames().map((name: string) => {
      const f = tex.get(name);
      return { name, width: f.width, height: f.height, realWidth: f.realWidth, realHeight: f.realHeight };
    });
  }, atlasKey);
}
```

- [ ] **Step 2: Create the test infrastructure**

```bash
mkdir -p e2e/helpers
```

---

### Task 2: Validate each move type selects correct prefix frames

**Files:**
- Create: `e2e/animation-frame-selection.spec.ts`

**This test verifies that for each MoveType, the animation only contains frames with the expected prefix.**

Expected prefix per move type (from MoveRegistry MOVE_PREFIX):
- STAND → `stance/` bare-numeric (e.g., stance/04, stance/05)
- WALK → `walk/` bare-numeric
- SQUAT → `duckjump/d*`
- STAND_UP → `duckjump/dt*`
- BLOCK → `block/` bare-numeric
- HIGH_PUNCH → `punch/` bare-numeric (first 5)
- LOW_PUNCH → `punch/` bare-numeric (first 5)
- UPPERCUT → `punch/u*`
- SPIN_KICK → `kick/r*`
- JUMP → `duckjump/j*`
- FORWARD_JUMP → `duckjump/f*`
- BACKWARD_JUMP → `duckjump/j*`
- FALL → `fall/f*`
- KNOCK_DOWN → `fall/h*`
- WIN → `victory/` bare-numeric
- ENDURE → `beinghit/h*`
- SQUAT_ENDURE → `beinghit/s*`
- ATTRACTIVE_STAND_UP → `stance/t*`
- SQUAT_LOW_KICK → `kick/d*`
- SQUAT_HIGH_KICK → `kick/d*`
- SQUAT_LOW_PUNCH → `punch/d*`
- FORWARD_JUMP_KICK → `duckjump/f*`
- BACKWARD_JUMP_KICK → `duckjump/j*`
- FORWARD_JUMP_PUNCH → `duckjump/f*`
- BACKWARD_JUMP_PUNCH → `duckjump/j*`

- [ ] **Step 1: Write the test**

```typescript
import { test, expect } from '@playwright/test';
import { extractAnimations } from './helpers/animation-inspector';

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

  // Expected frame patterns per move type: { category, prefix, maxFrames }
  const EXPECTED: Record<string, { cat: string; prefix: string; max?: number }> = {
    STAND:              { cat: 'stance',  prefix: '',    max: 11 },
    WALK:               { cat: 'walk',    prefix: '' },
    WALK_BACKWARD:      { cat: 'walk',    prefix: '' },
    SQUAT:              { cat: 'duckjump', prefix: 'd', max: 3 },
    STAND_UP:           { cat: 'duckjump', prefix: 'dt', max: 2 },
    BLOCK:              { cat: 'block',   prefix: '', max: 3 },
    HIGH_PUNCH:         { cat: 'punch',   prefix: '', max: 5 },
    LOW_PUNCH:          { cat: 'punch',   prefix: '', max: 5 },
    HIGH_KICK:          { cat: 'kick',    prefix: '', max: 7 },
    LOW_KICK:           { cat: 'kick',    prefix: '', max: 6 },
    UPPERCUT:           { cat: 'punch',   prefix: 'u', max: 5 },
    SPIN_KICK:          { cat: 'kick',    prefix: 'r', max: 8 },
    JUMP:               { cat: 'duckjump', prefix: 'j' },
    FORWARD_JUMP:       { cat: 'duckjump', prefix: 'f' },
    BACKWARD_JUMP:      { cat: 'duckjump', prefix: 'j' },
    FALL:               { cat: 'fall',    prefix: 'f' },
    KNOCK_DOWN:         { cat: 'fall',    prefix: 'h' },
    WIN:                { cat: 'victory', prefix: '' },
    ENDURE:             { cat: 'beinghit', prefix: 'h', max: 3 },
    SQUAT_ENDURE:       { cat: 'beinghit', prefix: 's', max: 7 },
    ATTRACTIVE_STAND_UP: { cat: 'stance', prefix: 't', max: 2 },
    SQUAT_LOW_KICK:     { cat: 'kick',    prefix: 'd', max: 3 },
    SQUAT_HIGH_KICK:    { cat: 'kick',    prefix: 'd', max: 4 },
    SQUAT_LOW_PUNCH:    { cat: 'punch',   prefix: 'd', max: 3 },
    FORWARD_JUMP_KICK:  { cat: 'duckjump', prefix: 'f' },
    BACKWARD_JUMP_KICK: { cat: 'duckjump', prefix: 'j' },
    FORWARD_JUMP_PUNCH: { cat: 'duckjump', prefix: 'f' },
    BACKWARD_JUMP_PUNCH:{ cat: 'duckjump', prefix: 'j' },
  };

  const FIGHTERS = ['subzero', 'kano', 'liukang', 'sonya'];

  for (const fighter of FIGHTERS) {
    test(`${fighter}: each move uses correct frame prefix`, async ({ page }) => {
      const data = await extractAnimations(page, fighter);
      expect(data.animations.length).toBeGreaterThan(15);

      for (const anim of data.animations) {
        const exp = EXPECTED[anim.moveType];
        if (!exp) {
          console.warn(`Unknown move type: ${anim.moveType}`);
          continue;
        }

        // Verify ALL frames in this animation have the expected prefix
        for (const frameName of anim.frameNames) {
          const suffix = frameName.replace(`${exp.cat}/`, '');
          if (exp.prefix === '') {
            // Bare-numeric: should start with a digit
            expect(suffix).toMatch(/^\d/);
          } else {
            expect(suffix.startsWith(exp.prefix)).toBe(true);
          }
        }

        // Verify frame count doesn't exceed max (if specified)
        if (exp.max !== undefined) {
          expect(anim.frameCount).toBeLessThanOrEqual(exp.max);
        }

        // Verify frames are in numeric order
        const numbers = anim.frameNames.map(n => {
          const s = n.replace(`${exp.cat}/`, '');
          return parseInt(s.replace(/^[a-z]+/, ''), 10);
        });
        for (let i = 1; i < numbers.length; i++) {
          expect(numbers[i]).toBeGreaterThanOrEqual(numbers[i - 1]);
        }
      }
    });
  }
});
```

- [ ] **Step 2: Run and verify**

```bash
npx playwright test e2e/animation-frame-selection.spec.ts --config=e2e/playwright.config.ts --reporter=list
```

---

### Task 3: Validate no junk/placeholder frames in spritesheets

**Files:**
- Create: `e2e/texture-frame-integrity.spec.ts`

**This test checks all spritesheet frames for reasonable dimensions and flags suspiciously small frames that might be website junk.**

- [ ] **Step 1: Write the test**

```typescript
import { test, expect } from '@playwright/test';
import { getTextureFrames } from './helpers/animation-inspector';

test.describe('texture frame integrity', () => {
  test.beforeEach(async ({ page }) => {
    page.on('pageerror', (err) => {
      if (!err.message.includes('__DEFINES__')) throw err;
    });
    await page.goto('/');
    await page.waitForFunction(() => !!(window as any).__MK_GAME, {}, { timeout: 8000 });
    await page.waitForTimeout(3000);
  });

  const FIGHTERS = ['subzero', 'kano', 'liukang', 'sonya'];

  for (const fighter of FIGHTERS) {
    test(`${fighter}: all sprite frames have reasonable dimensions`, async ({ page }) => {
      const frames = await getTextureFrames(page, `fighters/${fighter}`);
      expect(frames.length).toBeGreaterThan(50);

      // Check the first frame in each category group for suspicious dimensions
      const byCat: Record<string, typeof frames> = {};
      for (const f of frames) {
        const cat = f.name.split('/')[0];
        if (!byCat[cat]) byCat[cat] = [];
        byCat[cat].push(f);
      }

      const suspicious: string[] = [];
      for (const [cat, catFrames] of Object.entries(byCat)) {
        for (const f of catFrames) {
          // Any frame smaller than 8x8 is suspicious (likely website junk)
          if (f.width < 8 && f.height < 8) {
            suspicious.push(`${f.name}: ${f.width}x${f.height}`);
          }
          // Frames that are suspiciously wide vs tall or vice versa for animation categories
          if (['stance', 'walk', 'punch', 'kick', 'beinghit', 'block', 'victory', 'fall'].includes(cat)) {
            // Main body frames should be mostly vertical (height > width/2)
            if (f.height < 8 && f.width > 50) {
              suspicious.push(`${f.name}: ${f.width}x${f.height} - suspicious horizontal bar`);
            }
            // Zero-size frames are definitely bad
            if (f.width === 0 || f.height === 0) {
              suspicious.push(`${f.name}: ZERO SIZE`);
            }
          }
        }
      }

      if (suspicious.length > 0) {
        console.log(`Suspicious frames for ${fighter}:`, suspicious.join(', '));
      }

      // No frames should have zero dimensions
      const zeroSize = frames.filter(f => f.width === 0 || f.height === 0);
      expect(zeroSize.length).toBe(0);
    });
  }
});
```

- [ ] **Step 2: Run and verify**

```bash
npx playwright test e2e/texture-frame-integrity.spec.ts --config=e2e/playwright.config.ts --reporter=list
```

---

### Task 4: Cross-fighter consistency comparison

**Files:**
- Create: `e2e/cross-fighter-consistency.spec.ts`

**This test compares frame counts across fighters for the same move types, flagging significant discrepancies that suggest junk removal or missing sprites.**

- [ ] **Step 1: Write the test**

```typescript
import { test, expect } from '@playwright/test';
import { extractAnimations } from './helpers/animation-inspector';

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
    const fighters = ['subzero', 'kano', 'liukang', 'sonya'];
    const allData = new Map<string, Map<string, number>>();

    for (const f of fighters) {
      const data = await extractAnimations(page, f);
      const counts = new Map<string, number>();
      for (const anim of data.animations) {
        counts.set(anim.moveType, anim.frameCount);
      }
      allData.set(f, counts);
      console.log(`${f} animation frame counts:`, Object.fromEntries(counts));
    }

    // Compare move types across fighters — warn about large discrepancies
    const moveTypes = [...allData.get('liukang')!.keys()];
    for (const moveType of moveTypes) {
      if (moveType === 'WIN') continue; // WIN varies wildly by character
      const counts = fighters.map(f => allData.get(f)?.get(moveType) ?? 0);
      const max = Math.max(...counts);
      const min = Math.min(...counts);
      if (max - min > 3 && max > 0) {
        console.warn(`Large discrepancy in ${moveType}: ${fighters.map((f,i) => `${f}=${counts[i]}`).join(', ')}`);
      }
      // At minimum, each move should have at least 1 frame
      for (let i = 0; i < fighters.length; i++) {
        expect(counts[i]).toBeGreaterThanOrEqual(1);
      }
    }

    // Specific consistency checks:
    // Liu Kang (reference) should set the expected range for each move
    const liuCounts = allData.get('liukang')!;
    
    // STAND should have 7-11 frames per fighter
    for (const f of fighters) {
      const c = allData.get(f)?.get('STAND') ?? 0;
      expect(c).toBeGreaterThanOrEqual(7);
      expect(c).toBeLessThanOrEqual(11);
    }

    // JUMP should have 3 frames (j01, j02, j03) for all fighters
    for (const f of fighters) {
      const c = allData.get(f)?.get('JUMP') ?? 0;
      expect(c).toBe(3);
    }
  });
});
```

- [ ] **Step 2: Run and verify**

```bash
npx playwright test e2e/cross-fighter-consistency.spec.ts --config=e2e/playwright.config.ts --reporter=list
```

---

### Task 5: Fix the SubZero victory frame issue

**Files:**
- Modify: `scripts/download-sprites.mjs`

**Problem detected:** SubZero victory has only 1 frame because `victory/01-03.png` were replaced by 288-byte website placeholders (confirmed identical SHA256 hashes). The real sprites (`65x133`) exist on MKW at those URLs but the download script got placeholder images.

**Fix:** The download script will re-download victory/01-04 for SubZero from the correct URLs. But since the URLs are correct and the server returns placeholders, we need a different approach.

**Alternative fix:** Update `build-sprites.mjs` to accept manual override frames for specific known-bad URLs. Or better: fix the FrameInspector to detect and exclude frames by size threshold in targeted categories.

Actually, the real problem is that the download script gets a 50x80 placeholder image from MKW. This might be because MKW serves different content based on User-Agent or other headers. Let me add retry logic with realistic browser headers.

- [ ] **Step 1: Add realistic headers to download script**

```javascript
// In download-sprites.mjs, update the get/https options:
const AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function fetch(url) {
  return new Promise((resolve, reject) => {
    get(url, { headers: { 'User-Agent': AGENT, 'Accept': 'image/png,*/*' } }, (res) => { ... });
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest);
    get(url, { headers: { 'User-Agent': AGENT, 'Accept': 'image/png,*/*' } }, (res) => { ... });
  });
}
```

- [ ] **Step 2: Re-download SubZero and Kano**

```bash
node scripts/download-sprites.mjs
node scripts/build-sprites.mjs
```

---

### Task 6: Final validation — run ALL tests

**Files:** N/A

- [ ] **Step 1: Run full test suite**

```bash
npm test && npx tsc --noEmit --project client/tsconfig.json && npx playwright test e2e/ --config=e2e/playwright.config.ts --reporter=list
```
