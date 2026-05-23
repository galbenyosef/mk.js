import Phaser from 'phaser';
import { MoveType, CONFIG } from '@mk.js/shared';
import { getMoveConfig } from '../moves/MoveRegistry.js';

export class Fighter extends Phaser.GameObjects.Sprite {
  public playerIndex: number;
  public hp: number;
  public currentMove: MoveType = MoveType.STAND;
  public locked = false;
  private _orientation: 'left' | 'right';

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    public fighterName: string,
    playerIndex: number,
    orientation: 'left' | 'right',
    atlasKey: string = `fighters/${fighterName}`,
  ) {
    super(scene, x, y, atlasKey);
    this.playerIndex = playerIndex;
    this._orientation = orientation;
    this.hp = CONFIG.STARTING_HP;
    scene.add.existing(this);
    this.setOrigin(0.5, 1);
    this.setFlipX(orientation === 'right');
  }

  get orientation(): 'left' | 'right' {
    return this._orientation;
  }

  setOrientation(o: 'left' | 'right'): void {
    if (this._orientation === o) return;
    this._orientation = o;
    this.setFlipX(o === 'right');
  }

  trySetMove(type: MoveType, force = false): boolean {
    if (this.locked && type !== MoveType.WIN) return false;
    if (!force && this.currentMove === type) return false;

    const config = getMoveConfig(type);
    this.currentMove = type;
    this.locked = config.locksPlayer;

    const animKey = `${this.fighterName}_${type}`;
    if (this.scene.anims.exists(animKey)) {
      this.play(animKey);
    }

    if (config.velocityX) {
      this.scene.events.emit('fighter-move', this, config.velocityX);
    }
    return true;
  }

  takeDamage(damage: number, attackType: MoveType): void {
    if (this.currentMove === MoveType.BLOCK) {
      damage = Math.round(damage * CONFIG.BLOCK_DAMAGE);
    } else {
      this.locked = false;
      if (this.currentMove === MoveType.SQUAT) {
        this.trySetMove(MoveType.SQUAT_ENDURE, true);
      } else if (attackType === MoveType.UPPERCUT || attackType === MoveType.SPIN_KICK) {
        this.trySetMove(MoveType.KNOCK_DOWN, true);
      } else {
        this.trySetMove(MoveType.ENDURE, true);
      }
    }
    this.hp = Math.max(0, this.hp - damage);
  }

  reset(): void {
    this.hp = CONFIG.STARTING_HP;
    this.currentMove = MoveType.STAND;
    this.locked = false;
    this.trySetMove(MoveType.STAND);
  }
}
