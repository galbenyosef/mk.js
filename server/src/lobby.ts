import { type Server, type Socket } from 'socket.io';
import { GameCollection } from './games.js';

export function setupLobby(io: Server): void {
  const games = new GameCollection();

  io.on('connection', (socket: Socket) => {
    socket.on('list-games', (ack?: (games: { gameName: string; playerCount: number; arena: string }[]) => void) => {
      if (ack) ack(games.listGames().map(g => ({ ...g, arena: g.arena || 'throne-room' })));
    });

    socket.on('create-game', (data: { gameName: string; fighterName?: string; arena?: string }, ack?: Function) => {
      const game = games.createGame(data.gameName);
      if (game) {
        game.arena = data.arena || 'throne-room';
        game.addPlayer(socket, data.fighterName || 'subzero');
        if (ack) ack({ success: true });
      } else {
        if (ack) ack({ success: false, error: 'GAME_EXISTS' });
      }
    });

    socket.on('join-game', (data: { gameName: string; fighterName?: string }, ack?: Function) => {
      const game = games.getGame(data.gameName);
      if (!game) {
        if (ack) ack({ success: false, error: 'GAME_NOT_EXISTS' });
      } else if (game.addPlayer(socket, data.fighterName || 'kano')) {
        game.players.forEach(p => p.emit('game-ready', { opponentName: data.fighterName || 'kano', arena: game.arena }));
        if (ack) ack({ success: true });
      } else {
        if (ack) ack({ success: false, error: 'GAME_FULL' });
      }
    });
  });
}
