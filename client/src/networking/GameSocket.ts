import { io, type Socket } from 'socket.io-client';
import { MoveType } from '@mk.js/shared';
import type { GameInfo, GameReadyInfo } from '@mk.js/shared';

export class GameSocket {
  private _socket: Socket;

  constructor() {
    this._socket = io();
  }

  async createGame(name: string, fighterName?: string, arena?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this._socket.emit('create-game', { gameName: name, fighterName: fighterName || 'subzero', arena: arena || 'throne-room' }, (res: { success: boolean; error?: string }) => {
        if (res.success) resolve();
        else reject(new Error(res.error));
      });
    });
  }

  async joinGame(name: string, fighterName?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this._socket.emit('join-game', { gameName: name, fighterName: fighterName || 'kano' }, (res: { success: boolean; error?: string }) => {
        if (res.success) resolve();
        else reject(new Error(res.error));
      });
    });
  }

  async getGameList(): Promise<GameInfo[]> {
    return new Promise((resolve) => {
      this._socket.emit('list-games', (games: GameInfo[]) => resolve(games));
    });
  }

  sendMove(move: MoveType): void {
    this._socket.emit('event', move);
  }

  onOpponentMove(cb: (move: MoveType) => void): void {
    this._socket.on('event', cb);
  }

  sendLife(life: number): void {
    this._socket.emit('life-update', life);
  }

  sendPosition(x: number, y: number): void {
    this._socket.emit('position-update', { x, y });
  }

  onOpponentLife(cb: (life: number) => void): void {
    this._socket.on('life-update', cb);
  }

  onOpponentPosition(cb: (pos: { x: number; y: number }) => void): void {
    this._socket.on('position-update', cb);
  }

  onGameReady(cb: () => void): void {
    this._socket.on('game-ready', cb);
  }

  onPlayerLeft(cb: () => void): void {
    this._socket.on('disconnect', cb);
  }

  disconnect(): void {
    this._socket.disconnect();
  }
}
