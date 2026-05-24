import Phaser from 'phaser';
import { MoveType, CONFIG } from '@mk.js/shared';
import { getMoveConfig } from '../moves/MoveRegistry.js';

const FALLBACK_FRAME: Partial<Record<MoveType, string>> = {
  [MoveType.STAND]: 'stance/01',
  [MoveType.WALK]: 'walk/01',
  [MoveType.WALK_BACKWARD]: 'walk/01',
  [MoveType.SQUAT]: 'duckjump/d01',
  [MoveType.STAND_UP]: 'stance/01',
  [MoveType.BLOCK]: 'block/01',
  [MoveType.HIGH_PUNCH]: 'punch/01',
  [MoveType.LOW_PUNCH]: 'punch/a01',
  [MoveType.HIGH_KICK]: 'kick/01',
  [MoveType.LOW_KICK]: 'kick/a01',
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

export const JUMP_TYPES = new Set([
  MoveType.JUMP, MoveType.FORWARD_JUMP, MoveType.BACKWARD_JUMP,
  MoveType.FORWARD_JUMP_KICK, MoveType.BACKWARD_JUMP_KICK,
  MoveType.FORWARD_JUMP_PUNCH, MoveType.BACKWARD_JUMP_PUNCH,
]);

export class Fighter extends Phaser.GameObjects.Sprite {
  public playerIndex: number;
  public hp: number;
  public currentMove: MoveType = MoveType.STAND;
  public locked = false;
  public jumpDescending = false;
  public jumpElapsed = 0;
  public returnToStandTimer = 0;
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
    const tex = scene.textures.get(atlasKey);
    const stanceFrames = tex?.getFrameNames().filter((n: string) => n.startsWith('stance/') && /^stance\/\d+$/.test(n)) ?? [];
    const firstStance = stanceFrames.sort()[0] ?? 'stance/01';
    super(scene, x, y, atlasKey, firstStance);
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
          if (config.returnTo === MoveType.STAND) {
            this.y = CONFIG.PLAYER_TOP;
          }
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

  private _getJumpTotalTime(move: MoveType): number {
    if (move === MoveType.FORWARD_JUMP || move === MoveType.BACKWARD_JUMP) return 640;
    return 720; // JUMP (yoyo)
  }

  tickJumpTimer(delta: number): void {
    if (this.returnToStandTimer > 0) {
      this.returnToStandTimer -= delta;
      if (this.returnToStandTimer <= 0) {
        this.returnToStandTimer = 0;
        this.locked = false;
        this.y = CONFIG.PLAYER_TOP;
        this.trySetMove(MoveType.STAND, true);
      }
    }
  }

  trySetMove(type: MoveType, force = false): boolean {
    if (!force && this.locked && type !== MoveType.WIN) {
      const allJumpMoves = new Set([...JUMP_TYPES]);
      const allowed = JUMP_TYPES.has(this.currentMove) && allJumpMoves.has(type);
      if (!allowed) return false;
      // Gate jump attacks behind descent (legacy behavior)
      const jumpAttacks = [MoveType.FORWARD_JUMP_KICK, MoveType.BACKWARD_JUMP_KICK,
        MoveType.FORWARD_JUMP_PUNCH, MoveType.BACKWARD_JUMP_PUNCH];
      if (jumpAttacks.includes(type) && !this.jumpDescending) return false;
    }
    if (!force && this.currentMove === type) return false;

    const wasInJump = JUMP_TYPES.has(this.currentMove);
    const isJump = JUMP_TYPES.has(type);

    if (isJump && !wasInJump) {
      this.jumpDescending = false;
      this.jumpElapsed = 0;
      this.returnToStandTimer = 0;
    }

    // Step inheritance: jump attack borrows remaining time from parent jump
    const jumpAttacks = [MoveType.FORWARD_JUMP_KICK, MoveType.BACKWARD_JUMP_KICK,
      MoveType.FORWARD_JUMP_PUNCH, MoveType.BACKWARD_JUMP_PUNCH];
    if (jumpAttacks.includes(type) && JUMP_TYPES.has(this.currentMove) && !wasInJump) {
      const total = this._getJumpTotalTime(this.currentMove);
      this.returnToStandTimer = Math.max(total - this.jumpElapsed, 50);
    }

    this.locked = false;
    this.currentMove = type;
    const config = getMoveConfig(type);
    this.locked = config.locksPlayer;

    const animKey = `${this.fighterName}_${type}`;
    if (this.scene.anims.exists(animKey)) {
      this.play(animKey);
    } else {
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
    this.locked = false;
    this.currentMove = undefined as unknown as MoveType;
    this.jumpDescending = false;
    this.jumpElapsed = 0;
    this.trySetMove(MoveType.STAND);
  }
}
