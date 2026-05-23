import { MoveType } from '@mk.js/shared';
import type { Fighter } from '../entities/Fighter.js';
import type { GameScene } from '../scenes/GameScene.js';
import type { BaseController } from './BaseController.js';

enum AIState { IDLE, APPROACH, ATTACK, RETREAT }

export class AIController implements BaseController {
  private _state = AIState.IDLE;
  private _timer = 0;

  constructor(
    private _scene: Phaser.Scene,
    private _fighters: [Fighter, Fighter],
    private _gameScene: GameScene,
  ) {}

  update(): void {
    const ai = this._fighters[1];
    const player = this._fighters[0];
    const dist = Math.abs(ai.x - player.x);

    if (this._timer > 0) {
      this._timer--;
      return;
    }

    switch (this._state) {
      case AIState.IDLE:
      case AIState.APPROACH:
        if (dist > 150) {
          ai.trySetMove(ai.x < player.x ? MoveType.WALK : MoveType.WALK_BACKWARD);
          this._timer = 15;
        } else {
          this._state = AIState.ATTACK;
          this._timer = 5;
        }
        break;
      case AIState.ATTACK:
        ai.trySetMove(MoveType.HIGH_PUNCH);
        this._state = AIState.RETREAT;
        this._timer = 25;
        break;
      case AIState.RETREAT:
        ai.trySetMove(MoveType.WALK_BACKWARD);
        this._state = AIState.APPROACH;
        this._timer = 10;
        break;
    }
  }

  destroy(): void {}
}
