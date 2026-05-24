import * as fs from 'fs';
import * as path from 'path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const GOLDEN_DIR = path.resolve(__dirname, '..', 'golden');
const OUTPUT_DIR = path.resolve(__dirname, '..', 'output');
const ACTUAL_DIR = path.join(OUTPUT_DIR, 'actual');
const DIFF_DIR = path.join(OUTPUT_DIR, 'diff');

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export async function compareScreenshot(
  screenshotBuffer: Buffer,
  name: string,
  threshold: number = 0.001,
): Promise<{ passed: boolean; diffPixels: number; totalPixels: number }> {
  ensureDir(ACTUAL_DIR);
  ensureDir(DIFF_DIR);

  const actualPng = PNG.sync.read(screenshotBuffer);
  const actualPath = path.join(ACTUAL_DIR, `${name}.png`);
  fs.writeFileSync(actualPath, screenshotBuffer);

  const goldenPath = path.join(GOLDEN_DIR, `${name}.png`);

  if (process.env.UPDATE_GOLDENS === '1') {
    fs.mkdirSync(GOLDEN_DIR, { recursive: true });
    fs.writeFileSync(goldenPath, screenshotBuffer);
    return { passed: true, diffPixels: 0, totalPixels: actualPng.width * actualPng.height };
  }

  if (!fs.existsSync(goldenPath)) {
    throw new Error(`Golden image not found: ${goldenPath}. Run with UPDATE_GOLDENS=1 to create it.`);
  }

  const goldenPng = PNG.sync.read(fs.readFileSync(goldenPath));

  const { width, height } = actualPng;
  if (goldenPng.width !== width || goldenPng.height !== height) {
    throw new Error(`Size mismatch for ${name}: actual ${width}x${height}, golden ${goldenPng.width}x${goldenPng.height}`);
  }

  const diff = new PNG({ width, height });
  const diffPixels = pixelmatch(
    actualPng.data, goldenPng.data, diff.data, width, height,
    { threshold: 0.1, alpha: 0.1 },
  );

  const totalPixels = width * height;

  if (diffPixels > 0) {
    fs.writeFileSync(path.join(DIFF_DIR, `${name}.png`), PNG.sync.write(diff));
  }

  const diffRatio = diffPixels / totalPixels;
  return { passed: diffRatio <= threshold, diffPixels, totalPixels };
}
