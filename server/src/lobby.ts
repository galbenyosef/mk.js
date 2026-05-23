import type { Server, Socket } from 'socket.io';
import { GameCollection } from './games.js';

export function setupLobby(io: Server): void {
  const games = new GameCollection();

  io.on('connection', (socket: Socket) => {
    socket.on('list-games', (ack?: (games: { gameName: string; playerCount: number }[]) => void) => {
      if (ack) ack(games.listGames());
    });

    socket.on('create-game', (gameName: string, ack?: (res: { success: boolean; error?: string }) => void) => {
      const game = games.createGame(gameName);
      if (game) {
        game.addPlayer(socket);
        if (ack) ack({ success: true });
      } else {
        if (ack) ack({ success: false, error: 'GAME_EXISTS' });
      }
    });

    socket.on('join-game', (gameName: string, ack?: (res: { success: boolean; error?: string }) => void) => {
      const game = games.getGame(gameName);
      if (!game) {
        if (ack) ack({ success: false, error: 'GAME_NOT_EXISTS' });
      } else if (game.addPlayer(socket)) {
        if (ack) ack({ success: true });
      } else {
        if (ack) ack({ success: false, error: 'GAME_FULL' });
      }
    });
  });
}
