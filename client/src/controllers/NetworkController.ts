import { MoveType } from '@mk.js/shared';
import { Fighter } from '../entities/Fighter.js';
import { GameSocket } from '../networking/GameSocket.js';
import type { BaseController } from './BaseController.js';

const P1_KEYS = {
  RIGHT: 74, LEFT: 71, UP: 89, DOWN: 72,
  BLOCK: 16, HP: 65, LP: 83, LK: 68, HK: 70,
};

export class NetworkController implements BaseController {
  private _socket: GameSocket;
  private _localFighter: Fighter;
  private _remoteFighter: Fighter;
  private _localIndex: number;
  private _pressed: Record<number, boolean> = {};
  private _lifeInterval?: ReturnType<typeof setInterval>;
  private _posInterval?: ReturnType<typeof setInterval>;

  constructor(
    scene: Phaser.Scene,
    fighters: [Fighter, Fighter],
    _gameScene: Phaser.Scene,
    isHost: boolean,
  ) {
    this._localIndex = isHost ? 1 : 0;
    this._localFighter = fighters[this._localIndex];
    this._remoteFighter = fighters[1 - this._localIndex];
    this._socket = new GameSocket();

    this._socket.onOpponentMove((move: MoveType) => {
      this._remoteFighter.trySetMove(move);
    });
    this._socket.onOpponentLife((life: number) => {
      this._remoteFighter.hp = life;
    });
    this._socket.onOpponentPosition((pos: { x: number; y: number }) => {
      this._remoteFighter.setPosition(pos.x, pos.y);
    });

    const k = P1_KEYS;
    scene.input.keyboard!.on('keydown', (e: KeyboardEvent) => {
      this._pressed[e.keyCode] = true;
      const move = this._getMove();
      if (move) {
        this._localFighter.trySetMove(move);
        this._socket.sendMove(move);
      }
    });
    scene.input.keyboard!.on('keyup', (e: KeyboardEvent) => {
      delete this._pressed[e.keyCode];
      const move = this._getMove();
      if (move) {
        this._localFighter.trySetMove(move);
        this._socket.sendMove(move);
      } else if (Object.keys(this._pressed).length === 0) {
        this._localFighter.trySetMove(MoveType.STAND);
        this._socket.sendMove(MoveType.STAND);
      }
    });

    this._lifeInterval = setInterval(() => {
      this._socket.sendLife(this._localFighter.hp);
    }, 2000);
    this._posInterval = setInterval(() => {
      if (!this._localFighter.locked) {
        this._socket.sendPosition(this._localFighter.x, this._localFighter.y);
      }
    }, 500);
  }

  update(): void {}

  destroy(): void {
    clearInterval(this._lifeInterval);
    clearInterval(this._posInterval);
    this._socket.disconnect();
  }

  private _getMove(): MoveType | undefined {
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
