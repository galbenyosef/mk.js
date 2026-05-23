import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const RAW_DIR = 'assets/raw';
const BUILD_DIR = 'assets/build';
const MAX_WIDTH = 2048; // WebGL safe max texture width

async function buildSpritesheet(fighterName) {
  const fighterDir = path.join(RAW_DIR, fighterName);
  const categories = await fs.readdir(fighterDir);
  const allFrames = [];

  for (const category of categories) {
    const catDir = path.join(fighterDir, category);
    const files = (await fs.readdir(catDir))
      .filter(f => f.endsWith('.png'))
      .sort();

    for (const file of files) {
      const imgPath = path.join(catDir, file);
      const meta = await sharp(imgPath).metadata();
      allFrames.push({
        path: imgPath,
        name: `${category}/${file.replace('.png', '')}`,
        width: meta.width,
        height: meta.height,
      });
    }
  }

  if (allFrames.length === 0) {
    console.warn(`Warning: no frames found for fighter "${fighterName}", skipping.`);
    return;
  }

  // Arrange frames in a grid that fits within MAX_WIDTH
  const placements = [];
  let curX = 0;
  let curY = 0;
  let rowHeight = 0;

  for (const f of allFrames) {
    if (curX + f.width > MAX_WIDTH) {
      // Start a new row
      curX = 0;
      curY += rowHeight;
      rowHeight = 0;
    }
    placements.push({ frame: f, x: curX, y: curY });
    curX += f.width;
    rowHeight = Math.max(rowHeight, f.height);
  }

  const totalWidth = Math.min(MAX_WIDTH, placements.reduce((max, p) => Math.max(max, p.x + p.frame.width), 0));
  const totalHeight = curY + rowHeight;

  const buffers = await Promise.all(allFrames.map(f => sharp(f.path).toBuffer()));
  const composite = placements.map((p, i) => ({
    input: buffers[i],
    top: p.y,
    left: p.x,
  }));

  const outDir = path.join(BUILD_DIR, fighterName);
  await fs.mkdir(outDir, { recursive: true });

  await sharp({
    create: {
      width: totalWidth,
      height: totalHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composite)
    .png()
    .toFile(path.join(outDir, 'spritesheet.png'));

  // Build atlas JSON with correct positions
  const frames = {};
  for (const p of placements) {
    frames[p.frame.name] = {
      frame: { x: p.x, y: p.y, w: p.frame.width, h: p.frame.height },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: p.frame.width, h: p.frame.height },
      sourceSize: { w: p.frame.width, h: p.frame.height },
    };
  }

  const atlas = {
    meta: {
      image: 'spritesheet.png',
      size: { w: totalWidth, h: totalHeight },
      scale: 1,
    },
    frames,
  };

  await fs.writeFile(path.join(outDir, 'spritesheet.json'), JSON.stringify(atlas, null, 2));
  console.log(`Built spritesheet for ${fighterName}: ${allFrames.length} frames (${totalWidth}x${totalHeight})`);
}

async function main() {
  try {
    await fs.stat(RAW_DIR).catch(() => {
      console.error(`Error: raw assets directory "${RAW_DIR}" does not exist.`);
      process.exit(1);
    });
    const fighters = await fs.readdir(RAW_DIR);
    for (const fighter of fighters) {
      const stat = await fs.stat(path.join(RAW_DIR, fighter));
      if (stat.isDirectory()) {
        try {
          await buildSpritesheet(fighter);
        } catch (err) {
          console.error(`Error building spritesheet for "${fighter}":`, err);
        }
      }
    }
    console.log('All spritesheets built.');
  } catch (err) {
    console.error('Error building spritesheets:', err);
    process.exit(1);
  }
}

main();
