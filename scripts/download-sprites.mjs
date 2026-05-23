import fs from 'node:fs/promises';
import path from 'node:path';
import { createWriteStream } from 'node:fs';
import { get } from 'node:https';

const BASE = 'https://www.mortalkombatwarehouse.com';
const FIGHTERS = ['subzero', 'kano'];

function fetch(url) {
  return new Promise((resolve, reject) => {
    get(url, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        return fetch(new URL(res.headers.location, url).href).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest);
    get(url, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        file.close();
        return downloadFile(new URL(res.headers.location, url).href, dest).then(resolve).catch(reject);
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err) => { file.close(); reject(err); });
  });
}

async function main() {
  let total = 0;
  let downloaded = 0;

  for (const fighter of FIGHTERS) {
    console.log(`\n--- ${fighter} ---`);
    const html = await fetch(`${BASE}/mk3/${fighter}/sprites/`);

    // Extract all PNG references with their path (e.g., stance/01.png)
    // MKW site uses single quotes in img tags
    const re = /<img[^>]+src=['"]([^'"]+\.png)['"][^>]*>/g;
    let m;
    const files = [];
    while ((m = re.exec(html)) !== null) {
      const src = m[1];
      // Skip known non-sprite paths
      if (src.includes('/ext/') || src.includes('/site/') || src.includes('/icons/')) continue;
      // Normalize the path - it might be relative
      const clean = src.startsWith('http') ? new URL(src).pathname : src;
      const parts = clean.replace(/^\//, '').split('/');
      // Path should be like: mk3/fighter/sprites/category/file.png
      if (parts.length >= 5 && parts[parts.length - 3] === 'sprites') {
        const category = parts[parts.length - 2];
        const filename = parts[parts.length - 1];
        if (filename.endsWith('.png')) {
          files.push({ category, filename, url: src.startsWith('http') ? src : `${BASE}${src.startsWith('/') ? src : '/mk3/' + fighter + '/sprites/' + src}` });
        }
      } else if (parts.length >= 2) {
        // Relative paths like: stance/01.png
        const category = parts[parts.length - 2];
        const filename = parts[parts.length - 1];
        if (filename.endsWith('.png') && category.length < 20 && !category.includes('.')) {
          files.push({ category, filename, url: `${BASE}/mk3/${fighter}/sprites/${category}/${filename}` });
        }
      }
    }

    // Group by category
    const groups = {};
    for (const f of files) {
      if (!groups[f.category]) groups[f.category] = [];
      groups[f.category].push(f);
    }

    for (const [category, items] of Object.entries(groups)) {
      const dir = `assets/raw/${fighter}/${category}`;
      await fs.mkdir(dir, { recursive: true });
      total += items.length;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const dest = path.join(dir, item.filename);
        try { await fs.access(dest); downloaded++; continue; } catch {}

        process.stdout.write(`  [${category}] ${item.filename} (${i+1}/${items.length})\r`);
        try {
          await downloadFile(item.url, dest);
          downloaded++;
        } catch (err) {
          console.error(`\n  FAILED: ${item.filename} - ${err.message}`);
        }
      }
      console.log(`  ${category}: ${items.length} frames`);
    }
  }

  console.log(`\nDownloaded ${downloaded}/${total} frames.`);
  console.log('Now run: node scripts/build-sprites.mjs');
}

main().catch(console.error);
