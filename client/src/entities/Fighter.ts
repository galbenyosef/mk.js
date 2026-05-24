import Phaser from 'phaser';
import { MoveType, CONFIG } from '@mk.js/shared';
import { getMoveConfig } from '../moves/MoveRegistry.js';

// Map MoveType to a fallback frame name in the spritesheet
const FALLBACK_FRAME: Partial<Record<MoveType, string>> = {
  [MoveType.STAND]: 'stance/01',
  [MoveType.WALK]: 'walk/01',
  [MoveType.WALK_BACKWARD]: 'walk/01',
  [MoveType.SQUAT]: 'duckjump/d01',
  [MoveType.STAND_UP]: 'stance/01',
  [MoveType.BLOCK]: 'block/01',
  [MoveType.HIGH_PUNCH]: 'punch/01',
  [MoveType.LOW_PUNCH]: 'punch/01',
  [MoveType.HIGH_KICK]: 'kick/01',
  [MoveType.LOW_KICK]: 'kick/01',
  [MoveType.UPPERCUT]: 'punch/u01',
  [MoveType.SPIN_KICK]: 'kick/r01',
  [MoveType.JUMP]: 'duckjump/j01',
  [MoveType.FORWARD_JUMP]: 'duckjump/f01',
  [MoveType.BACKWARD_JUMP]: 'duckjump/j01',
  [MoveType.FORWARD_JUMP_KICK]: 'duckjump/f01',
  [MoveType.BACKWARD_JUMP_KICK]: 'duckjump/j01',
  [MoveType.FORWARD_JUMP_PUNCH]: 'duckjump/f01',
  [MoveType.BACKWARD_JUMP_PUNCH]: 'duckjump/j01',
  [MoveType.FALL]: 'fall/f01',
  [MoveType.KNOCK_DOWN]: 'fall/f01',
  [MoveType.ATTRACTIVE_STAND_UP]: 'stance/01',
  [MoveType.WIN]: 'victory/01',
  [MoveType.ENDURE]: 'beinghit/h01',
  [MoveType.SQUAT_ENDURE]: 'beinghit/s01',
};

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
    super(scene, x, y, atlasKey, 'stance/01');
    this.playerIndex = playerIndex;
    this._orientation = orientation;
    this.hp = CONFIG.STARTING_HP;
    scene.add.existing(this);
    this.setOrigin(0.5, 1);
    this.setFlipX(orientation === 'right');

    this.on('animationcomplete', (anim: Phaser.Animations.Animation) => {
      if (this.locked) {
        this.locked = false;
        const config = getMoveConfig(this.currentMove);
        if (config.returnTo !== this.currentMove) {
          this.trySetMove(config.returnTo);
        }
      }
    });
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

    this.currentMove = type;
    const config = getMoveConfig(type);
    this.locked = config.locksPlayer;

    const animKey = `${this.fighterName}_${type}`;
    if (this.scene.anims.exists(animKey)) {
      this.play(animKey);
    } else {
      // Fallback: show a static frame so we never see __BASE
      const fallback = FALLBACK_FRAME[type];
      if (fallback) {
        try { this.setFrame(fallback); } catch {}
      }
    }

    return true;
  }

  takeDamage(damage: number, attackType: MoveType): void {
    const isLowAttack = [
      MoveType.LOW_PUNCH, MoveType.LOW_KICK,
      MoveType.SQUAT_LOW_KICK, MoveType.SQUAT_HIGH_KICK,
      MoveType.SQUAT_LOW_PUNCH,
    ].includes(attackType);

    if (this.currentMove === MoveType.BLOCK) {
      damage = Math.round(damage * CONFIG.BLOCK_DAMAGE);
    } else if (this.currentMove === MoveType.SQUAT) {
      if (isLowAttack) {
        damage = Math.round(damage * CONFIG.BLOCK_DAMAGE);
      } else {
        this.locked = false;
        this.trySetMove(
          attackType === MoveType.UPPERCUT || attackType === MoveType.SPIN_KICK
            ? MoveType.KNOCK_DOWN : MoveType.ENDURE, true);
      }
    } else {
      this.locked = false;
      this.trySetMove(
        attackType === MoveType.UPPERCUT || attackType === MoveType.SPIN_KICK
          ? MoveType.KNOCK_DOWN : MoveType.ENDURE, true);
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
