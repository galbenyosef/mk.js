import Phaser from 'phaser';
import { MoveType, CONFIG } from '@mk.js/shared';
import type { MoveConfig } from '@mk.js/shared';

type MoveDef = Omit<MoveConfig, 'type' | 'animationKey'> & { type: MoveType };

const MOVE_DEFS: MoveDef[] = [
  { type: MoveType.STAND, damage: 0, duration: 80, hitFrame: -1, locksPlayer: false, returnTo: MoveType.STAND },
  { type: MoveType.WALK, damage: 0, duration: 80, hitFrame: -1, locksPlayer: false, returnTo: MoveType.STAND, velocityX: 2 },
  { type: MoveType.WALK_BACKWARD, damage: 0, duration: 80, hitFrame: -1, locksPlayer: false, returnTo: MoveType.STAND, velocityX: -2 },
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

const MOVE_CATEGORY: Partial<Record<MoveType, string>> = {
  [MoveType.STAND]: 'stance',
  [MoveType.WALK]: 'walk',
  [MoveType.WALK_BACKWARD]: 'walk',
  [MoveType.SQUAT]: 'duckjump',
  [MoveType.BLOCK]: 'block',
  [MoveType.HIGH_PUNCH]: 'punch',
  [MoveType.LOW_PUNCH]: 'punch',
  [MoveType.HIGH_KICK]: 'kick',
  [MoveType.LOW_KICK]: 'kick',
  [MoveType.UPPERCUT]: 'punch',
  [MoveType.SPIN_KICK]: 'kick',
  [MoveType.JUMP]: 'duckjump',
  [MoveType.FORWARD_JUMP]: 'duckjump',
  [MoveType.BACKWARD_JUMP]: 'duckjump',
  [MoveType.FALL]: 'fall',
  [MoveType.KNOCK_DOWN]: 'fall',
  [MoveType.WIN]: 'victory',
  [MoveType.ENDURE]: 'beinghit',
  [MoveType.SQUAT_ENDURE]: 'beinghit',
  [MoveType.STAND_UP]: 'stance',
  [MoveType.ATTRACTIVE_STAND_UP]: 'stance',
  [MoveType.FORWARD_JUMP_KICK]: 'duckjump',
  [MoveType.BACKWARD_JUMP_KICK]: 'duckjump',
  [MoveType.FORWARD_JUMP_PUNCH]: 'duckjump',
  [MoveType.BACKWARD_JUMP_PUNCH]: 'duckjump',
};

export function getMoveConfig(type: MoveType): MoveDef {
  return MOVE_DEFS.find((m) => m.type === type) ?? MOVE_DEFS[0];
}

function getCategoryFrameNames(texture: Phaser.Textures.Texture, atlasKey: string, category: string): Phaser.Types.Animations.AnimationFrame[] {
  const names = texture.getFrameNames().filter((n) => n.startsWith(`${category}/`));
  if (names.length === 0) return [];

  names.sort((a, b) => {
    const numA = parseInt(a.replace(`${category}/`, ''), 10);
    const numB = parseInt(b.replace(`${category}/`, ''), 10);
    return numA - numB;
  });

  return names.map((name) => ({ key: atlasKey, frame: name }));
}

export function createAnimations(scene: Phaser.Scene, fighterName: string, atlasKey: string): void {
  const texture = scene.textures.get(atlasKey);
  if (!texture || !texture.key) {
    console.warn(`[mk.js] Texture not found: ${atlasKey}`);
    return;
  }

  let created = 0;
  for (const def of MOVE_DEFS) {
    const animKey = `${fighterName}_${def.type}`;
    const category = MOVE_CATEGORY[def.type];
    if (!category) continue;
    const frames = getCategoryFrameNames(texture, atlasKey, category);
    if (frames.length === 0) continue;

    if (scene.anims.exists(animKey)) {
      created++;
      continue;
    }

    scene.anims.create({
      key: animKey,
      frames,
      frameRate: Math.round(1000 / def.duration),
      repeat: def.locksPlayer ? 0 : -1,
    });
    created++;
  }
  console.log(`[mk.js] Created ${created} animations for ${fighterName} (${atlasKey})`);
}
