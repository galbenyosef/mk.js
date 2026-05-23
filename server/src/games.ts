import type { Socket } from 'socket.io';

export class Game {
  private _players: Socket[] = [];
  private _id: string;
  private _collection: GameCollection;
  private _playerNames: string[] = [];
  public arena = 'throne-room';

  constructor(id: string, collection: GameCollection) {
    this._id = id;
    this._collection = collection;
  }

  get id(): string { return this._id; }
  get playerCount(): number { return this._players.length; }
  get players(): Socket[] { return this._players; }

  addPlayer(socket: Socket, fighterName?: string): boolean {
    if (this._players.length >= 2) return false;
    this._players.push(socket);
    this._playerNames.push(fighterName || 'unknown');
    if (this._players.length === 1) {
      socket.on('disconnect', () => this.endGame(0));
    }
    if (this._players.length === 2) {
      this._addHandlers();
    }
    return true;
  }

  private _addHandlers(): void {
    const [p1, p2] = this._players;
    p1.on('event', (data: unknown) => p2.emit('event', data));
    p1.on('life-update', (data: unknown) => p2.emit('life-update', data));
    p1.on('position-update', (data: unknown) => p2.emit('position-update', data));
    p2.on('event', (data: unknown) => p1.emit('event', data));
    p2.on('life-update', (data: unknown) => p1.emit('life-update', data));
    p2.on('position-update', (data: unknown) => p1.emit('position-update', data));
    p2.on('disconnect', () => this.endGame(1));
  }

  endGame(playerOut: number): void {
    if (!this._players.length) return;
    const opponent = this._players[1 - playerOut];
    if (opponent && opponent.connected) {
      opponent.emit('player-left', { playerOut });
      opponent.disconnect();
    }
    this._players = [];
    this._collection.removeGame(this._id);
  }
}

export class GameCollection {
  private _games = new Map<string, Game>();

  getGame(id: string): Game | undefined {
    return this._games.get(id);
  }

  createGame(id: string): Game | undefined {
    if (this._games.has(id)) return undefined;
    const game = new Game(id, this);
    this._games.set(id, game);
    return game;
  }

  removeGame(id: string): boolean {
    return this._games.delete(id);
  }

  listGames(): { gameName: string; playerCount: number; arena: string }[] {
    const result: { gameName: string; playerCount: number; arena: string }[] = [];
    for (const [gameName, game] of this._games) {
      if (game.playerCount < 2) {
        result.push({ gameName, playerCount: game.playerCount, arena: game.arena });
      }
    }
    return result;
  }
}
