import type { Server, Socket } from 'socket.io';
import { GameCollection } from './games.js';

export function setupLobby(io: Server): void {
  const games = new GameCollection();

  io.on('connection', (socket: Socket) => {
    socket.on('list-games', () => {
      socket.emit('games-list', games.listGames());
    });

    socket.on('create-game', (gameName: string) => {
      const game = games.createGame(gameName);
      if (game) {
        game.addPlayer(socket);
        socket.emit('game-created', { success: true, gameName });
      } else {
        socket.emit('game-created', { success: false, error: 'Game already exists' });
      }
    });

    socket.on('join-game', (gameName: string) => {
      const game = games.getGame(gameName);
      if (!game) {
        socket.emit('game-joined', { success: false, error: 'Game not found' });
        return;
      }
      if (game.addPlayer(socket)) {
        socket.emit('game-joined', { success: true, gameName });
      } else {
        socket.emit('game-joined', { success: false, error: 'Game is full' });
      }
    });
  });
}
