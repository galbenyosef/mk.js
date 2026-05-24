import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

interface SpritesheetJSON {
  frames: Record<string, { frame: { x: number; y: number; w: number; h: number } }>;
}

function loadSheet(fighter: string): SpritesheetJSON {
  const p = path.resolve(__dirname, `../../../assets/build/${fighter}/spritesheet.json`);
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

function framesByCategory(sheet: SpritesheetJSON): Record<string, string[]> {
  const cats: Record<string, string[]> = {};
  for (const name of Object.keys(sheet.frames)) {
    const cat = name.split('/')[0];
    if (!cats[cat]) cats[cat] = [];
    cats[cat].push(name);
  }
  return cats;
}

const FIGHTERS = ['subzero', 'kano', 'liukang', 'sonya'];
const REQUIRED_CATEGORIES = ['stance', 'walk', 'duckjump', 'punch', 'kick', 'block', 'beinghit', 'fall', 'victory'];

describe('spritesheet structure', () => {
  for (const fighter of FIGHTERS) {
    describe(fighter, () => {
      const sheet = loadSheet(fighter);
      const cats = framesByCategory(sheet);

      it('has all required categories', () => {
        for (const cat of REQUIRED_CATEGORIES) {
          expect(cats[cat]).toBeDefined();
          expect(cats[cat].length).toBeGreaterThan(0);
        }
      });

      it('duckjump has only prefixed frames (d*, dt*, f*, j*)', () => {
        const frames = cats['duckjump'] || [];
        for (const f of frames) {
          const suffix = f.replace('duckjump/', '');
          // No bare-numeric frames like "01", "02"
          expect(suffix).toMatch(/^[a-z]/);
        }
      });

      it('beinghit has only prefixed frames (d*, h*, l*, s*, t*)', () => {
        const frames = cats['beinghit'] || [];
        for (const f of frames) {
          const suffix = f.replace('beinghit/', '');
          expect(suffix).toMatch(/^[a-z]/);
        }
      });

      it('fall has only prefixed frames (f*, h*, s*)', () => {
        const frames = cats['fall'] || [];
        for (const f of frames) {
          const suffix = f.replace('fall/', '');
          expect(suffix).toMatch(/^[a-z]/);
        }
      });

      it('block has bare-numeric and d-prefix frames', () => {
        const frames = cats['block'] || [];
        const prefixes = new Set(frames.map(f => {
          const s = f.replace('block/', '');
          return s.replace(/[0-9]/g, '') || '(none)';
        }));
        expect(prefixes.has('(none)')).toBe(true);
        expect(prefixes.has('d')).toBe(true);
      });

      it('punch has correct prefix groups: bare, d, u, a', () => {
        const frames = cats['punch'] || [];
        const prefixes = new Set(frames.map(f => {
          const s = f.replace('punch/', '');
          const p = s.replace(/[0-9]/g, '') || '(none)';
          // Remove numeric-only prefix
          return p;
        }));
        expect(prefixes.has('(none)')).toBe(true);
        expect(prefixes.has('d')).toBe(true);
        expect(prefixes.has('u')).toBe(true);
        expect(prefixes.has('a')).toBe(true);
      });

      it('kick has correct prefix groups: bare, a, d, r, s', () => {
        const frames = cats['kick'] || [];
        const prefixes = new Set(frames.map(f => {
          const s = f.replace('kick/', '');
          return s.replace(/[0-9]/g, '') || '(none)';
        }));
        expect(prefixes.has('(none)')).toBe(true);
        expect(prefixes.has('d')).toBe(true);
        expect(prefixes.has('r')).toBe(true);
        expect(prefixes.has('s')).toBe(true);
        expect(prefixes.has('a')).toBe(true);
      });

      it('stance has bare-numeric and t-prefix frames', () => {
        const frames = cats['stance'] || [];
        const prefixes = new Set(frames.map(f => {
          const s = f.replace('stance/', '');
          return s.replace(/[0-9]/g, '') || '(none)';
        }));
        expect(prefixes.has('(none)')).toBe(true);
        expect(prefixes.has('t')).toBe(true);
      });

      it('no frame has zero dimensions', () => {
        for (const [name, data] of Object.entries(sheet.frames)) {
          expect(data.frame.w).toBeGreaterThan(0);
          expect(data.frame.h).toBeGreaterThan(0);
        }
      });

      it('core animation frames have reasonable sizes for main categories', () => {
        const tallCats = ['stance', 'walk', 'punch', 'kick', 'block', 'beinghit'];
        for (const cat of tallCats) {
          const frames = cats[cat] || [];
          for (const f of frames) {
            const fd = sheet.frames[f];
            // Core body frames should have height > 40 (not tiny icons)
            if (!f.includes('/bodyparts/') && !f.includes('/finishers/')) {
              expect(fd.frame.h).toBeGreaterThan(40);
            }
          }
        }
      });
    });
  }
});

describe('cross-fighter frame count consistency', () => {
  const allData: Record<string, Record<string, number>> = {};
  for (const fighter of FIGHTERS) {
    const sheet = loadSheet(fighter);
    allData[fighter] = {};
    for (const name of Object.keys(sheet.frames)) {
      const cat = name.split('/')[0];
      allData[fighter][cat] = (allData[fighter][cat] || 0) + 1;
    }
  }

  it('all fighters have similar duckjump frame counts', () => {
    const counts = FIGHTERS.map(f => allData[f]['duckjump']);
    const max = Math.max(...counts);
    const min = Math.min(...counts);
    expect(max - min).toBeLessThanOrEqual(3);
  });

  it('all fighters have similar beinghit frame counts', () => {
    const counts = FIGHTERS.map(f => allData[f]['beinghit']);
    const max = Math.max(...counts);
    const min = Math.min(...counts);
    expect(max - min).toBeLessThanOrEqual(5);
  });

  it('all fighters have similar fall frame counts', () => {
    const counts = FIGHTERS.map(f => allData[f]['fall']);
    const max = Math.max(...counts);
    const min = Math.min(...counts);
    expect(max - min).toBeLessThanOrEqual(5);
  });

  it('all fighters have at least 6 stance frames', () => {
    for (const f of FIGHTERS) {
      expect(allData[f]['stance']).toBeGreaterThanOrEqual(6);
    }
  });
});
