import { MoveType } from '@mk.js/shared';
import type { Fighter } from '../entities/Fighter.js';
import type { GameScene } from '../scenes/GameScene.js';
import type { BaseController } from './BaseController.js';

export class NetworkController implements BaseController {
  private _localFighter: Fighter;
  private _remoteFighter: Fighter;
  private _localIndex: number;

  constructor(
    private _scene: Phaser.Scene,
    private _fighters: [Fighter, Fighter],
    private _gameScene: GameScene,
    private _isHost: boolean,
  ) {
    this._localIndex = this._isHost ? 1 : 0;
    this._localFighter = this._fighters[this._localIndex];
    this._remoteFighter = this._fighters[1 - this._localIndex];
  }

  update(): void {
    // In a complete implementation, keyboard input for the local player
    // would be handled here, and moves sent over the socket.
    // The remote player's moves are received via socket and applied
    // to _remoteFighter directly by the GameSocket.
  }

  destroy(): void {}
}
