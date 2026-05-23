import Phaser from 'phaser';
import { MoveType } from '@mk.js/shared';
import { Fighter } from '../entities/Fighter.js';
import type { BaseController } from './BaseController.js';

const P1_KEYS = {
  RIGHT: 74, LEFT: 71, UP: 89, DOWN: 72,
  BLOCK: 16, HP: 65, LP: 83, LK: 68, HK: 70,
};

export class BasicController implements BaseController {
  private _pressed: Record<number, boolean> = {};
  constructor(scene: Phaser.Scene, fighters: [Fighter, Fighter], _gameScene: Phaser.Scene) {
    const k = P1_KEYS;
    scene.input.keyboard!.on('keydown', (e: KeyboardEvent) => {
      this._pressed[e.keyCode] = true;
      const move = this._getMove();
      if (move) fighters[0].trySetMove(move);
    });
    scene.input.keyboard!.on('keyup', (e: KeyboardEvent) => {
      delete this._pressed[e.keyCode];
      const move = this._getMove();
      if (move) fighters[0].trySetMove(move);
      if (Object.keys(this._pressed).length === 0) fighters[0].trySetMove(MoveType.STAND);
    });
  }

  update(): void {}

  destroy(): void {
  }

  private _getMove(): MoveType | undefined {
    const p = this._pressed;
    const k = P1_KEYS;
    const m = MoveType;
    const f = null;
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
}
