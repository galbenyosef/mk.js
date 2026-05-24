# Game Testing Stack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 5-layer testing stack (deterministic engine, visual regression, debug overlays, input replay, diagnostics scene) on top of the existing Phaser 3 mk.js game.

**Architecture:** Each layer is independently verifiable. Layers 1 + 4 (determinism + replay) integrate into the game core; Layer 2 (visual regression) extends the existing Playwright E2E setup; Layer 3 (debug overlays) is a self-contained class instantiated in GameScene; Layer 5 (diagnostics) is a standalone Phaser scene. No existing tests are modified.

**Tech Stack:** Phaser 3.80+, TypeScript, Vite, Vitest, Playwright 1.60, pixelmatch, pngjs

---

## File Structure

```
New files:
  client/src/config.ts                                    # isDeterministic() + isDiagnostics() helpers
  client/src/debug/DebugOverlay.ts                        # F1-F6 key toggles, graphics overlay
  client/src/scenes/DiagnosticsScene.ts                   # Full frame grid + animation looping scene
  e2e/replay/ReplayController.ts                         # Playback-only input event replay
  e2e/helpers/replay.ts                                  # injectReplay() Playwright helper
  e2e/helpers/pixelmatch.ts                              # pixelmatch diff utility
  e2e/visual-regression.config.ts                        # Threshold config
  e2e/visual-regression.spec.ts                          # Playwright visual regression spec
  e2e/replay-fixtures/subzero-walk-right.json            # Example: walk right 500ms
  e2e/replay-fixtures/kano-high-punch.json               # Example: high punch

Modified files:
  shared/src/types.ts                                    # Add deterministicMode, replayFile to GameOptions
  client/src/main.ts                                     # Deterministic mode in Phaser config + scene array
  client/src/scenes/GameScene.ts                         # Instantiate DebugOverlay, handle replayFile
  client/src/scenes/BootScene.ts                         # Handle ?scene=diagnostics redirect
  client/src/scenes/MenuScene.ts                         # "Diagnostics" button
  package.json                                           # pixelmatch + pngjs deps, test:visual scripts
```

---

### Task 1: Install pixelmatch and pngjs dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add dependencies**

```bash
npm install --save-dev pixelmatch pngjs
```

- [ ] **Step 2: Verify install**

```bash
ls node_modules/pixelmatch && ls node_modules/pngjs
```
Expected: both directories exist

- [ ] **Step 3: Verify types are available**

```bash
ls node_modules/pixelmatch/index.d.ts
```
Expected: file exists

- [ ] **Step 4: Add test scripts to package.json**

In `package.json`, replace the scripts block:

```json
"scripts": {
  "dev": "echo 'no dev script configured yet'",
  "build": "npm run build --workspaces",
  "build:assets": "echo 'no assets to build yet'",
  "start:server": "echo 'no server to start yet'",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:visual": "playwright test --config e2e/playwright.config.ts --grep visual",
  "test:visual:update": "cross-env UPDATE_GOLDENS=1 playwright test --config e2e/playwright.config.ts --grep visual"
},
```

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add pixelmatch and pngjs deps, add test:visual scripts"
```

---

### Task 2: Add deterministicMode and replayFile to GameOptions

**Files:**
- Modify: `shared/src/types.ts`

- [ ] **Step 1: Add fields to GameOptions**

Edit `shared/src/types.ts` — add two optional fields to the `GameOptions` interface:

```typescript
export interface GameOptions {
  mode: 'local' | 'network' | 'ai' | 'basic';
  p1Fighter: string;
  p2Fighter: string;
  arena: string;
  gameName?: string;
  isHost?: boolean;
  deterministicMode?: boolean;
  replayFile?: string;
}
```

- [ ] **Step 2: Verify types compile**

```bash
npx tsc --noEmit -p shared/tsconfig.json
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add shared/src/types.ts
git commit -m "feat: add deterministicMode and replayFile to GameOptions"
```

---

### Task 3: Create determinism/diagnostics config helper

**Files:**
- Create: `client/src/config.ts`

- [ ] **Step 1: Create config.ts**

```typescript
export function isDeterministic(): boolean {
  if (typeof window !== 'undefined' && (window as any).__MK_DETERMINISTIC === true) {
    return true;
  }
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('deterministic') === '1';
  } catch {
    return false;
  }
}

export function getDiagnosticsScene(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('scene') === 'diagnostics' ? 'diagnostics' : null;
  } catch {
    return null;
  }
}

export function getReplayFile(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('replay');
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit -p client/tsconfig.json
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add client/src/config.ts
git commit -m "feat: add determinism and diagnostics config helpers"
```

---

### Task 4: Wire deterministic mode into Phaser config

**Files:**
- Modify: `client/src/main.ts`

- [ ] **Step 1: Import config helpers and wire up**

Edit `client/src/main.ts` — replace the entire file content:

```typescript
import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { PreloadScene } from './scenes/PreloadScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { LobbyScene } from './scenes/LobbyScene.js';
import { GameScene } from './scenes/GameScene.js';
import { isDeterministic } from './config.js';

declare global {
  interface Window { __MK_GAME?: Phaser.Game; __MK_DETERMINISTIC?: boolean; }
}

const deterministic = isDeterministic();

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 600,
  height: 400,
  parent: 'game-container',
  backgroundColor: '#000000',
  scene: [BootScene, PreloadScene, MenuScene, LobbyScene, GameScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  ...(deterministic ? {
    fps: { target: 60, forceSetTimeOut: true },
  } : {}),
};

const game = new Phaser.Game(config);

if (deterministic) {
  Phaser.Math.RND.sow(['mk-test-1234']);
  game.loop.sleep();
  game.loop.wake();
}

window.__MK_GAME = game;
```

- [ ] **Step 2: Verify the build compiles**

```bash
npx tsc --noEmit -p client/tsconfig.json
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add client/src/main.ts
git commit -m "feat: wire deterministic mode into Phaser config (seeded RNG + fixed 60fps)"
```

---

### Task 5: Create DebugOverlay class

**Files:**
- Create: `client/src/debug/DebugOverlay.ts`

- [ ] **Step 1: Create the class**

```typescript
import Phaser from 'phaser';
import type { Fighter } from '../entities/Fighter.js';

interface OverlayState {
  hitboxes: boolean;
  spriteBounds: boolean;
  origins: boolean;
  atlasFrames: boolean;
  animationState: boolean;
}

const KEY_BINDINGS: Record<number, keyof OverlayState> = {
  112: 'hitboxes',      // F1
  113: 'spriteBounds',  // F2
  114: 'origins',       // F3
  115: 'atlasFrames',   // F4
  116: 'animationState', // F5
  117: '__all__',       // F6
};

export class DebugOverlay {
  private _gfx: Phaser.GameObjects.Graphics;
  private _state: OverlayState = {
    hitboxes: false,
    spriteBounds: false,
    origins: false,
    atlasFrames: false,
    animationState: false,
  };
  private _texts: Phaser.GameObjects.Text[] = [];
  private _fighters: [Fighter, Fighter];

  constructor(scene: Phaser.Scene, fighters: [Fighter, Fighter]) {
    this._fighters = fighters;
    this._gfx = scene.add.graphics();
    this._gfx.setDepth(9999);
    this._gfx.setVisible(false);

    scene.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
      const binding = KEY_BINDINGS[event.keyCode];
      if (!binding) return;

      if (binding === '__all__') {
        const allOn = Object.values(this._state).some((v) => !v);
        for (const k of Object.keys(this._state) as (keyof OverlayState)[]) {
          this._state[k] = allOn;
        }
      } else {
        this._state[binding] = !this._state[binding];
      }
    });

    scene.events.on('postupdate', () => this._draw());
  }

  private _draw(): void {
    const anyOn = Object.values(this._state).some((v) => v);
    this._gfx.setVisible(anyOn);
    for (const t of this._texts) t.setVisible(anyOn);
    if (!anyOn) return;

    this._gfx.clear();
    for (const t of this._texts) t.destroy();
    this._texts = [];

    for (const f of this._fighters) {
      const bounds = f.getBounds();

      if (this._state.hitboxes) {
        this._gfx.lineStyle(1, 0xff0000, 0.8);
        this._gfx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
      }

      if (this._state.spriteBounds) {
        this._gfx.lineStyle(1, 0xffff00, 0.7);
        this._gfx.strokeRect(f.x - f.displayWidth / 2, f.y - f.displayHeight,
          f.displayWidth, f.displayHeight);
      }

      if (this._state.origins) {
        this._gfx.lineStyle(1, 0x00ff00, 0.8);
        this._gfx.strokeCircle(f.x, f.y, 3);
        const label = f.scene.add.text(f.x + 5, f.y + 5,
          `(${Math.round(f.x)},${Math.round(f.y)})`, {
            fontFamily: 'monospace', fontSize: '10px', color: '#00ff00',
            backgroundColor: 'rgba(0,0,0,0.6)',
          }).setDepth(10000);
        this._texts.push(label);
      }

      if (this._state.atlasFrames) {
        const frameName = f.frame?.name?.toString() ?? '?';
        const atlasKey = f.texture?.key ?? '?';
        const label = f.scene.add.text(f.x, f.y - f.displayHeight - 10,
          `${frameName} @ ${atlasKey}`, {
            fontFamily: 'monospace', fontSize: '9px', color: '#00ccff',
            backgroundColor: 'rgba(0,0,0,0.7)',
          }).setOrigin(0.5, 1).setDepth(10000);
        this._texts.push(label);
      }

      if (this._state.animationState) {
        const anim = f.anims?.currentAnim;
        const info = anim
          ? `${anim.key}[${f.anims.currentFrame?.index ?? 0}/${anim.frames.length}] ${Math.round((f.anims.getProgress?.() ?? 0) * 100)}%`
          : 'no anim';
        const label = f.scene.add.text(f.x, f.y - f.displayHeight - 22,
          info, {
            fontFamily: 'monospace', fontSize: '9px', color: '#ffcc00',
            backgroundColor: 'rgba(0,0,0,0.7)',
          }).setOrigin(0.5, 1).setDepth(10000);
        this._texts.push(label);
      }
    }
  }
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit -p client/tsconfig.json
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add client/src/debug/DebugOverlay.ts
git commit -m "feat: add DebugOverlay with F1-F6 toggle overlays"
```

---

### Task 6: Instantiate DebugOverlay in GameScene

**Files:**
- Modify: `client/src/scenes/GameScene.ts`

- [ ] **Step 1: Import and instantiate DebugOverlay**

In `GameScene.ts`, add import at top:

```typescript
import { DebugOverlay } from '../debug/DebugOverlay.js';
```

Add one line to `create()`, right after `this.fighters` is assigned (after line 45):

```typescript
this.fighters = [
  new Fighter(this, 150, CONFIG.PLAYER_TOP, this.options.p1Fighter, 0, 'left'),
  new Fighter(this, 450, CONFIG.PLAYER_TOP, this.options.p2Fighter, 1, 'right'),
];

// Add this line:
new DebugOverlay(this, this.fighters);
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit -p client/tsconfig.json
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add client/src/scenes/GameScene.ts
git commit -m "feat: instantiate DebugOverlay in GameScene"
```

---

### Task 7: Create ReplayController

**Files:**
- Create: `e2e/replay/ReplayController.ts`

The ReplayController implements the `BaseController` interface from `client/src/controllers/BaseController.ts`. It must provide `update()` and `destroy()` methods. Since it's used in Playwright tests that inject code via `page.evaluate`, it needs to be a standalone module (not importing from client/src).

- [ ] **Step 1: Create ReplayController**

```typescript
export interface ReplayEvent {
  t: number;
  key: string;
  action: 'down' | 'up';
}

export interface InputState {
  LEFT: boolean;
  RIGHT: boolean;
  UP: boolean;
  DOWN: boolean;
  A: boolean;
  B: boolean;
  C: boolean;
  D: boolean;
}

const NONE: InputState = {
  LEFT: false, RIGHT: false, UP: false, DOWN: false,
  A: false, B: false, C: false, D: false,
};

export class ReplayController {
  private _events: ReplayEvent[];
  private _startTime: number = 0;
  private _state: InputState = { ...NONE };
  private _idx: number = 0;

  constructor(events: ReplayEvent[]) {
    this._events = [...events].sort((a, b) => a.t - b.t);
  }

  start(): void {
    this._startTime = Date.now();
    this._state = { ...NONE };
    this._idx = 0;
  }

  getState(): InputState {
    const elapsed = Date.now() - this._startTime;
    while (this._idx < this._events.length && this._events[this._idx].t <= elapsed) {
      const evt = this._events[this._idx];
      const key = evt.key as keyof InputState;
      if (key in this._state) {
        this._state[key] = evt.action === 'down';
      }
      this._idx++;
    }
    return this._state;
  }

  update(): void {}
  destroy(): void {}
}
```

- [ ] **Step 2: Verify it compiles standalone (no client imports)**

```bash
npx tsc --noEmit --lib dom,es2020 --strict --moduleResolution node e2e/replay/ReplayController.ts
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add e2e/replay/ReplayController.ts
git commit -m "feat: add ReplayController for input event playback"
```

---

### Task 8: Create replay fixtures and Playwright helper

**Files:**
- Create: `e2e/replay-fixtures/subzero-walk-right.json`
- Create: `e2e/replay-fixtures/kano-high-punch.json`
- Create: `e2e/helpers/replay.ts`

- [ ] **Step 1: Create subzero-walk-right fixture**

`e2e/replay-fixtures/subzero-walk-right.json`:

```json
[
  { "t": 0,    "key": "RIGHT", "action": "down" },
  { "t": 500,  "key": "RIGHT", "action": "up" }
]
```

- [ ] **Step 2: Create kano-high-punch fixture**

`e2e/replay-fixtures/kano-high-punch.json`:

```json
[
  { "t": 0,    "key": "A", "action": "down" },
  { "t": 100,  "key": "A", "action": "up" }
]
```

- [ ] **Step 3: Create Playwright replay helper**

`e2e/helpers/replay.ts`:

```typescript
import type { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import type { ReplayEvent } from '../replay/ReplayController.js';

export async function injectReplay(page: Page, fixtureName: string): Promise<void> {
  const fixturePath = path.resolve(__dirname, '..', 'replay-fixtures', fixtureName);
  const raw = fs.readFileSync(fixturePath, 'utf-8');
  const events: ReplayEvent[] = JSON.parse(raw);

  await page.evaluate((eventsJson) => {
    const events = JSON.parse(eventsJson);
    class ReplayController {
      private _events: any[];
      private _startTime: number = 0;
      private _state: any = { LEFT: false, RIGHT: false, UP: false, DOWN: false, A: false, B: false, C: false, D: false };
      private _idx: number = 0;
      constructor(evts: any[]) {
        this._events = [...evts].sort((a, b) => a.t - b.t);
      }
      start() { this._startTime = Date.now(); this._state = { LEFT: false, RIGHT: false, UP: false, DOWN: false, A: false, B: false, C: false, D: false }; this._idx = 0; }
      getState() {
        const elapsed = Date.now() - this._startTime;
        while (this._idx < this._events.length && this._events[this._idx].t <= elapsed) {
          const evt = this._events[this._idx];
          if (evt.key in this._state) this._state[evt.key] = evt.action === 'down';
          this._idx++;
        }
        return this._state;
      }
      update() {}
      destroy() {}
    }

    const controller = new ReplayController(events);
    controller.start();
    (window as any).__MK_REPLAY = controller;
  }, JSON.stringify(events));
}

export function loadReplayFixture(fixtureName: string): ReplayEvent[] {
  const fixturePath = path.resolve(__dirname, '..', 'replay-fixtures', fixtureName);
  const raw = fs.readFileSync(fixturePath, 'utf-8');
  return JSON.parse(raw);
}
```

- [ ] **Step 4: Verify no TypeScript errors**

```bash
npx tsc --noEmit -p e2e/playwright.config.ts 2>&1 || npx tsc --noEmit --lib dom,es2020 --moduleResolution node e2e/helpers/replay.ts
```

- [ ] **Step 5: Commit**

```bash
git add e2e/replay-fixtures/ e2e/helpers/replay.ts
git commit -m "feat: add replay fixtures and Playwright inject helper"
```

---

### Task 9: Wire ReplayController into GameScene

**Files:**
- Modify: `client/src/scenes/GameScene.ts`

In deterministic mode with a replay file, we inject the ReplayController and use it to drive P1 keyboard input.

- [ ] **Step 1: Import config helpers**

In `GameScene.ts`, add import:

```typescript
import { getReplayFile } from '../config.js';
```

- [ ] **Step 2: Add InputState type inline**

In `GameScene.ts`, add this interface above the class (since the `ReplayController` types live in `e2e/` and can't be imported from `client/`):

```typescript
interface ReplayInputState {
  LEFT: boolean;
  RIGHT: boolean;
  UP: boolean;
  DOWN: boolean;
  A: boolean;
  B: boolean;
  C: boolean;
  D: boolean;
}
```

- [ ] **Step 3: Add replay-driven keyboard processing**

In `GameScene.ts`, add a private field and modify `_processP1Keyboard`:

Add field after `_pressed` (after line 103):

```typescript
private _replayFile: string | null = null;
```

In `create()`, after the switch block and before `this.startRound(1)` (after line 63), add:

```typescript
this._replayFile = getReplayFile();
```

Modify `_processP1Keyboard()` (line 115) to check for replay:

```typescript
private _processP1Keyboard(): void {
  // In replay mode, use the injected replay controller
  if (this._replayFile) {
    const replayCtrl = (window as any).__MK_REPLAY;
    if (!replayCtrl) return;
    const state: ReplayInputState = replayCtrl.getState();
    const f = this.fighters[0];
    const move = this._getReplayMove(state, f.currentMove);
    if (move !== undefined) {
      f.trySetMove(move);
    }
    return;
  }

  const f = this.fighters[0];
  const move = this._getP1Move(f.currentMove);
  if (move !== undefined) {
    f.trySetMove(move);
  }
}
```

- [ ] **Step 4: Add _getReplayMove method**

Add this method below `_getP1Move` (after the closing brace of `_getP1Move`):

```typescript
private _getReplayMove(state: ReplayInputState, currentMove: MoveType): MoveType | undefined {
  const m = MoveType;
  const jumping = currentMove === m.JUMP || currentMove === m.FORWARD_JUMP
    || currentMove === m.BACKWARD_JUMP || currentMove === m.FORWARD_JUMP_KICK
    || currentMove === m.BACKWARD_JUMP_KICK || currentMove === m.FORWARD_JUMP_PUNCH
    || currentMove === m.BACKWARD_JUMP_PUNCH;

  if (!state.LEFT && !state.RIGHT && !state.UP && !state.DOWN
    && !state.A && !state.B && !state.C && !state.D) {
    if (currentMove === m.SQUAT) return m.STAND_UP;
    return m.STAND;
  }
  // A=HP, B=LP, C=HK, D=LK — mirror the keyboard layout
  if (state.A) {
    if (state.DOWN) return m.UPPERCUT;
    if (state.UP || jumping) return m.FORWARD_JUMP_PUNCH;
    return m.HIGH_PUNCH;
  }
  if (state.B) {
    if (state.DOWN) return m.SQUAT_LOW_PUNCH;
    if (state.UP || jumping) return m.FORWARD_JUMP_PUNCH;
    return m.LOW_PUNCH;
  }
  if (state.C) {
    if (state.DOWN) return m.SQUAT_HIGH_KICK;
    if (state.UP || jumping) return m.FORWARD_JUMP_KICK;
    return m.HIGH_KICK;
  }
  if (state.D) {
    if (state.DOWN) return m.SQUAT_LOW_KICK;
    if (state.UP || jumping) return m.FORWARD_JUMP_KICK;
    return m.LOW_KICK;
  }
  // BLOCK not supported in replay for now — use CROUCH direction approach
  if (state.LEFT) {
    if (state.UP || jumping) return m.BACKWARD_JUMP;
    return m.WALK_BACKWARD;
  }
  if (state.RIGHT) {
    if (state.UP || jumping) return m.FORWARD_JUMP;
    return m.WALK;
  }
  if (state.DOWN) return m.SQUAT;
  if (state.UP) return m.JUMP;
  return undefined;
}
```

- [ ] **Step 5: Verify compilation**

```bash
npx tsc --noEmit -p client/tsconfig.json
```
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add client/src/scenes/GameScene.ts client/src/config.ts
git commit -m "feat: wire replay controller into GameScene"
```

---

### Task 10: Create pixelmatch helper for Playwright

**Files:**
- Create: `e2e/helpers/pixelmatch.ts`

- [ ] **Step 1: Create the pixelmatch utility**

```typescript
import * as fs from 'fs';
import * as path from 'path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const GOLDEN_DIR = path.resolve(__dirname, '..', 'golden');
const OUTPUT_DIR = path.resolve(__dirname, '..', 'output');
const ACTUAL_DIR = path.join(OUTPUT_DIR, 'actual');
const DIFF_DIR = path.join(OUTPUT_DIR, 'diff');

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export async function compareScreenshot(
  screenshotBuffer: Buffer,
  name: string,
  threshold: number = 0.001,
): Promise<{ passed: boolean; diffPixels: number; totalPixels: number }> {
  ensureDir(ACTUAL_DIR);
  ensureDir(DIFF_DIR);

  const actualPng = PNG.sync.read(screenshotBuffer);
  const actualPath = path.join(ACTUAL_DIR, `${name}.png`);
  fs.writeFileSync(actualPath, screenshotBuffer);

  const goldenPath = path.join(GOLDEN_DIR, `${name}.png`);

  if (process.env.UPDATE_GOLDENS === '1') {
    fs.mkdirSync(GOLDEN_DIR, { recursive: true });
    fs.writeFileSync(goldenPath, screenshotBuffer);
    return { passed: true, diffPixels: 0, totalPixels: actualPng.width * actualPng.height };
  }

  if (!fs.existsSync(goldenPath)) {
    throw new Error(`Golden image not found: ${goldenPath}. Run with UPDATE_GOLDENS=1 to create it.`);
  }

  const goldenPng = PNG.sync.read(fs.readFileSync(goldenPath));

  const { width, height } = actualPng;
  if (goldenPng.width !== width || goldenPng.height !== height) {
    throw new Error(`Size mismatch for ${name}: actual ${width}x${height}, golden ${goldenPng.width}x${goldenPng.height}`);
  }

  const diff = new PNG({ width, height });
  const diffPixels = pixelmatch(
    actualPng.data, goldenPng.data, diff.data, width, height,
    { threshold: 0.1, alpha: 0.1 },
  );

  const totalPixels = width * height;

  if (diffPixels > 0) {
    fs.writeFileSync(path.join(DIFF_DIR, `${name}.png`), PNG.sync.write(diff));
  }

  const diffRatio = diffPixels / totalPixels;
  return { passed: diffRatio <= threshold, diffPixels, totalPixels };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit --lib es2020 --module nodenext --moduleResolution nodenext e2e/helpers/pixelmatch.ts
```
Expected: no errors (the file uses dynamic imports, so it needs nodenext)

- [ ] **Step 3: Commit**

```bash
git add e2e/helpers/pixelmatch.ts
git commit -m "feat: add pixelmatch helper for Playwright visual regression"
```

---

### Task 11: Create visual regression config and spec

**Files:**
- Create: `e2e/visual-regression.config.ts`
- Create: `e2e/visual-regression.spec.ts`

- [ ] **Step 1: Create visual regression config**

`e2e/visual-regression.config.ts`:

```typescript
export const VISUAL_THRESHOLDS = {
  idle: 0.001,       // 0.1% — pixel-perfect idle frames
  animation: 0.005,  // 0.5% — mid-animation antialiasing tolerance
  movement: 0.02,    // 2%   — subpixel positioning tolerance
} as const;

export const VISUAL_TESTS: { name: string; threshold: number; replayFile?: string; waitMs: number }[] = [
  { name: 'subzero-idle',          threshold: VISUAL_THRESHOLDS.idle,      waitMs: 3000 },
  { name: 'kano-idle',             threshold: VISUAL_THRESHOLDS.idle,      waitMs: 3000 },
  { name: 'liukang-idle',          threshold: VISUAL_THRESHOLDS.idle,      waitMs: 3000 },
  { name: 'sonya-idle',            threshold: VISUAL_THRESHOLDS.idle,      waitMs: 3000 },
  { name: 'subzero-walk-right',    threshold: VISUAL_THRESHOLDS.movement,  replayFile: 'subzero-walk-right.json', waitMs: 2500 },
  { name: 'kano-high-punch',       threshold: VISUAL_THRESHOLDS.animation, replayFile: 'kano-high-punch.json',   waitMs: 2000 },
];
```

- [ ] **Step 2: Create visual regression spec**

`e2e/visual-regression.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { compareScreenshot } from './helpers/pixelmatch.js';
import { injectReplay } from './helpers/replay.js';
import { VISUAL_TESTS } from './visual-regression.config.js';

for (const { name, threshold, replayFile, waitMs } of VISUAL_TESTS) {
  test(`visual regression: ${name}`, async ({ page }) => {
    await page.goto('/?deterministic=1');
    await page.waitForFunction(() => !!(window as any).__MK_GAME, {}, { timeout: 8000 });
    await page.waitForTimeout(2000); // wait for menu

    if (replayFile) {
      // Click VS AI to enter game
      const canvas = page.locator('canvas');
      const box = await canvas.boundingBox();
      if (box) {
        const sx = box.width / 600;
        const sy = box.height / 400;
        await page.mouse.click(box.x + 300 * sx, box.y + 210 * sy);
      }
      await page.waitForTimeout(1000);

      await injectReplay(page, replayFile);
    } else {
      // For idle tests, click VS AI and wait for the fight countdown
      const canvas = page.locator('canvas');
      const box = await canvas.boundingBox();
      if (box) {
        const sx = box.width / 600;
        const sy = box.height / 400;
        await page.mouse.click(box.x + 300 * sx, box.y + 210 * sy);
      }
    }

    await page.waitForTimeout(waitMs);

    const screenshot = await page.screenshot();
    const result = await compareScreenshot(screenshot, name, threshold);

    if (!result.passed) {
      const pct = ((result.diffPixels / result.totalPixels) * 100).toFixed(2);
      expect(result.passed, `${name}: ${result.diffPixels}/${result.totalPixels} pixels differ (${pct}%) — threshold: ${threshold}`).toBe(true);
    }
  });
}
```

- [ ] **Step 3: Update .gitignore for output files**

In `.gitignore`, add:

```
e2e/output/
```

- [ ] **Step 4: Add .gitkeep to golden directory**

```bash
mkdir -p e2e/golden
touch e2e/golden/.gitkeep
```

- [ ] **Step 5: Commit**

```bash
git add e2e/visual-regression.config.ts e2e/visual-regression.spec.ts e2e/golden/.gitkeep .gitignore
git commit -m "feat: add visual regression config and Playwright spec"
```

---

### Task 12: Generate initial golden screenshots

This task is only run when you want to baseline. It will capture the current state (possibly buggy) as goldens.

- [ ] **Step 1: Start the dev server in the background**

In one terminal:

```bash
npm run dev --workspace=client
```

- [ ] **Step 2: Run visual tests with UPDATE_GOLDENS=1**

```bash
$env:UPDATE_GOLDENS='1'; npx playwright test --config e2e/playwright.config.ts --grep visual
```
Expected: all tests pass (goldens are created)

- [ ] **Step 3: Verify goldens were created**

```bash
ls e2e/golden/
```
Expected: `.gitkeep`, `subzero-idle.png`, `kano-idle.png`, `liukang-idle.png`, `sonya-idle.png`, `subzero-walk-right.png`, `kano-high-punch.png`

- [ ] **Step 4: Commit goldens**

```bash
git add e2e/golden/
git commit -m "test: add initial golden screenshots for visual regression"
```

---

### Task 13: Create DiagnosticsScene

**Files:**
- Create: `client/src/scenes/DiagnosticsScene.ts`

- [ ] **Step 1: Create DiagnosticsScene**

```typescript
import Phaser from 'phaser';
import { createAnimations } from '../moves/MoveRegistry.js';

const FIGHTERS = ['subzero', 'kano', 'liukang', 'sonya'];
const GRID_COLS = 8;
const GRID_SPACING = 6;
const SPRITE_SCALE = 1.5;

export class DiagnosticsScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Diagnostics' });
  }

  preload(): void {
    this.load.atlas('fighters/subzero', '/assets/build/subzero/spritesheet.png', '/assets/build/subzero/spritesheet.json');
    this.load.atlas('fighters/kano', '/assets/build/kano/spritesheet.png', '/assets/build/kano/spritesheet.json');
    this.load.atlas('fighters/liukang', '/assets/build/liukang/spritesheet.png', '/assets/build/liukang/spritesheet.json');
    this.load.atlas('fighters/sonya', '/assets/build/sonya/spritesheet.png', '/assets/build/sonya/spritesheet.json');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#111111');

    let yOffset = 20;

    for (const fighter of FIGHTERS) {
      const atlasKey = `fighters/${fighter}`;
      createAnimations(this, fighter, atlasKey);

      const texture = this.textures.get(atlasKey);
      const frameNames = texture.getFrameNames().sort();

      // Fighter header
      this.add.text(300, yOffset, fighter.toUpperCase(), {
        fontFamily: 'monospace', fontSize: '20px', color: '#ff0000', fontStyle: 'bold',
      }).setOrigin(0.5, 0);
      yOffset += 30;

      // Frame grid
      const frameSize = 40;
      for (let i = 0; i < frameNames.length; i++) {
        const col = i % GRID_COLS;
        const row = Math.floor(i / GRID_COLS);
        const x = 30 + col * (frameSize + GRID_SPACING);
        const y = yOffset + row * (frameSize + GRID_SPACING);

        const sprite = this.add.sprite(x + frameSize / 2, y + frameSize / 2, atlasKey, frameNames[i]);
        sprite.setOrigin(0.5, 0.5);
        sprite.setScale(Math.min(SPRITE_SCALE, frameSize / Math.max(sprite.width, sprite.height)));

        if (col === 0) {
          this.add.text(x - 5, y + frameSize / 2, String(i + 1), {
            fontFamily: 'monospace', fontSize: '8px', color: '#666',
          }).setOrigin(1, 0.5);
        }
      }

      yOffset += Math.ceil(frameNames.length / GRID_COLS) * (frameSize + GRID_SPACING) + 20;

      // Animation section
      this.add.text(300, yOffset, `${fighter.toUpperCase()} — Animations`, {
        fontFamily: 'monospace', fontSize: '16px', color: '#ff6666',
      }).setOrigin(0.5, 0);
      yOffset += 25;

      const animKeys = this.anims.getAnimationNames()
        .filter((k) => k.startsWith(`${fighter}_`));

      let animX = 20;
      for (const key of animKeys) {
        const shortName = key.replace(`${fighter}_`, '');
        const sprite = this.add.sprite(animX + 30, yOffset + 20, atlasKey);
        sprite.setOrigin(0.5, 0.5);
        sprite.setScale(SPRITE_SCALE);
        sprite.play(key);

        this.add.text(animX + 30, yOffset + 10 + frameSize, shortName, {
          fontFamily: 'monospace', fontSize: '9px', color: '#888',
        }).setOrigin(0.5, 0);

        animX += 90;
        if (animX > 560) {
          animX = 20;
          yOffset += 70;
        }
      }
      yOffset += 60;
    }

    // Set camera bounds for scrolling
    this.cameras.main.setBounds(0, 0, 600, Math.max(400, yOffset + 20));

    // Keyboard scrolling
    this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown') {
        this.cameras.main.scrollY = Math.min(this.cameras.main.scrollY + 20, this.cameras.main.getBounds().height - 400);
      } else if (event.key === 'ArrowUp') {
        this.cameras.main.scrollY = Math.max(this.cameras.main.scrollY - 20, 0);
      } else if (event.key === 'Escape') {
        this.scene.start('Menu');
      }
    });

    this.add.text(300, yOffset + 10, 'Arrow keys to scroll  |  ESC to return', {
      fontFamily: 'monospace', fontSize: '12px', color: '#555',
    }).setOrigin(0.5, 0);
  }
}
```

- [ ] **Step 2: Verify compilation**

```bash
npx tsc --noEmit -p client/tsconfig.json
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add client/src/scenes/DiagnosticsScene.ts
git commit -m "feat: add DiagnosticsScene with frame grid and animation viewer"
```

---

### Task 14: Wire DiagnosticsScene into BootScene, MenuScene, and main.ts

**Files:**
- Modify: `client/src/scenes/BootScene.ts`
- Modify: `client/src/scenes/MenuScene.ts`
- Modify: `client/src/main.ts` (scene registration)

- [ ] **Step 1: Add DiagnosticsScene to Phaser config in main.ts**

In `client/src/main.ts`, import and add to scene array:

```typescript
import { DiagnosticsScene } from './scenes/DiagnosticsScene.js';

// In the config:
scene: [BootScene, PreloadScene, MenuScene, LobbyScene, GameScene, DiagnosticsScene],
```

- [ ] **Step 2: Add ?scene=diagnostics redirect in BootScene**

Replace `client/src/scenes/BootScene.ts`:

```typescript
import Phaser from 'phaser';
import { getDiagnosticsScene } from '../config.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Boot' });
  }

  create(): void {
    const diagScene = getDiagnosticsScene();
    if (diagScene) {
      this.scene.start('Diagnostics');
    } else {
      this.scene.start('Preload');
    }
  }
}
```

- [ ] **Step 3: Add Diagnostics button in MenuScene**

In `client/src/scenes/MenuScene.ts`, in `create()`, after the modes section (before the closing brace of `create`), add:

```typescript
// Diagnostics button
const diagBtn = this.add.text(300, 370, 'DIAGNOSTICS', {
  fontFamily: 'monospace', fontSize: '14px', color: '#888888',
  backgroundColor: '#222', padding: { x: 12, y: 6 },
}).setOrigin(0.5).setInteractive({ useHandCursor: true });

diagBtn.on('pointerover', () => diagBtn.setColor('#ffff00'));
diagBtn.on('pointerout', () => diagBtn.setColor('#888888'));
diagBtn.on('pointerdown', () => {
  this.scene.start('Diagnostics');
});
```

- [ ] **Step 4: Verify compilation**

```bash
npx tsc --noEmit -p client/tsconfig.json
```
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add client/src/main.ts client/src/scenes/BootScene.ts client/src/scenes/MenuScene.ts
git commit -m "feat: wire DiagnosticsScene into Boot (query param), Menu (button), main (config)"
```

---

### Task 15: Run existing tests to verify no regressions

**Files:**
- None modified

- [ ] **Step 1: Run Vitest unit tests**

```bash
npm test
```
Expected: all 3 test suites pass

- [ ] **Step 2: Start dev server and run Playwright E2E tests**

```bash
# Terminal 1:
npm run dev --workspace=client

# Terminal 2:
npx playwright test --config e2e/playwright.config.ts --grep-invert visual
```
Expected: all 9 existing E2E specs pass (or show known failures, not new failures)

- [ ] **Step 3: Manual smoke test — deterministic mode**

Open `http://localhost:17000/?deterministic=1` in Chrome.
Expected: game loads, no visible difference from normal mode.

- [ ] **Step 4: Manual smoke test — debug overlays**

In game, press F1-F6.
Expected: colored overlays appear. F6 toggles all off.

- [ ] **Step 5: Manual smoke test — diagnostics scene**

Open `http://localhost:17000/?scene=diagnostics`
Expected: grid of all sprite frames, looping animations below, arrow key scrolling works.

- [ ] **Step 6: Visual regression acceptance**

```bash
$env:UPDATE_GOLDENS='1'; npx playwright test --config e2e/playwright.config.ts --grep visual
```
Expected: all 6 visual tests generate golden screenshots. Review goldens manually for correctness, then run without UPDATE_GOLDENS to confirm they pass.

---

### Task 16: Final commit and summary

- [ ] **Step 1: Add .gitignore for e2e/output**

Ensure `.gitignore` contains `e2e/output/`:

```bash
echo 'e2e/output/' >> .gitignore
```

- [ ] **Step 2: Final status check**

```bash
git status
```
Expected: no uncommitted changes, everything is clean.

- [ ] **Step 3: Commit any remaining changes**

```bash
git add .
git commit -m "chore: finalize testing stack — golden baselines, gitignore, cleanup"
```

---

## Verification Summary

| Layer | Verification |
|-------|-------------|
| 1 — Deterministic | `?deterministic=1` loads game with seeded RNG. Same replay plays identically every time. |
| 2 — Visual Regression | `npm run test:visual` passes against goldens. `npm run test:visual:update` regenerates. |
| 3 — Debug Overlays | Press F1-F6 in game. Hitboxes/bounds/origins/frames/animations toggle on/off. |
| 4 — Input Replay | `injectReplay(page, 'subzero-walk-right.json')` in Playwright test moves P1 right exactly 500ms. |
| 5 — Diagnostics | `?scene=diagnostics` shows all frames in grid + looping animations. Arrow keys scroll. |
| Existing tests | All 3 Vitest specs + 9 Playwright E2E specs still pass. |
