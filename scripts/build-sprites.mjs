import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const RAW_DIR = 'assets/raw';
const BUILD_DIR = 'assets/build';

async function buildSpritesheet(fighterName) {
  const fighterDir = path.join(RAW_DIR, fighterName);
  const categories = await fs.readdir(fighterDir);
  const allFrames = [];
  let totalWidth = 0;
  let maxHeight = 0;

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
      totalWidth += meta.width;
      maxHeight = Math.max(maxHeight, meta.height);
    }
  }

  if (allFrames.length === 0) {
    console.warn(`Warning: no frames found for fighter "${fighterName}", skipping.`);
    return;
  }

  const buffers = await Promise.all(
    allFrames.map(f => sharp(f.path).toBuffer())
  );
  const composite = buffers.map((buf, i) => ({
    input: buf,
    top: 0,
    left: allFrames.slice(0, i).reduce((acc, f) => acc + f.width, 0),
  }));

  const outDir = path.join(BUILD_DIR, fighterName);
  await fs.mkdir(outDir, { recursive: true });

  await sharp({
    create: {
      width: totalWidth,
      height: maxHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composite)
    .png()
    .toFile(path.join(outDir, 'spritesheet.png'));

  let x = 0;
  const frames = {};
  for (const f of allFrames) {
    frames[f.name] = {
      frame: { x, y: 0, w: f.width, h: f.height },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: f.width, h: f.height },
      sourceSize: { w: f.width, h: f.height },
    };
    x += f.width;
  }

  const atlas = {
    meta: {
      image: 'spritesheet.png',
      size: { w: totalWidth, h: maxHeight },
      scale: 1,
    },
    frames,
  };

  await fs.writeFile(
    path.join(outDir, 'spritesheet.json'),
    JSON.stringify(atlas, null, 2),
  );
  console.log(`Built spritesheet for ${fighterName}: ${allFrames.length} frames`);
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
