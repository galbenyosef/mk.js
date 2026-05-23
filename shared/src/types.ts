import type { MoveType } from './constants.js';

export interface FighterConfig {
  name: string;
  displayName: string;
}

export interface MoveConfig {
  type: MoveType;
  animationKey: string;
  damage: number;
  duration: number;
  hitFrame: number;
  velocityX?: number;
  velocityY?: number;
  locksPlayer: boolean;
  returnTo: MoveType;
}

export interface KeyConfig {
  RIGHT: number;
  LEFT: number;
  UP: number;
  DOWN: number;
  BLOCK: number;
  HP: number;
  LP: number;
  LK: number;
  HK: number;
}

export interface GameOptions {
  mode: 'local' | 'network' | 'ai' | 'basic';
  p1Fighter: string;
  p2Fighter: string;
  arena: string;
  gameName?: string;
  isHost?: boolean;
}

export interface GameInfo {
  gameName: string;
  playerCount: number;
  arena: string;
}

export interface GameReadyInfo {
  opponentName: string;
  arena: string;
  playerIndex: number;
}

export interface FighterState {
  playerIndex: number;
  hp: number;
  x: number;
  y: number;
  currentMove: MoveType;
  orientation: 'left' | 'right';
  locked: boolean;
}

export interface GameState {
  round: number;
  roundActive: boolean;
  roundWins: [number, number];
  timeRemaining: number;
  fighters: [FighterState, FighterState];
}

export type GameEvent =
  | { type: 'PLAYER_JOINED'; playerName: string }
  | { type: 'PLAYER_LEFT'; playerName: string }
  | { type: 'GAME_START' }
  | { type: 'ROUND_START'; round: number }
  | { type: 'ROUND_END'; winner: number }
  | { type: 'GAME_OVER'; winner: number }
  | { type: 'MOVE_EXECUTED'; playerIndex: number; move: MoveType }
  | { type: 'HIT'; attacker: number; defender: number; damage: number }
  | { type: 'BLOCKED'; attacker: number; defender: number }
  | { type: 'PLAYER_DISCONNECTED'; playerIndex: number }
  | { type: 'CHAT_MESSAGE'; playerIndex: number; message: string };
