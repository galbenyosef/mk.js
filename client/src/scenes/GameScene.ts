import Phaser from 'phaser';
import { MoveType, CONFIG } from '@mk.js/shared';
import type { GameOptions } from '@mk.js/shared';
import { Fighter, JUMP_TYPES } from '../entities/Fighter.js';
import { Arena } from '../entities/Arena.js';
import { HUD } from '../entities/HUD.js';
import { createAnimations, getMoveConfig } from '../moves/MoveRegistry.js';
import { LocalController } from '../controllers/LocalController.js';
import { AIController } from '../controllers/AIController.js';
import { NetworkController } from '../controllers/NetworkController.js';
import { BasicController } from '../controllers/BasicController.js';
import type { BaseController } from '../controllers/BaseController.js';
import { DebugOverlay } from '../debug/DebugOverlay.js';
import { getReplayFile } from '../config.js';

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

export class GameScene extends Phaser.Scene {
  public fighters!: [Fighter, Fighter];
  public arena!: Arena;
  public hud!: HUD;
  public controller!: BaseController;
  public roundActive = false;
  public roundWins: [number, number] = [0, 0];
  public currentRound = 0;
  public options!: GameOptions;
  private _roundTimeLeft = 99;
  private _roundTimerEvent?: Phaser.Time.TimerEvent;

  constructor() {
    super({ key: 'Game' });
  }

  init(data: GameOptions): void {
    this.options = data;
  }

  create(): void {
    createAnimations(this, this.options.p1Fighter, `fighters/${this.options.p1Fighter}`);
    createAnimations(this, this.options.p2Fighter, `fighters/${this.options.p2Fighter}`);

    this.add.image(300, 200, `arenas/${this.options.arena}`);

    this.arena = new Arena(this);

    this.fighters = [
      new Fighter(this, 150, CONFIG.PLAYER_TOP, this.options.p1Fighter, 0, 'left'),
      new Fighter(this, 450, CONFIG.PLAYER_TOP, this.options.p2Fighter, 1, 'right'),
    ];

    new DebugOverlay(this, this.fighters);

    this.hud = new HUD(this, this.fighters);

    this._addPlayer1Keyboard();
    switch (this.options.mode) {
      case 'local':
        this.controller = new LocalController(this, this.fighters, this);
        break;
      case 'ai':
        this.controller = new AIController(this, this.fighters, this);
        break;
      case 'network':
        this.controller = new NetworkController(this, this.fighters, this, this.options.isHost ?? false);
        break;
      case 'basic':
        this.controller = new BasicController(this, this.fighters, this);
        break;
    }

    this._replayFile = getReplayFile();

    this.startRound(1);
  }

  update(time: number, delta: number): void {
    if (!this.roundActive) return;

    this.controller.update();
    if (this.options.mode === 'ai') this._processP1Keyboard();

    for (const f of this.fighters) {
      f.stepUpdate(delta);
      if (!f.stepActive) {
        const config = getMoveConfig(f.currentMove);
        if (config.velocityX) f.x += config.velocityX * (delta / 16.667);
        if (config.velocityY) {
          if (f.currentMove === MoveType.JUMP) {
            if (!f.jumpDescending) {
              const progress = f.anims.getProgress?.() ?? 0;
              if (progress > 0.5) f.jumpDescending = true;
            }
            const vy = f.jumpDescending ? Math.abs(config.velocityY) : -Math.abs(config.velocityY);
            f.y += vy * (delta / 16.667);
          } else {
            f.y += config.velocityY * (delta / 16.667);
          }
        }
      }
      if (f.playerIndex === 0 && getMoveConfig(f.currentMove).damage > 0) {
        const walkVx = this.getMoveVelocityX();
        if (walkVx) f.x += walkVx * (delta / 16.667);
      }
    }

    this.arena.syncFighters(this.fighters[0], this.fighters[1]);

    for (const f of this.fighters) {
      const { x, y } = this.arena.constrainFighter(f, { x: f.x, y: f.y });
      f.setPosition(x, y);
    }

    this.checkHit(this.fighters[0], this.fighters[1]);
    this.checkHit(this.fighters[1], this.fighters[0]);
  }

  private _pressed: Record<number, boolean> = {};
  private _replayFile: string | null = null;
  private _addPlayer1Keyboard(): void {
    const k = { HP: 76, LP: 74, LK: 75, HK: 186, BLOCK: 32, RIGHT: 68, LEFT: 65, UP: 87, DOWN: 83 };
    this.input.keyboard!.on('keydown', (e: KeyboardEvent) => {
      if (e.repeat) return;
      this._pressed[e.keyCode] = true;
    });
    this.input.keyboard!.on('keyup', (e: KeyboardEvent) => {
      delete this._pressed[e.keyCode];
    });
  }

  private _processP1Keyboard(): void {
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

  private getMoveVelocityX(): number {
    if (this._pressed[65]) return -2;
    if (this._pressed[68]) return 2;
    return 0;
  }

  private _getP1Move(currentMove: MoveType): MoveType | undefined {
    const p = this._pressed;
    const k = { HP: 76, LP: 74, LK: 75, HK: 186, BLOCK: 32, RIGHT: 68, LEFT: 65, UP: 87, DOWN: 83 };
    const m = MoveType;
    if (Object.keys(p).length === 0) {
      if (currentMove === m.SQUAT) return m.STAND_UP;
      return m.STAND;
    }
    const jumping = currentMove === m.JUMP || currentMove === m.FORWARD_JUMP
      || currentMove === m.BACKWARD_JUMP || currentMove === m.FORWARD_JUMP_KICK
      || currentMove === m.BACKWARD_JUMP_KICK || currentMove === m.FORWARD_JUMP_PUNCH
      || currentMove === m.BACKWARD_JUMP_PUNCH;
    const jumpAtk = (punch: MoveType, kick: MoveType): MoveType => {
      if (currentMove === m.FORWARD_JUMP) return punch;
      if (currentMove === m.BACKWARD_JUMP) return kick;
      return currentMove;
    };

    if (p[k.HP]) {
      if (p[k.DOWN]) return m.UPPERCUT;
      if (p[k.UP] || jumping) return jumpAtk(m.FORWARD_JUMP_PUNCH, m.BACKWARD_JUMP_PUNCH);
      return m.HIGH_PUNCH;
    }
    if (p[k.LP]) {
      if (p[k.DOWN]) return m.SQUAT_LOW_PUNCH;
      if (p[k.UP] || jumping) return jumpAtk(m.FORWARD_JUMP_PUNCH, m.BACKWARD_JUMP_PUNCH);
      return m.LOW_PUNCH;
    }
    if (p[k.HK]) {
      if (p[k.DOWN]) return m.SQUAT_HIGH_KICK;
      if (p[k.UP] || jumping) return jumpAtk(m.FORWARD_JUMP_KICK, m.BACKWARD_JUMP_KICK);
      return m.HIGH_KICK;
    }
    if (p[k.LK]) {
      if (p[k.DOWN]) return m.SQUAT_LOW_KICK;
      if (p[k.UP] || jumping) return jumpAtk(m.FORWARD_JUMP_KICK, m.BACKWARD_JUMP_KICK);
      return m.LOW_KICK;
    }
    if (p[k.BLOCK]) return m.BLOCK;
    if (p[k.LEFT]) {
      if (p[k.UP] || jumping) return m.BACKWARD_JUMP;
      return m.WALK_BACKWARD;
    }
    if (p[k.RIGHT]) {
      if (p[k.UP] || jumping) return m.FORWARD_JUMP;
      return m.WALK;
    }
    if (p[k.DOWN]) return m.SQUAT;
    if (p[k.UP]) return m.JUMP;
    return undefined;
  }

  private _getReplayMove(state: ReplayInputState, currentMove: MoveType): MoveType | undefined {
    const m = MoveType;
    const jumping = currentMove === m.JUMP || currentMove === m.FORWARD_JUMP
      || currentMove === m.BACKWARD_JUMP || currentMove === m.FORWARD_JUMP_KICK
      || currentMove === m.BACKWARD_JUMP_KICK || currentMove === m.FORWARD_JUMP_PUNCH
      || currentMove === m.BACKWARD_JUMP_PUNCH;
    const jumpAtk = (punch: MoveType, kick: MoveType): MoveType => {
      if (currentMove === m.FORWARD_JUMP) return punch;
      if (currentMove === m.BACKWARD_JUMP) return kick;
      return currentMove;
    };

    if (!state.LEFT && !state.RIGHT && !state.UP && !state.DOWN
      && !state.A && !state.B && !state.C && !state.D) {
      if (currentMove === m.SQUAT) return m.STAND_UP;
      return m.STAND;
    }
    if (state.A) {
      if (state.DOWN) return m.UPPERCUT;
      if (state.UP || jumping) return jumpAtk(m.FORWARD_JUMP_PUNCH, m.BACKWARD_JUMP_PUNCH);
      return m.HIGH_PUNCH;
    }
    if (state.B) {
      if (state.DOWN) return m.SQUAT_LOW_PUNCH;
      if (state.UP || jumping) return jumpAtk(m.FORWARD_JUMP_PUNCH, m.BACKWARD_JUMP_PUNCH);
      return m.LOW_PUNCH;
    }
    if (state.C) {
      if (state.DOWN) return m.SQUAT_HIGH_KICK;
      if (state.UP || jumping) return jumpAtk(m.FORWARD_JUMP_KICK, m.BACKWARD_JUMP_KICK);
      return m.HIGH_KICK;
    }
    if (state.D) {
      if (state.DOWN) return m.SQUAT_LOW_KICK;
      if (state.UP || jumping) return jumpAtk(m.FORWARD_JUMP_KICK, m.BACKWARD_JUMP_KICK);
      return m.LOW_KICK;
    }
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

  private _hasHit: [boolean, boolean] = [false, false];

  private checkHit(attacker: Fighter, defender: Fighter): void {
    const config = getMoveConfig(attacker.currentMove);
    if (config.damage <= 0) {
      this._hasHit[attacker.playerIndex] = false;
      return;
    }
    if (this._hasHit[attacker.playerIndex]) return;
    // Legacy: hit only at specific frame index
    if (config.hitFrame >= 0) {
      const frameIdx = attacker.anims?.currentFrame?.index ?? -1;
      if (frameIdx < config.hitFrame) return;
    }
    if (!this.arena.blockOverlap(attacker, defender)) return;
    this._hasHit[attacker.playerIndex] = true;
    defender.takeDamage(config.damage, attacker.currentMove);
    this.hud.updateHealth(this.fighters);
    try { this.sound.play('sfx/hit', { volume: 0.5 }); } catch {}
    if (defender.hp <= 0) {
      this.endRound(attacker.playerIndex);
    }
  }

  private startRound(round: number): void {
    this.currentRound = round;
    this.roundActive = false;

    this.fighters[0].reset();
    this.fighters[1].reset();
    this.fighters[0].setPosition(150, CONFIG.PLAYER_TOP);
    this.fighters[1].setPosition(450, CONFIG.PLAYER_TOP);
    this.arena.syncFighters(this.fighters[0], this.fighters[1]);
    this.hud.updateHealth(this.fighters);

    this._roundTimeLeft = 99;
    this.hud.showTimer();
    this.hud.updateTimer(this._roundTimeLeft);
    if (this._roundTimerEvent) this._roundTimerEvent.destroy();
    this._roundTimerEvent = this.time.addEvent({
      delay: 1000,
      repeat: 98,
      callback: () => {
        this._roundTimeLeft--;
        this.hud.updateTimer(this._roundTimeLeft);
        if (this._roundTimeLeft <= 0) {
          this._roundTimerEvent?.destroy();
          if (this.fighters[0].hp !== this.fighters[1].hp) {
            const winnerIdx = this.fighters[0].hp > this.fighters[1].hp ? 0 : 1;
            this.endRound(winnerIdx);
          } else {
            this.endRound(0);
          }
        }
      },
    });

    this.hud.showRound(round);
    try { this.sound.play('sfx/round', { volume: 0.4 }); } catch {}
    this.time.delayedCall(1500, () => {
      this.hud.showFight();
      this.time.delayedCall(800, () => {
        this.roundActive = true;
      });
    });
  }

  private endRound(winnerIndex: number): void {
    this.roundActive = false;
    if (this._roundTimerEvent) this._roundTimerEvent.destroy();
    this.hud.hideTimer();
    const loserIndex = winnerIndex === 0 ? 1 : 0;
    this.fighters[winnerIndex].trySetMove(MoveType.WIN, true);
    this.fighters[loserIndex].trySetMove(MoveType.FALL, true);
    this.roundWins[winnerIndex]++;

    if (this.roundWins[winnerIndex] >= CONFIG.ROUND_WIN_REQUIRED) {
      try { this.sound.play('sfx/win', { volume: 0.5 }); } catch {}
      this.hud.showWinner(this.fighters[winnerIndex].fighterName);
      this.time.delayedCall(3000, () => {
        this.scene.start('Menu');
      });
    } else {
      this.time.delayedCall(2000, () => {
        this.startRound(this.currentRound + 1);
      });
    }
  }

  shutdown(): void {
    this.controller.destroy();
    this.hud.destroy();
  }
}
