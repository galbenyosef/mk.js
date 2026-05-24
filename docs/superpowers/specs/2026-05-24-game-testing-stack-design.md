# mk.js Game Testing Stack Design

## Overview

A 5-layer testing framework for catching animation, spritesheet, movement, and rendering bugs in the Phaser 3 client. Built on top of existing Vitest unit tests and Playwright E2E specs.

## Goals

- Make all visual and gameplay tests **deterministic** (same output every run)
- Catch **sprite frame errors, animation desync, position jitter, and scaling artifacts** via pixel diffs
- Provide **in-game debug overlays** for manual visual debugging during development
- Enable **input replay** for exact bug reproduction
- Provide a **diagnostics scene** for auditing all sprite frames and animations at a glance
- **Preserve all existing tests** (3 Vitest specs, 9 Playwright specs) — add, don't replace

## Layers

### Layer 1 — Deterministic Engine Mode

Foundation. Without this, screenshots vary every run.

**GameOptions addition** (`shared/src/types.ts`):

```typescript
export interface GameOptions {
  // ... existing fields ...
  deterministicMode?: boolean;  // Seed RNG + fixed timestep when true
}
```

**Phaser config changes** (`client/src/main.ts`):

When `deterministicMode` is enabled (via `?deterministic=1` query param or `window.__MK_DETERMINISTIC = true`):

- `Phaser.Math.RND.sow(['mk-test-1234'])` — freeze randomness
- `fps: { target: 60, forceSetTimeOut: true }` — fixed timestep, no rAF variance
- Arcade physics: fixed update step, disable interpolation

**Files:**

| File | Change |
|------|--------|
| `shared/src/types.ts` | Add `deterministicMode?: boolean` to `GameOptions` |
| `client/src/main.ts` | Read query param / window flag, apply to Phaser config + RNG seed |
| `client/src/config.ts` (new) | `isDeterministic()` helper |

---

### Layer 2 — Visual Regression (pixelmatch)

Screenshot diffing integrated into existing Playwright E2E infrastructure.

**Structure:**

```
e2e/
├── golden/                          # Committed golden screenshots
│   ├── subzero-idle.png
│   ├── subzero-punch-frame3.png
│   ├── kano-walk-frame5.png
│   ├── liukang-kick-frame2.png
│   └── sonya-block.png
├── output/                          # Gitignored — test run artifacts
│   ├── actual/                      # Screenshots from current run
│   └── diff/                        # pixelmatch diff images (red highlights)
├── visual-regression.config.ts      # Thresholds per image type
└── visual-regression.spec.ts        # New Playwright spec
```

**Threshold configuration:**

| Category | Threshold | Notes |
|----------|-----------|-------|
| Idle / single frame | 0.1% | Should be pixel-perfect |
| Animation mid-frame | 0.5% | Minor AA variance OK |
| Movement (position after walk) | 2% | Subpixel positioning tolerance |

**Scripts** (root `package.json`):

```json
{
  "test:visual": "playwright test --config e2e/playwright.config.ts --grep visual",
  "test:visual:update": "UPDATE_GOLDENS=1 playwright test --config e2e/playwright.config.ts --grep visual"
}
```

**What gets visually tested:**

1. **Sprite alignment** — each fighter at idle stance, correct origin
2. **Animation correctness** — capture specific frame of a move, compare to golden
3. **Movement** — walk N ms in a direction, assert final pixel position
4. **Hit reaction** — punch connects, opponent shows correct hit frame

**Dependencies:**

```json
{
  "pixelmatch": "^6.0.0",
  "pngjs": "^7.0.0"
}
```

**Files:**

| File | Purpose |
|------|---------|
| `e2e/visual-regression.config.ts` | Threshold config, image categories |
| `e2e/visual-regression.spec.ts` | Playwright spec: navigate to scene, wait, screenshot, diff |
| `e2e/golden/` | Baseline images (git-tracked) |
| `e2e/helpers/pixelmatch.ts` | Diff utility wrapping pixelmatch + PNG read/write |
| `e2e/output/` | Runtime artifacts (gitignored) |

---

### Layer 3 — Debug Overlays

In-game F-key toggles drawing on a `Phaser.GameObjects.Graphics` layer.

**Toggle keys:**

| Key | Overlay | What it renders |
|-----|---------|-----------------|
| F1 | Hitboxes | Red (attack) / Blue (hurt) / Green (push) rectangles |
| F2 | Sprite bounds | Yellow outline + origin crosshair per sprite |
| F3 | Origins | Crosshair + (x, y) position label |
| F4 | Atlas frames | Text: `{frameName}` @ `{atlasKey}` above each fighter |
| F5 | Animation state | text: `{key}[{frame}/{total}] {progress}%` |
| F6 | All on/off | Master toggle |

**Implementation** (`client/src/debug/DebugOverlay.ts`):

- A class instantiated in `GameScene.create()`
- Draws to a dedicated `Phaser.GameObjects.Graphics` on a high-depth layer
- Keyboard listeners on F1-F6
- Reads state from `Fighter` instances: `.body`, `.anims`, `.frame`, `.x`, `.y`
- Zero overhead when all toggles are off (no draw calls, no listener overhead after initial setup)
- Excluded from production builds (only active in dev / deterministic mode)

**Files:**

| File | Purpose |
|------|---------|
| `client/src/debug/DebugOverlay.ts` | All overlay drawing + key handling |
| `client/src/scenes/GameScene.ts` | Add one line: `new DebugOverlay(this, fighter1, fighter2)` in `create()` |

---

### Layer 4 — Input Replay System

Playback-only system. Events specified as JSON arrays, replayed deterministically.

**Format** (`e2e/replay-fixtures/*.json`):

```json
[
  { "t": 0,    "key": "LEFT",  "action": "down" },
  { "t": 180,  "key": "LEFT",  "action": "up" },
  { "t": 200,  "key": "RIGHT", "action": "down" },
  { "t": 500,  "key": "A",     "action": "down" },
  { "t": 550,  "key": "A",     "action": "up" }
]
```

- `t`: milliseconds since replay start
- `key`: matches input config keys (`LEFT`, `RIGHT`, `UP`, `DOWN`, `A`, `B`, `C`, `D`)
- `action`: `"down"` or `"up"`

**ReplayController** (`e2e/replay/ReplayController.ts`):

- Implements the existing `Controller` interface (`getState(): InputState`)
- On `start()`: records `Date.now()` as baseline
- On `getState()`: computes elapsed, applies all events where `event.t <= elapsed`
- Events are pre-sorted by `t`
- Given the same events + deterministic mode, produces identical frame output every time

**Integration:**

- Playwright test: `await replayInput(page, 'subzero-walk-right.json')` — injects ReplayController into GameScene
- Manual debugging: `?replay=subzero-walk-right` query param loads the fixture
- GameScene checks `gameOptions.replayFile` and swaps controller before create

**Files:**

| File | Purpose |
|------|---------|
| `e2e/replay/ReplayController.ts` | Implements Controller, replays key events |
| `e2e/replay-fixtures/subzero-walk-right.json` | Example fixture |
| `e2e/replay-fixtures/kano-punch.json` | Example fixture |
| `e2e/helpers/replay.ts` | `injectReplay(page, fixtureName)` Playwright helper |
| `shared/src/types.ts` | Add `replayFile?: string` to `GameOptions` |

---

### Layer 5 — Diagnostics Scene

A dedicated Phaser scene (`DiagnosticsScene`) for visually auditing all sprites and animations.

**Layout** (scrollable via camera):

```
┌──────────────────────────────────────────────┐
│  SUBZERO — Frames (grid)                      │
│  ┌────┬────┬────┬────┬────┬────┬────┬────┐   │
│  │ 01 │ 02 │ 03 │ 04 │ 05 │ 06 │ 07 │ 08 │   │
│  ├────┼────┼────┼────┼────┼────┼────┼────┤   │
│  │ 09 │ 10 │ 11 │ .. │ .. │ .. │ .. │ .. │   │
│  └────┴────┴────┴────┴────┴────┴────┴────┘   │
│                                               │
│  SUBZERO — Animations (looping)               │
│  walk→ [Looping sprite]  punch→ [Looping] ..  │
│                                               │
│  KANO — Frames (grid)                         │
│  ...                                          │
│  (scroll for more fighters)                   │
└──────────────────────────────────────────────┘
```

**Features:**

- Auto-layout every frame in the atlas in a grid (8 columns)
- Play each animation on loop next to its label
- Show frame count, sprite dimensions, atlas key
- Press F keys for overlay toggles (same as GameScene)
- Accessible from Menu ("Diagnostics" button) or `?scene=diagnostics`
- Works with deterministic mode so screenshots are stable

**Entry points:**

- MenuScene: add "Diagnostics" button
- URL: `http://localhost:17000?scene=diagnostics` detected in BootScene, skips Menu

**Files:**

| File | Purpose |
|------|---------|
| `client/src/scenes/DiagnosticsScene.ts` | Scene implementation |
| `client/src/scenes/MenuScene.ts` | Add "Diagnostics" button |
| `client/src/scenes/BootScene.ts` | Handle `?scene=diagnostics` redirect |

---

## Preserved Tests

No existing tests are modified. The new layers are additive:

| Preserved | Specs |
|-----------|-------|
| Vitest | `MoveRegistry.test.ts`, `spritesheet-structure.test.ts`, `games.test.ts` |
| Playwright E2E | `game-scenes.spec.ts`, `pixel-sanity.spec.ts`, `inspect.spec.ts`, `comprehensive-move-test.spec.ts`, `cross-fighter-consistency.spec.ts`, `animation-frame-selection.spec.ts`, `frame-sequence.spec.ts`, `input-rendering.spec.ts`, `battle-simulation.spec.ts` |

---

## Dependencies

New dev dependencies (root `package.json`):

```json
{
  "devDependencies": {
    "pixelmatch": "^6.0.0",
    "pngjs": "^7.0.0"
  }
}
```

No new runtime dependencies for the client or server.

---

## File Manifest

New files created:

| File | Layer | Purpose |
|------|-------|---------|
| `client/src/config.ts` | 1 | `isDeterministic()` helper |
| `e2e/visual-regression.config.ts` | 2 | Threshold config |
| `e2e/visual-regression.spec.ts` | 2 | Playwright visual regression spec |
| `e2e/helpers/pixelmatch.ts` | 2 | pixelmatch wrapper utility |
| `client/src/debug/DebugOverlay.ts` | 3 | F-key debug overlay class |
| `e2e/replay/ReplayController.ts` | 4 | Input event playback controller |
| `e2e/helpers/replay.ts` | 4 | `injectReplay()` Playwright helper |
| `e2e/replay-fixtures/subzero-walk-right.json` | 4 | Example replay fixture |
| `e2e/replay-fixtures/kano-punch.json` | 4 | Example replay fixture |
| `client/src/scenes/DiagnosticsScene.ts` | 5 | Diagnostics scene |

Modified files:

| File | Layer | Change |
|------|-------|--------|
| `shared/src/types.ts` | 1, 4 | Add `deterministicMode`, `replayFile` to `GameOptions` |
| `client/src/main.ts` | 1 | Deterministic mode in Phaser config |
| `client/src/scenes/GameScene.ts` | 3 | Instantiate `DebugOverlay` |
| `client/src/scenes/MenuScene.ts` | 5 | "Diagnostics" button |
| `client/src/scenes/BootScene.ts` | 5 | `?scene=diagnostics` redirect |
| `package.json` | 2 | Scripts + pixelmatch dep |

---

## Verification

Each layer is independently verifiable:

| Layer | How to verify |
|-------|---------------|
| 1 — Deterministic | Run same Playwright test twice, screenshots match byte-for-byte |
| 2 — Visual Regression | `npm run test:visual` — passes against goldens (or shows diffs) |
| 3 — Debug Overlays | Press F1-F6 in game, see overlays render on fighters |
| 4 — Input Replay | Load replay fixture, watch identical movement sequence play out |
| 5 — Diagnostics | Open `?scene=diagnostics`, see all frames and animations rendered |
