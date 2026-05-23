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
        break;
      case 'network':
        this.controller = new NetworkController(this, this.fighters, this, this.options.isHost ?? false);
        break;
    }

    this.startRound(1);
  }

  update(time: number, delta: number): void {
    if (!this.roundActive) return;

    this.controller.update();
    this.arena.syncFighters(this.fighters[0], this.fighters[1]);

    for (const f of this.fighters) {
      const { x, y } = this.arena.constrainFighter(f, { x: f.x, y: f.y });
      f.setPosition(x, y);
    }

    this.checkHit(this.fighters[0], this.fighters[1]);
    this.checkHit(this.fighters[1], this.fighters[0]);
  }

  private checkHit(attacker: Fighter, defender: Fighter): void {
    const config = getMoveConfig(attacker.currentMove);
    if (config.damage > 0 && config.hitFrame >= 0) {
      if (attacker.anims.currentFrame?.index === config.hitFrame && this.arena.blockOverlap(attacker, defender)) {
        defender.takeDamage(config.damage, attacker.currentMove);
        this.hud.updateHealth(this.fighters);
        if (defender.hp <= 0) {
          this.endRound(attacker.playerIndex);
        }
      }
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

    this.hud.showRound(round);
    this.time.delayedCall(1500, () => {
      this.hud.showFight();
      this.time.delayedCall(800, () => {
        this.roundActive = true;
      });
    });
  }

  private endRound(winnerIndex: number): void {
    this.roundActive = false;
    const loserIndex = winnerIndex === 0 ? 1 : 0;
    this.fighters[winnerIndex].trySetMove(MoveType.WIN, true);
    this.fighters[loserIndex].trySetMove(MoveType.FALL, true);
    this.roundWins[winnerIndex]++;

    if (this.roundWins[winnerIndex] >= CONFIG.ROUND_WIN_REQUIRED) {
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
