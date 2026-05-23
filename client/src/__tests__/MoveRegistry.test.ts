import { describe, it, expect } from 'vitest';
import { MoveType } from '@mk.js/shared';
import { getMoveConfig } from '../moves/MoveRegistry.js';

describe('getMoveConfig', () => {
  it('returns STAND config', () => {
    const cfg = getMoveConfig(MoveType.STAND);
    expect(cfg.damage).toBe(0);
    expect(cfg.locksPlayer).toBe(false);
  });

  it('returns HIGH_PUNCH config with damage 8', () => {
    const cfg = getMoveConfig(MoveType.HIGH_PUNCH);
    expect(cfg.damage).toBe(8);
    expect(cfg.hitFrame).toBe(2);
    expect(cfg.locksPlayer).toBe(true);
    expect(cfg.returnTo).toBe(MoveType.STAND);
  });

  it('returns UPPERCUT config with damage 13', () => {
    const cfg = getMoveConfig(MoveType.UPPERCUT);
    expect(cfg.damage).toBe(13);
    expect(cfg.locksPlayer).toBe(true);
  });

  it('returns KNOCK_DOWN config returning to ATTRACTIVE_STAND_UP', () => {
    const cfg = getMoveConfig(MoveType.KNOCK_DOWN);
    expect(cfg.returnTo).toBe(MoveType.ATTRACTIVE_STAND_UP);
  });

  it('returns WALK config with positive velocity', () => {
    const cfg = getMoveConfig(MoveType.WALK);
    expect(cfg.velocityX).toBe(5);
  });

  it('returns WALK_BACKWARD config with negative velocity', () => {
    const cfg = getMoveConfig(MoveType.WALK_BACKWARD);
    expect(cfg.velocityX).toBe(-5);
  });

  it('defaults to STAND for unknown type', () => {
    const cfg = getMoveConfig('unknown' as MoveType);
    expect(cfg.type).toBe(MoveType.STAND);
  });
});
