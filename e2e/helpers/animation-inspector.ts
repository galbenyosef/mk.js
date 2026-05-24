import { Page } from '@playwright/test';

export interface AnimInfo {
  key: string;
  moveType: string;
  frameCount: number;
  frameNames: string[];
  frameRate: number;
  repeat: number;
  yoyo: boolean;
  totalDurationMs: number;
}

export interface FighterAnimSet {
  fighter: string;
  animations: AnimInfo[];
}

export async function extractAnimations(page: Page, fighterName: string): Promise<FighterAnimSet> {
  return await page.evaluate((fighter) => {
    const g = (window as any).__MK_GAME;
    const am = g.anims;
    if (!am || typeof am.get !== 'function') return { fighter, animations: [] };

    // Try toJSON first (returns serialized animations)
    let jsonData: any[] = [];
    if (typeof am.toJSON === 'function') {
      try {
        const json = am.toJSON();
        if (Array.isArray(json)) jsonData = json;
        else if (json && json.anims) jsonData = json.anims;
      } catch {}
    }

    // If that failed, try iterating the internal map using Phaser's Map2 API
    if (jsonData.length === 0 && am.anims) {
      const map = am.anims;
      if (typeof map.get === 'function' && typeof map.entries === 'function') {
        // Map-like
        for (const [key, anim] of map.entries()) {
          jsonData.push({ key, ...anim });
        }
      } else if (typeof map.forEach === 'function') {
        map.forEach((anim: any, key: string) => {
          jsonData.push({ key, ...anim });
        });
      } else {
        // Plain object: try to deserialize each own property
        for (const key of Object.keys(map)) {
          const anim = map[key];
          if (anim && anim.frames) {
            jsonData.push({ key, ...anim });
          }
        }
      }
    }

    const result: any[] = [];
    for (const entry of jsonData) {
      const key = entry.key || '';
      if (!key.startsWith(`${fighter}_`)) continue;
      const anim = typeof am.get === 'function' ? am.get(key) : entry;
      if (!anim || !anim.frames) continue;
      const frameNames = anim.frames.map((f: any) => {
        if (typeof f === 'string') return f;
        return f.frame || f.textureFrame || 'unknown';
      });
      result.push({
        key,
        moveType: key.replace(`${fighter}_`, ''),
        frameCount: anim.frames.length,
        frameNames,
        frameRate: anim.frameRate,
        repeat: anim.repeat,
        yoyo: anim.yoyo,
        totalDurationMs: (anim.frames.length / anim.frameRate) * 1000,
      });
    }
    return { fighter, animations: result.sort((a: any, b: any) => a.moveType.localeCompare(b.moveType)) };
  }, fighterName);
}

export interface FrameInfo {
  name: string;
  width: number;
  height: number;
}

export async function getTextureFrames(page: Page, atlasKey: string): Promise<FrameInfo[]> {
  return await page.evaluate((key) => {
    const g = (window as any).__MK_GAME;
    const tex = g.textures.get(key);
    if (!tex) return [];
    return tex.getFrameNames().map((name: string) => {
      const f = tex.get(name);
      return { name, width: f.width, height: f.height };
    });
  }, atlasKey);
}
