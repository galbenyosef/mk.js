import Phaser from 'phaser';
import { MoveType } from '@mk.js/shared';
import type { Fighter } from '../entities/Fighter.js';
import type { BaseController } from './BaseController.js';

// Standard WASD + JKL; layout
// W=up(87) A=left(65) S=down(83) D=right(68)
// J=LP(74) K=LK(75) L=HP(76) ;=HK(186)
// U=uppercut(85) Space=block(32)
export const P1_KEYS = {
  UP: 87, LEFT: 65, DOWN: 83, RIGHT: 68,
  LP: 74, LK: 75, HP: 76, HK: 186,
  BLOCK: 32,
};

export class BasicController implements BaseController {
  private _pressed: Record<number, boolean> = {};
  private _fighters!: [Fighter, Fighter];
  private _lastMove: MoveType | undefined;

  constructor(scene: Phaser.Scene, fighters: [Fighter, Fighter], _gameScene: Phaser.Scene) {
    this._fighters = fighters;
    scene.input.keyboard!.on('keydown', (e: KeyboardEvent) => {
      if (e.repeat) return;
      this._pressed[e.keyCode] = true;
    });
    scene.input.keyboard!.on('keyup', (e: KeyboardEvent) => {
      delete this._pressed[e.keyCode];
    });
  }

  update(): void {
    const move = this._getMove(this._fighters[0].currentMove);
    if (move !== undefined) {
      this._fighters[0].trySetMove(move);
    }
  }

  destroy(): void {}

  _getMove(currentMove: MoveType): MoveType | undefined {
    const p = this._pressed;
    const k = P1_KEYS;
    const m = MoveType;
    if (Object.keys(p).length === 0) {
      if (currentMove === m.SQUAT) return m.STAND_UP;
      return m.STAND;
    }
    const jumping = currentMove === m.JUMP || currentMove === m.FORWARD_JUMP
      || currentMove === m.BACKWARD_JUMP || currentMove === m.FORWARD_JUMP_KICK
      || currentMove === m.BACKWARD_JUMP_KICK || currentMove === m.FORWARD_JUMP_PUNCH
      || currentMove === m.BACKWARD_JUMP_PUNCH;
    if (p[k.HP]) {
      if (p[k.DOWN]) return m.UPPERCUT;
      if (p[k.UP] || jumping) return m.FORWARD_JUMP_PUNCH;
      return m.HIGH_PUNCH;
    }
    if (p[k.LP]) {
      if (p[k.DOWN]) return m.SQUAT_LOW_PUNCH;
      if (p[k.UP] || jumping) return m.FORWARD_JUMP_PUNCH;
      return m.LOW_PUNCH;
    }
    if (p[k.HK]) {
      if (p[k.DOWN]) return m.SQUAT_HIGH_KICK;
      if (p[k.UP] || jumping) return m.FORWARD_JUMP_KICK;
      return m.HIGH_KICK;
    }
    if (p[k.LK]) {
      if (p[k.DOWN]) return m.SQUAT_LOW_KICK;
      if (p[k.UP] || jumping) return m.FORWARD_JUMP_KICK;
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
}
