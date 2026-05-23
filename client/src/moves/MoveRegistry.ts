import Phaser from 'phaser';
import { MoveType, CONFIG } from '@mk.js/shared';
import type { MoveConfig } from '@mk.js/shared';

type MoveDef = Omit<MoveConfig, 'type' | 'animationKey'> & { type: MoveType };

const MOVE_DEFS: MoveDef[] = [
  { type: MoveType.STAND, damage: 0, duration: 80, hitFrame: -1, locksPlayer: false, returnTo: MoveType.STAND },
  { type: MoveType.WALK, damage: 0, duration: 80, hitFrame: -1, locksPlayer: false, returnTo: MoveType.STAND, velocityX: 5 },
  { type: MoveType.WALK_BACKWARD, damage: 0, duration: 80, hitFrame: -1, locksPlayer: false, returnTo: MoveType.STAND, velocityX: -5 },
  { type: MoveType.SQUAT, damage: 0, duration: 40, hitFrame: -1, locksPlayer: false, returnTo: MoveType.STAND },
  { type: MoveType.BLOCK, damage: 0, duration: 40, hitFrame: -1, locksPlayer: false, returnTo: MoveType.STAND },
  { type: MoveType.HIGH_PUNCH, damage: 8, duration: 40, hitFrame: 2, locksPlayer: true, returnTo: MoveType.STAND },
  { type: MoveType.LOW_PUNCH, damage: 5, duration: 40, hitFrame: 2, locksPlayer: true, returnTo: MoveType.STAND },
  { type: MoveType.HIGH_KICK, damage: 10, duration: 40, hitFrame: 3, locksPlayer: true, returnTo: MoveType.STAND },
  { type: MoveType.LOW_KICK, damage: 6, duration: 40, hitFrame: 3, locksPlayer: true, returnTo: MoveType.STAND },
  { type: MoveType.UPPERCUT, damage: 13, duration: 60, hitFrame: 2, locksPlayer: true, returnTo: MoveType.STAND },
  { type: MoveType.SPIN_KICK, damage: 13, duration: 60, hitFrame: 3, locksPlayer: true, returnTo: MoveType.STAND },
  { type: MoveType.FALL, damage: 0, duration: 100, hitFrame: -1, locksPlayer: true, returnTo: MoveType.STAND },
  { type: MoveType.KNOCK_DOWN, damage: 0, duration: 80, hitFrame: -1, locksPlayer: true, returnTo: MoveType.ATTRACTIVE_STAND_UP },
  { type: MoveType.ENDURE, damage: 0, duration: 80, hitFrame: -1, locksPlayer: true, returnTo: MoveType.STAND },
  { type: MoveType.SQUAT_ENDURE, damage: 0, duration: 80, hitFrame: -1, locksPlayer: true, returnTo: MoveType.SQUAT },
  { type: MoveType.WIN, damage: 0, duration: 100, hitFrame: -1, locksPlayer: true, returnTo: MoveType.WIN },
];

export function getMoveConfig(type: MoveType): MoveDef {
  return MOVE_DEFS.find((m) => m.type === type) ?? MOVE_DEFS[0];
}

export function createAnimations(scene: Phaser.Scene, fighterName: string, atlasKey: string): void {
  const texture = scene.textures.get(atlasKey);
  if (!texture || !texture.key) {
    console.warn(`Texture not found: ${atlasKey}`);
    return;
  }

  for (const def of MOVE_DEFS) {
    const animKey = `${fighterName}_${def.type}`;
    const frames = scene.anims.generateFrameNames(atlasKey, {
      prefix: `${def.type}/`,
      zeroPad: 0,
      end: -1,
    });

    if (frames.length === 0) continue;

    scene.anims.create({
      key: animKey,
      frames,
      frameRate: Math.round(1000 / def.duration),
      repeat: def.locksPlayer ? 0 : -1,
    });
  }

  const standKey = `${fighterName}_${MoveType.STAND}`;
  if (!scene.anims.exists(standKey)) {
    const anyFrame = scene.anims.generateFrameNames(atlasKey, { prefix: '', end: 0 });
    if (anyFrame.length > 0) {
      scene.anims.create({ key: standKey, frames: anyFrame, frameRate: 1, repeat: -1 });
    }
  }
}
