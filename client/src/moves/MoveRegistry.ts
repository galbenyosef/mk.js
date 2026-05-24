import Phaser from 'phaser';
import { MoveType, CONFIG } from '@mk.js/shared';
import type { MoveConfig } from '@mk.js/shared';

type MoveDef = Omit<MoveConfig, 'type' | 'animationKey'> & { type: MoveType };

const MOVE_DEFS: MoveDef[] = [
  { type: MoveType.STAND, damage: 0, duration: 80, hitFrame: -1, locksPlayer: false, returnTo: MoveType.STAND },
  { type: MoveType.WALK, damage: 0, duration: 80, hitFrame: -1, locksPlayer: false, returnTo: MoveType.STAND, velocityX: 2 },
  { type: MoveType.WALK_BACKWARD, damage: 0, duration: 80, hitFrame: -1, locksPlayer: false, returnTo: MoveType.STAND, velocityX: -2 },
  { type: MoveType.SQUAT, damage: 0, duration: 100, hitFrame: -1, locksPlayer: false, returnTo: MoveType.SQUAT },
  { type: MoveType.STAND_UP, damage: 0, duration: 80, hitFrame: -1, locksPlayer: false, returnTo: MoveType.STAND },
  { type: MoveType.BLOCK, damage: 0, duration: 80, hitFrame: -1, locksPlayer: false, returnTo: MoveType.BLOCK },
  { type: MoveType.HIGH_PUNCH, damage: 8, duration: 40, hitFrame: 2, locksPlayer: true, returnTo: MoveType.STAND },
  { type: MoveType.LOW_PUNCH, damage: 5, duration: 40, hitFrame: 2, locksPlayer: true, returnTo: MoveType.STAND },
  { type: MoveType.HIGH_KICK, damage: 10, duration: 40, hitFrame: 3, locksPlayer: true, returnTo: MoveType.STAND },
  { type: MoveType.LOW_KICK, damage: 6, duration: 40, hitFrame: 3, locksPlayer: true, returnTo: MoveType.STAND },
  { type: MoveType.UPPERCUT, damage: 13, duration: 60, hitFrame: 2, locksPlayer: true, returnTo: MoveType.STAND },
  { type: MoveType.SPIN_KICK, damage: 13, duration: 60, hitFrame: 3, locksPlayer: true, returnTo: MoveType.STAND },
  { type: MoveType.JUMP, damage: 0, duration: 60, hitFrame: -1, locksPlayer: true, returnTo: MoveType.STAND, velocityY: -5 },
  { type: MoveType.FORWARD_JUMP, damage: 0, duration: 80, hitFrame: -1, locksPlayer: true, returnTo: MoveType.STAND, velocityX: 5, velocityY: -6 },
  { type: MoveType.BACKWARD_JUMP, damage: 0, duration: 80, hitFrame: -1, locksPlayer: true, returnTo: MoveType.STAND, velocityX: -5, velocityY: -6 },
  { type: MoveType.FORWARD_JUMP_KICK, damage: 10, duration: 80, hitFrame: 1, locksPlayer: true, returnTo: MoveType.STAND, velocityX: 5, velocityY: -6 },
  { type: MoveType.BACKWARD_JUMP_KICK, damage: 10, duration: 80, hitFrame: 1, locksPlayer: true, returnTo: MoveType.STAND, velocityX: -5, velocityY: -6 },
  { type: MoveType.FORWARD_JUMP_PUNCH, damage: 9, duration: 80, hitFrame: 1, locksPlayer: true, returnTo: MoveType.STAND, velocityX: 5, velocityY: -6 },
  { type: MoveType.BACKWARD_JUMP_PUNCH, damage: 9, duration: 80, hitFrame: 1, locksPlayer: true, returnTo: MoveType.STAND, velocityX: -5, velocityY: -6 },
  { type: MoveType.SQUAT_LOW_KICK, damage: 4, duration: 70, hitFrame: 1, locksPlayer: true, returnTo: MoveType.SQUAT },
  { type: MoveType.SQUAT_HIGH_KICK, damage: 6, duration: 70, hitFrame: 1, locksPlayer: true, returnTo: MoveType.SQUAT },
  { type: MoveType.SQUAT_LOW_PUNCH, damage: 4, duration: 70, hitFrame: 1, locksPlayer: true, returnTo: MoveType.SQUAT },
  { type: MoveType.FALL, damage: 0, duration: 100, hitFrame: -1, locksPlayer: true, returnTo: MoveType.STAND },
  { type: MoveType.KNOCK_DOWN, damage: 0, duration: 80, hitFrame: -1, locksPlayer: true, returnTo: MoveType.ATTRACTIVE_STAND_UP },
  { type: MoveType.ENDURE, damage: 0, duration: 80, hitFrame: -1, locksPlayer: true, returnTo: MoveType.STAND },
  { type: MoveType.SQUAT_ENDURE, damage: 0, duration: 80, hitFrame: -1, locksPlayer: true, returnTo: MoveType.SQUAT },
  { type: MoveType.ATTRACTIVE_STAND_UP, damage: 0, duration: 100, hitFrame: -1, locksPlayer: true, returnTo: MoveType.STAND },
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
  [MoveType.SQUAT_LOW_KICK]: 'kick',
  [MoveType.SQUAT_HIGH_KICK]: 'kick',
  [MoveType.SQUAT_LOW_PUNCH]: 'punch',
};

const MOVE_LOOP: Partial<Record<MoveType, boolean>> = {
  [MoveType.STAND]: true,
  [MoveType.WALK]: true,
  [MoveType.WALK_BACKWARD]: true,
};

const MOVE_YOYO: Partial<Record<MoveType, boolean>> = {
  [MoveType.JUMP]: true,
  [MoveType.BACKWARD_JUMP]: true,
};

const MOVE_FRAME_LIMIT: Partial<Record<MoveType, number>> = {
  [MoveType.HIGH_PUNCH]: 5,
  [MoveType.LOW_PUNCH]: 5,
  [MoveType.HIGH_KICK]: 7,
  [MoveType.LOW_KICK]: 6,
  [MoveType.UPPERCUT]: 5,
  [MoveType.SPIN_KICK]: 8,
  [MoveType.SQUAT_LOW_KICK]: 3,
  [MoveType.SQUAT_HIGH_KICK]: 4,
  [MoveType.SQUAT_LOW_PUNCH]: 3,
};

const MOVE_PREFIX: Partial<Record<MoveType, string>> = {
  [MoveType.STAND]: '',
  [MoveType.WALK]: '',
  [MoveType.WALK_BACKWARD]: '',
  [MoveType.SQUAT]: 'd',
  [MoveType.STAND_UP]: 'dt',
  [MoveType.BLOCK]: '',
  [MoveType.HIGH_PUNCH]: '',
  [MoveType.LOW_PUNCH]: '',
  [MoveType.HIGH_KICK]: '',
  [MoveType.LOW_KICK]: '',
  [MoveType.UPPERCUT]: 'u',
  [MoveType.SPIN_KICK]: 'r',
  [MoveType.JUMP]: 'j',
  [MoveType.FORWARD_JUMP]: 'f',
  [MoveType.BACKWARD_JUMP]: 'j',
  [MoveType.FALL]: 'f',
  [MoveType.KNOCK_DOWN]: 'h',
  [MoveType.WIN]: '',
  [MoveType.ENDURE]: 'h',
  [MoveType.SQUAT_ENDURE]: 's',
  [MoveType.ATTRACTIVE_STAND_UP]: 't',
  [MoveType.SQUAT_LOW_KICK]: 'd',
  [MoveType.SQUAT_HIGH_KICK]: 'd',
  [MoveType.SQUAT_LOW_PUNCH]: 'd',
  [MoveType.FORWARD_JUMP_KICK]: 'f',
  [MoveType.BACKWARD_JUMP_KICK]: 'j',
  [MoveType.FORWARD_JUMP_PUNCH]: 'f',
  [MoveType.BACKWARD_JUMP_PUNCH]: 'j',
};

export function getMoveConfig(type: MoveType): MoveDef {
  return MOVE_DEFS.find((m) => m.type === type) ?? MOVE_DEFS[0];
}

function getFrameSuffix(frameName: string, category: string): string {
  return frameName.slice(category.length + 1);
}

function getFrameNumber(suffix: string): number {
  return parseInt(suffix.replace(/^[a-z]+/, ''), 10) || 0;
}

function getCategoryFrameNames(
  texture: Phaser.Textures.Texture,
  atlasKey: string,
  category: string,
  prefix: string | undefined,
): Phaser.Types.Animations.AnimationFrame[] {
  const names = texture.getFrameNames().filter((n) => {
    if (!n.startsWith(`${category}/`)) return false;
    if (prefix === undefined) return true;
    const suffix = getFrameSuffix(n, category);
    if (prefix === '') return /^\d/.test(suffix);
    return suffix.startsWith(prefix);
  });
  if (names.length === 0) return [];

  names.sort((a, b) => {
    const numA = getFrameNumber(getFrameSuffix(a, category));
    const numB = getFrameNumber(getFrameSuffix(b, category));
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
    const prefix = MOVE_PREFIX[def.type];
    let frames = getCategoryFrameNames(texture, atlasKey, category, prefix);
    if (frames.length === 0) continue;

    const maxFrames = MOVE_FRAME_LIMIT[def.type];
    if (maxFrames !== undefined && frames.length > maxFrames) {
      frames = frames.slice(0, maxFrames);
    }

    if (scene.anims.exists(animKey)) {
      created++;
      continue;
    }

    const yoyo = MOVE_YOYO[def.type] === true;
    const loop = MOVE_LOOP[def.type] === true;
    scene.anims.create({
      key: animKey,
      frames,
      frameRate: Math.round(1000 / def.duration),
      repeat: def.locksPlayer ? 0 : (loop ? -1 : 0),
      yoyo,
    });
    created++;
  }
  console.log(`[mk.js] Created ${created} animations for ${fighterName} (${atlasKey})`);
}
