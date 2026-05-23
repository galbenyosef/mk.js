import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';

const RAW_DIR = 'assets/raw';
const BUILD_DIR = 'assets/build';
const ARENA_DIR = 'assets/build/arenas';

const COLORS = {
  subzero: { r: 0x33, g: 0x66, b: 0xff },
  kano: { r: 0xff, g: 0x33, b: 0x33 },
};

const CATEGORIES = {
  stance: 3,
  walk: 3,
  punch: 3,
  kick: 3,
  block: 2,
  beinghit: 3,
  fall: 3,
  duckjump: 3,
  victory: 3,
};

async function generateFighter(fighterName) {
  const color = COLORS[fighterName] || { r: 128, g: 128, b: 128 };
  
  for (const [category, count] of Object.entries(CATEGORIES)) {
    const dir = path.join(RAW_DIR, fighterName, category);
    await fs.mkdir(dir, { recursive: true });

    for (let i = 1; i <= count; i++) {
      const brightness = 128 + Math.floor((i / count) * 127);
      const adjustedColor = {
        r: Math.min(255, Math.floor(color.r * brightness / 128)),
        g: Math.min(255, Math.floor(color.g * brightness / 128)),
        b: Math.min(255, Math.floor(color.b * brightness / 128)),
      };
      
      await sharp({
        create: {
          width: 50,
          height: 80,
          channels: 4,
          background: { ...adjustedColor, alpha: 1 },
        },
      })
        .png()
        .toFile(path.join(dir, `${String(i).padStart(2, '0')}.png`));
    }
  }
  console.log(`Generated placeholders for ${fighterName}`);
}

async function generateArena() {
  await fs.mkdir(ARENA_DIR, { recursive: true });
  await sharp({
    create: {
      width: 600,
      height: 400,
      channels: 4,
      background: { r: 30, g: 30, b: 80, alpha: 1 },
    },
  })
    .png()
    .toFile(path.join(ARENA_DIR, 'throne-room.png'));
  
  // Also add a floor line
  const floorBuffer = await sharp({
    create: {
      width: 600,
      height: 400,
      channels: 4,
      background: { r: 30, g: 30, b: 80, alpha: 1 },
    },
  })
    .composite([{
      input: Buffer.from(
        `<svg width="600" height="400">
          <rect x="0" y="280" width="600" height="4" fill="#555555"/>
          <rect x="0" y="320" width="600" height="80" fill="#222244"/>
        </svg>`
      ),
      top: 0,
      left: 0,
    }])
    .png()
    .toBuffer();
  
  await sharp(floorBuffer).toFile(path.join(ARENA_DIR, 'throne-room.png'));
  console.log('Generated arena background');
}

async function main() {
  await generateFighter('subzero');
  await generateFighter('kano');
  await generateArena();

  // Remove raw/ from .gitignore if needed so build script can find them
  console.log('Placeholder assets generated. Now run: node scripts/build-sprites.mjs');
}

main().catch(console.error);
