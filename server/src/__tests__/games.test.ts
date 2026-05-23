import { describe, it, expect } from 'vitest';
import { Game, GameCollection } from '../games.js';

describe('GameCollection', () => {
  it('should create and retrieve a game', () => {
    const collection = new GameCollection();
    const game = collection.createGame('test-game');
    expect(game).toBeDefined();
    expect(collection.getGame('test-game')).toBe(game);
  });

  it('should return undefined for duplicate game creation', () => {
    const collection = new GameCollection();
    collection.createGame('test-game');
    const duplicate = collection.createGame('test-game');
    expect(duplicate).toBeUndefined();
  });

  it('should list only games with less than 2 players', () => {
    const collection = new GameCollection();
    const game1 = collection.createGame('game-1')!;
    const game2 = collection.createGame('game-2')!;

    const fakeSocket = { emit: () => {}, on: () => {}, disconnect: () => {} } as any;
    game2.addPlayer(fakeSocket);
    game2.addPlayer(fakeSocket);

    const games = collection.listGames();
    expect(games).toHaveLength(1);
    expect(games[0].id).toBe('game-1');
  });

  it('should remove a game', () => {
    const collection = new GameCollection();
    collection.createGame('test-game');
    expect(collection.getGame('test-game')).toBeDefined();
    collection.removeGame('test-game');
    expect(collection.getGame('test-game')).toBeUndefined();
  });
});

describe('Game', () => {
  const fakeSocket = { emit: () => {}, on: () => {}, disconnect: () => {} } as any;

  it('should return the correct id', () => {
    const collection = new GameCollection();
    const game = collection.createGame('test-id')!;
    expect(game.id).toBe('test-id');
  });

  it('should start with 0 players', () => {
    const collection = new GameCollection();
    const game = collection.createGame('test-game')!;
    expect(game.playerCount).toBe(0);
  });

  it('should accept up to 2 players', () => {
    const collection = new GameCollection();
    const game = collection.createGame('test-game')!;
    expect(game.addPlayer(fakeSocket)).toBe(true);
    expect(game.playerCount).toBe(1);
    expect(game.addPlayer(fakeSocket)).toBe(true);
    expect(game.playerCount).toBe(2);
  });

  it('should reject a 3rd player', () => {
    const collection = new GameCollection();
    const game = collection.createGame('test-game')!;
    game.addPlayer(fakeSocket);
    game.addPlayer(fakeSocket);
    expect(game.addPlayer(fakeSocket)).toBe(false);
    expect(game.playerCount).toBe(2);
  });
});
