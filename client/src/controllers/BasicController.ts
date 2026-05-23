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
  BLOCK: 32, UPPERCUT: 85,
};

export class BasicController implements BaseController {
  private _pressed: Record<number, boolean> = {};
  private _fighters!: [Fighter, Fighter];

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
    const move = this._getMove();
    if (move) this._fighters[0].trySetMove(move);
  }

  destroy(): void {}

  _getMove(): MoveType | undefined {
    const p = this._pressed;
    const k = P1_KEYS;
    const m = MoveType;
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
      if (p[k.UPPERCUT]) return m.UPPERCUT;
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
}
