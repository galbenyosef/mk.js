import Phaser from 'phaser';
import { MoveType, CONFIG } from '@mk.js/shared';
import type { GameOptions } from '@mk.js/shared';
import { Fighter } from '../entities/Fighter.js';
import { Arena } from '../entities/Arena.js';
import { HUD } from '../entities/HUD.js';
import { createAnimations, getMoveConfig } from '../moves/MoveRegistry.js';
import { LocalController } from '../controllers/LocalController.js';
import { AIController } from '../controllers/AIController.js';
import { NetworkController } from '../controllers/NetworkController.js';
import { BasicController } from '../controllers/BasicController.js';
import type { BaseController } from '../controllers/BaseController.js';

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

    this.hud = new HUD(this, this.fighters);

    switch (this.options.mode) {
      case 'local':
        this.controller = new LocalController(this, this.fighters, this);
        break;
      case 'ai':
        this.controller = new AIController(this, this.fighters, this);
        this._addPlayer1Keyboard();
        break;
      case 'network':
        this.controller = new NetworkController(this, this.fighters, this, this.options.isHost ?? false);
        break;
      case 'basic':
        this.controller = new BasicController(this, this.fighters, this);
        break;
    }

    this.startRound(1);
  }

  update(time: number, delta: number): void {
    if (!this.roundActive) return;

    this.controller.update();

    for (const f of this.fighters) {
      const config = getMoveConfig(f.currentMove);
      if (config.velocityX) f.x += config.velocityX * (delta / 16.667);
      if (config.velocityY) f.y += config.velocityY * (delta / 16.667);
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
  private _addPlayer1Keyboard(): void {
    const keys = { HP: 65, LP: 83, LK: 68, HK: 70, BLOCK: 16, RIGHT: 74, LEFT: 71, UP: 89, DOWN: 72 };
    this.input.keyboard!.on('keydown', (e: KeyboardEvent) => {
      this._pressed[e.keyCode] = true;
      const move = this._getP1Move();
      if (move) this.fighters[0].trySetMove(move);
    });
    this.input.keyboard!.on('keyup', (e: KeyboardEvent) => {
      delete this._pressed[e.keyCode];
      const move = this._getP1Move();
      if (move) this.fighters[0].trySetMove(move);
      if (Object.keys(this._pressed).length === 0) this.fighters[0].trySetMove(MoveType.STAND);
    });
  }

  private _getP1Move(): MoveType | undefined {
    const p = this._pressed;
    const k = { HP: 65, LP: 83, LK: 68, HK: 70, BLOCK: 16, RIGHT: 74, LEFT: 71, UP: 89, DOWN: 72 };
    const m = MoveType;
    const f = this.fighters[0];
    if (f.currentMove === m.SQUAT && !p[k.DOWN]) return m.STAND_UP;
    if (f.currentMove === m.BLOCK && !p[k.BLOCK]) return m.STAND;
    if (Object.keys(p).length === 0) return m.STAND;
    if (p[k.BLOCK]) return m.BLOCK;
    if (p[k.LEFT]) {
      if (p[k.UP]) return m.BACKWARD_JUMP;
      return m.WALK_BACKWARD;
    }
    if (p[k.RIGHT]) {
      if (p[k.UP]) return m.FORWARD_JUMP;
      return m.WALK;
    }
    if (p[k.DOWN]) {
      if (p[k.HP]) return m.UPPERCUT;
      if (p[k.LK]) return m.SQUAT_LOW_KICK;
      if (p[k.HK]) return m.SQUAT_HIGH_KICK;
      if (p[k.LP]) return m.SQUAT_LOW_PUNCH;
      return m.SQUAT;
    }
    if (p[k.HK]) return m.HIGH_KICK;
    if (p[k.LK]) return m.LOW_KICK;
    if (p[k.UP]) return m.JUMP;
    if (p[k.LP]) return m.LOW_PUNCH;
    if (p[k.HP]) return m.HIGH_PUNCH;
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
