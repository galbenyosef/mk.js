import type { Socket } from 'socket.io';

export const Messages = {
  EVENT: 'event',
  LIFE_UPDATE: 'life-update',
  POSITION_UPDATE: 'position-update',
  PLAYER_CONNECTED: 'player-connected',
} as const;

export class Game {
  private _players: Socket[] = [];

  constructor(
    private _id: string,
    private _collection: GameCollection,
  ) {}

  get id(): string {
    return this._id;
  }

  get playerCount(): number {
    return this._players.length;
  }

  addPlayer(socket: Socket): boolean {
    if (this._players.length > 1) return false;
    this._players.push(socket);
    if (this._players.length === 1) {
      socket.on('disconnect', () => this.endGame(0));
    } else {
      this._addHandlers();
      this._players[0].emit(Messages.PLAYER_CONNECTED, 0);
    }
    return true;
  }

  private _addHandlers(): void {
    const [p1, p2] = this._players;
    const m = Messages;

    const relay = (from: Socket, to: Socket) => {
      from.on(m.EVENT, (data: unknown) => to.emit(m.EVENT, data));
      from.on(m.LIFE_UPDATE, (data: unknown) => to.emit(m.LIFE_UPDATE, data));
      from.on(m.POSITION_UPDATE, (data: unknown) => to.emit(m.POSITION_UPDATE, data));
    };

    relay(p1, p2);
    relay(p2, p1);

    p1.on('disconnect', () => this.endGame(0));
    p2.on('disconnect', () => this.endGame(1));
  }

  endGame(playerOut: number): void {
    if (!this._players.length) return;
    const opponentIndex = playerOut === 0 ? 1 : 0;
    const opponent = this._players[opponentIndex];
    this._players = [];
    if (opponent) opponent.disconnect();
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

  listGames(): { id: string; playerCount: number }[] {
    const result: { id: string; playerCount: number }[] = [];
    for (const [id, game] of this._games) {
      if (game.playerCount < 2) {
        result.push({ id, playerCount: game.playerCount });
      }
    }
    return result;
  }
}
