# mk.js Modernization Design

## Overview

Full rewrite of mk.js — a Mortal Kombat-style HTML5 fighting game originally built in 2013 with vanilla ES5 + Canvas. The rewrite uses Phaser 3 + TypeScript + Vite for the client and a modern Node.js + Socket.IO v4 backend, preserving the original game modes while adding more fighters, arenas, and a proper matchmaking lobby.

## Goals

- Preserve: Local multiplayer, network multiplayer, single-player vs AI
- Drop: Webcam gesture control
- Add: More fighters, more arenas, proper lobby/matchmaking UI
- Tech: Phaser 3, TypeScript, Vite, Express, Socket.IO v4

## Architecture

```
mk.js/                          (monorepo root)
├── package.json                (workspace config)
├── tsconfig.base.json
├── shared/                     (shared types & constants)
│   └── src/
│       ├── types.ts            (FighterState, MoveType, GameState, etc.)
│       ├── constants.ts        (move enums, damage values, config)
│       └── index.ts
├── client/                     (Phaser 3 + Vite + TypeScript)
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── main.ts             (Phaser game config & bootstrap)
│       ├── scenes/
│       │   ├── BootScene.ts    (load minimal assets, loading bar)
│       │   ├── PreloadScene.ts (load all sprites, sounds, fonts)
│       │   ├── MenuScene.ts    (mode selection: local, network, vs AI)
│       │   ├── LobbyScene.ts   (create/join game, player ready)
│       │   └── GameScene.ts    (the fighting game itself)
│       ├── entities/
│       │   ├── Fighter.ts      (fighter sprite, HP, position, state machine)
│       │   ├── Arena.ts        (background, boundaries, camera)
│       │   └── HUD.ts          (health bars, timer, fighter names)
│       ├── controllers/
│       │   ├── BaseController.ts
│       │   ├── LocalController.ts    (two players, one keyboard)
│       │   ├── NetworkController.ts  (remote opponent via socket)
│       │   └── AIController.ts       (simple AI opponent)
│       ├── moves/
│       │   └── MoveRegistry.ts       (move definitions, damage, frames)
│       └── networking/
│           └── GameSocket.ts         (Socket.IO client wrapper)
├── server/                     (Node.js + Express + Socket.IO v4)
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts            (Express + Socket.IO bootstrap)
│       ├── lobby.ts            (game room management, matchmaking)
│       ├── game.ts             (game session relay)
│       └── games.ts            (game collection)
├── scripts/
│   └── build-sprites.mjs       (converts PNG frames → Phaser spritesheets)
└── assets/
    ├── raw/                    (downloaded individual PNGs from MK Warehouse)
    │   └── {fighterName}/{category}/*.png
    └── build/                  (generated spritesheets + atlas JSON)
        └── {fighterName}/
            ├── spritesheet.png
            └── spritesheet.json
```

### Scene Flow

```
Boot → Preload → Menu → ┌→ Game (local/AI) → GameOver → Menu
                          └→ Lobby → Game (network) → GameOver → Menu
```

## Fighter System & State Machine

Each fighter is a Phaser `Sprite` with a move state machine.

### Fighter Entity

```
Fighter
├── playerIndex: 0 | 1
├── hp: number
├── orientation: 'left' | 'right'    (uses Phaser flipX, no duplicate sprites)
├── currentMove: MoveConfig
├── locked: boolean
└── moveHandlers: Map<MoveType, Phaser.Animation>
```

### State Machine

```
                    STAND
                 /    |      \
              WALK   JUMP   ATTACK
                |     |        |
           SQUAT/  FWD_JUMP   ENDURE
           BLOCK   BCK_JUMP    |
                    |      FALL/KNOCK_DOWN
                JUMP_ATTACK      |
                              WIN
```

### Move Config (data-driven)

```typescript
interface MoveConfig {
  type: MoveType;
  animationKey: string;
  damage: number;
  duration: number;
  hitFrame: number;
  velocityX?: number;
  velocityY?: number;
  locksPlayer: boolean;
  returnTo: MoveType;
}
```

### Move Types (enum)

```typescript
enum MoveType {
  STAND, WALK, WALK_BACKWARD,
  SQUAT, STAND_UP,
  HIGH_KICK, LOW_KICK, HIGH_PUNCH, LOW_PUNCH,
  UPPERCUT, SPIN_KICK,
  JUMP, FORWARD_JUMP, BACKWARD_JUMP,
  FORWARD_JUMP_KICK, BACKWARD_JUMP_KICK,
  FORWARD_JUMP_PUNCH, BACKWARD_JUMP_PUNCH,
  SQUAT_LOW_KICK, SQUAT_HIGH_KICK, SQUAT_LOW_PUNCH,
  BLOCK, ENDURE, SQUAT_ENDURE,
  FALL, KNOCK_DOWN, ATTRACTIVE_STAND_UP,
  WIN
}
```

### Round System

- Best of 3 rounds; first to 2 wins
- Each round: both fighters reset to starting positions with full HP
- 2-second countdown ("Round 1... FIGHT!") before each round
- Round ends when a fighter reaches 0 HP
- Game over when one fighter has 2 round wins

### Blocking

- Block reduces incoming damage to 20% (configurable via `BLOCK_DAMAGE_MULTIPLIER`)
- Blocking cancels hit reactions (no endure/knock-down animation)
- Cannot block while attacking or jumping
- Block while squatting protects against low attacks only (crouch-block vs low, standing block vs high)

### Key improvements over original
- Sprite sheets instead of 200+ individual PNGs
- Phaser animations handle frame timing (no `setInterval`)
- Data-driven move configs (adding a fighter = config + sprites)
- Orientation via Phaser's `flipX` (no duplicate left/right sprite sets)

## Networking & Lobby

Socket.IO v4 with room-based matchmaking.

### Server

```
src/
├── index.ts              # Express + Socket.IO v4 bootstrap
├── lobby.ts              # Game room lifecycle
├── game.ts               # Per-game session relay
└── games.ts              # Game collection (in-memory)
```

### Lobby events

| Event | Direction | Payload |
|-------|-----------|---------|
| `create-game` | Client → Server | `{ gameName, fighterName }` |
| `join-game` | Client → Server | `{ gameName, fighterName }` |
| `game-list` | Server → Client | `[{ gameName, playerCount, arena }]` |
| `player-joined` | Server → Both | `{ fighterName }` |
| `game-ready` | Server → Both | `{ opponentName, arena }` |
| `player-left` | Server → Remaining | `{}` |

### In-game relay

| Event | Payload |
|-------|---------|
| `move` | `MoveType` |
| `life-update` | `number` |
| `position-update` | `{ x, y }` |

### Client socket wrapper

```typescript
class GameSocket {
  createGame(name: string, fighter: string): Promise<void>;
  joinGame(name: string, fighter: string): Promise<void>;
  getGameList(): Promise<GameInfo[]>;
  sendMove(move: MoveType): void;
  sendLife(life: number): void;
  sendPosition(x: number, y: number): void;
  onOpponentMove(cb: (move: MoveType) => void): void;
  onOpponentLife(cb: (life: number) => void): void;
  onGameReady(cb: (info: GameReadyInfo) => void): void;
}
```

## Game Scene & Controllers

### GameScene

Manages the arena, both fighters, HUD, round system, and a pluggable controller.

```typescript
class GameScene extends Phaser.Scene {
  arena: Arena;
  fighters: [Fighter, Fighter];
  hud: HUD;
  controller: BaseController;
  rounds: [number, number];     // BO3
  roundActive: boolean;
  
  onHit(attacker, defender, move): void;
  endRound(winnerIndex): void;
  onGameOver(): void;
}
```

### Controller Interface (swappable per mode)

```typescript
interface BaseController {
  setup(fighters: [Fighter, Fighter]): void;
  update(): void;
  destroy(): void;
}
```

- **LocalController** — keyboard input for both players (data-driven key config)
- **NetworkController** — local keyboard + remote opponent via socket
- **AIController** — state machine: idle / approach / attack / block / retreat

## Asset Pipeline

Sprite source: [Mortalkombatwarehouse.com](https://www.mortalkombatwarehouse.com/mk3/) — individual PNG frames per move category.

### Sprite category mapping

| Move Type | MKW Folder | Notes |
|-----------|-----------|-------|
| stand | `stance/` | Idle animation |
| walk / walk-backward | `walk/` | Reversed direction for backward |
| squat | — | First frame of squat kicks or hit squat |
| block | `block/` | Blocking |
| high-punch | `punch/` | Punch sprites |
| low-punch | `punch/` | Same sprites, different damage |
| high-kick | `kick/` (01-06) | Regular kick |
| low-kick / squat kicks | `kick/sXX.png` | Squat kick variants |
| jump / forward-jump | `duckjump/` | Jump sprites |
| fall / knock-down | `fall/` | Falling sprites |
| endure / being-hit | `beinghit/` | Hit reaction |
| win | `victory/` | Victory pose |
| special moves | `special/` | Per-character specials |

### Build script (`scripts/build-sprites.mjs`)

Converts individual PNGs → Phaser spritesheet + atlas JSON using `sharp`.

```
Input:  assets/raw/{fighterName}/{category}/*.png
Output: assets/build/{fighterName}/spritesheet.{png,json}
```

### Available characters (MK3 via MKW)

Sub-Zero, Kano, Liu Kang, Sonya, Jax, Kung Lao, Cyrax, Sektor, Nightwolf, Sheeva, Kabal, Smoke, Sindel, Stryker, Shang Tsung, Noob Saibot, Motaro, Shao Kahn.

### Available arenas (MK3 via MKW)

Subway, The Street, The Bank, Rooftop, The Balcony, The Bridge, Soul Chamber, Bell Tower, The Temple, Graveyard, The Pit 3, Noob's Dorfen, Smoke's Portal.

## Build & Run

```bash
npm install                    # install all workspace deps
npm run build:assets           # convert PNGs to spritesheets
npm run dev                    # Vite dev server (client)
npm run start:server           # Node.js server
```

## Testing Strategy

- **Unit tests** (Vitest): Move config validation, damage calculation, hit detection logic
- **Integration tests**: Controller state transitions, round management
- **Manual testing**: Animation timing, network latency, multiplayer sync

## Migration from Original

- Original `mk.js` (1818 lines single-file ES5) → modular TypeScript
- Original `movement.js` (webcam input) → dropped
- Original Express 3.x + Socket.IO 0.9.x → Express 4.x + Socket.IO 4.x
- Original custom Promise → native Promise
- Original `alert()` → proper UI overlays
- Fixed: `_setFighersArena` typo, `games.js` line 80 `game` vs `id` bug
