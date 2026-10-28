#!/usr/bin/env node
/**
 * 校对逐字稿数据：找出会让跟读体验变差的问题行。
 *
 *   node tools/check-articles.mjs
 *
 * 查的是那些在页面上看不出来、但跟读时很难受的毛病：
 * 只剩标点的碎行、播放器残留文字、时间轴倒退或超出音频长度。
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'src/data';
const problems = [];
let totalArticles = 0;
let totalLines = 0;

/** 播放器 / 页面残留的常见文字 */
const JUNK = /^(available|no media source|loading|error|advertisement)$/i;

for (const file of readdirSync(DIR)) {
  if (!file.startsWith('voa-') || !file.endsWith('.ts')) continue;
  const src = readFileSync(join(DIR, file), 'utf8');

  // 按文章切块
  const blocks = src.split(/\n  \{\n/).slice(1);
  for (const block of blocks) {
    totalArticles++;
    const id = block.match(/id: "([^"]+)"/)?.[1] ?? '?';
    const duration = Number(block.match(/duration: ([\d.]+)/)?.[1] ?? 0);

    // para 是后来加的字段（阅读视图要按段排版），这里用非捕获组兼容
    // 有和没有两种写法 —— 写死顺序的话，新数据会一行都匹配不上，
    // 校对工具反而成了假警报的来源。
    const lines = [
      ...block.matchAll(
        /\{ id: '([^']+)',(?:\s*para: \d+,)? text: "((?:[^"\\]|\\.)*)", start: ([\d.]+), end: ([\d.]+) \}/g,
      ),
    ];
    totalLines += lines.length;

    if (lines.length === 0) {
      problems.push(`[${file}] ${id} 没解析出任何行`);
      continue;
    }

    let prevEnd = -1;
    for (const [, lineId, text, startS, endS] of lines) {
      const start = Number(startS);
      const end = Number(endS);
      const plain = text.replace(/\\"/g, '"');

      if (!/[A-Za-z぀-ヿ一-鿿]/.test(plain)) {
        problems.push(`[${file}] ${id}/${lineId} 这行没有实际文字：${JSON.stringify(plain)}`);
      } else if (JUNK.test(plain.trim())) {
        problems.push(`[${file}] ${id}/${lineId} 疑似播放器残留：${JSON.stringify(plain)}`);
      } else if (plain.trim().length < 8) {
        problems.push(`[${file}] ${id}/${lineId} 太短，跟读没意义：${JSON.stringify(plain)}`);
      }

      if (end <= start) {
        problems.push(`[${file}] ${id}/${lineId} 时间轴反了：${start} → ${end}`);
      }
      if (start < prevEnd - 0.01) {
        problems.push(`[${file}] ${id}/${lineId} 时间点倒退：上一行结束 ${prevEnd}，这行开始 ${start}`);
      }
      prevEnd = end;
    }

    const last = Number(lines[lines.length - 1][4]);
    if (duration && last > duration + 1) {
      problems.push(`[${file}] ${id} 最后一行(${last}s)超出音频长度(${duration}s)`);
    }
  }
}

console.log(`校对 ${totalArticles} 篇文章，${totalLines} 行逐字稿\n`);

if (problems.length === 0) {
  console.log('✓ 没有发现问题');
} else {
  console.log(`✗ ${problems.length} 处问题：`);
  for (const p of problems.slice(0, 40)) console.log('  ' + p);
  if (problems.length > 40) console.log(`  …还有 ${problems.length - 40} 处`);
  process.exitCode = 1;
}
