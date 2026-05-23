import Phaser from 'phaser';
import { MoveType } from '@mk.js/shared';
import type { KeyConfig } from '@mk.js/shared';
import type { Fighter } from '../entities/Fighter.js';
import type { GameScene } from '../scenes/GameScene.js';
import type { BaseController } from './BaseController.js';
import { getMoveConfig } from '../moves/MoveRegistry.js';

const P1_KEYS: KeyConfig = {
  RIGHT: 68, LEFT: 65, UP: 87, DOWN: 83,
  BLOCK: 32, HP: 76, LP: 74, LK: 75, HK: 186,
};

const P2_KEYS: KeyConfig = {
  RIGHT: 39, LEFT: 37, UP: 38, DOWN: 40,
  BLOCK: 17, HP: 80, LP: 219, LK: 221, HK: 220,
};

export class LocalController implements BaseController {
  private _input: Record<number, Map<number, boolean>> = { 0: new Map(), 1: new Map() };

  constructor(
    private _scene: Phaser.Scene,
    private _fighters: [Fighter, Fighter],
    private _gameScene: GameScene,
  ) {
    this._scene.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
      if (event.repeat) return;
      for (let p = 0; p < 2; p++) {
        this._input[p].set(event.keyCode, true);
        const move = this._getMove(this._input[p], p === 0 ? P1_KEYS : P2_KEYS, this._fighters[p]);
        if (move) this._fighters[p].trySetMove(move);
      }
    });
    this._scene.input.keyboard!.on('keyup', (event: KeyboardEvent) => {
      for (let p = 0; p < 2; p++) {
        this._input[p].delete(event.keyCode);
        if (this._input[p].size === 0) {
          this._fighters[p].trySetMove(MoveType.STAND);
        } else {
          const move = this._getMove(this._input[p], p === 0 ? P1_KEYS : P2_KEYS, this._fighters[p]);
          if (move) this._fighters[p].trySetMove(move);
        }
      }
    });
  }

  update(): void {}

  destroy(): void {
    this._scene.input.keyboard?.removeAllListeners();
  }

  private _getMove(pressed: Map<number, boolean>, k: KeyConfig, f: Fighter): MoveType | undefined {
    const m = MoveType;
    if (f.currentMove === m.SQUAT && !pressed.has(k.DOWN)) return m.STAND_UP;
    if (f.currentMove === m.BLOCK && !pressed.has(k.BLOCK)) return m.STAND;
    if (pressed.size === 0) return m.STAND;
    if (pressed.has(k.BLOCK)) return m.BLOCK;
    if (pressed.has(k.LEFT)) {
      if (pressed.has(k.UP)) return m.BACKWARD_JUMP;
      if (pressed.has(k.HK) && f.orientation === 'left') return m.SPIN_KICK;
      return m.WALK_BACKWARD;
    }
    if (pressed.has(k.RIGHT)) {
      if (pressed.has(k.UP)) return m.FORWARD_JUMP;
      if (pressed.has(k.HK) && f.orientation === 'right') return m.SPIN_KICK;
      return m.WALK;
    }
    if (pressed.has(k.DOWN)) {
      if (pressed.has(k.HP)) return m.UPPERCUT;
      if (pressed.has(k.LK)) return m.SQUAT_LOW_KICK;
      if (pressed.has(k.HK)) return m.SQUAT_HIGH_KICK;
      if (pressed.has(k.LP)) return m.SQUAT_LOW_PUNCH;
      return m.SQUAT;
    }
    if (pressed.has(k.HK)) return m.HIGH_KICK;
    if (pressed.has(k.LK)) return m.LOW_KICK;
    if (pressed.has(k.UP)) return m.JUMP;
    if (pressed.has(k.LP)) return m.LOW_PUNCH;
    if (pressed.has(k.HP)) return m.HIGH_PUNCH;
    return undefined;
  }
}
