#!/usr/bin/env node
/** 统计各场景的片段数 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const counts = {};
const dir = 'src/data';

for (const file of readdirSync(dir)) {
  if (!file.endsWith('.ts') || file === 'index.ts') continue;
  const src = readFileSync(join(dir, file), 'utf8');

  const at = src.indexOf('segments:');
  if (at === -1) continue;
  const body = src.slice(at);

  const re = /scene:\s*'([^']+)'/g;
  let m;
  while ((m = re.exec(body))) {
    const scene = m[1];
    counts[scene] = (counts[scene] || 0) + 1;
  }
}

const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
console.log('场景分布：\n');
for (const [scene, n] of sorted) {
  console.log(`  ${scene.padEnd(12)} ${n}`);
}
console.log(`\n总计 ${Object.values(counts).reduce((a, b) => a + b, 0)} 个片段`);
