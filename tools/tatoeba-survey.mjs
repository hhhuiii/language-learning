/**
 * 先盘点：Tatoeba 导出里有多少句同时满足
 *   ① 有真人录音  ② 录音授权可用  ③ 有中文翻译
 * 只统计，不生成数据。原始文件当作不可信输入，路径从参数传进来。
 *
 *   node tools/tatoeba-survey.mjs <rawDir>
 */

import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { join } from 'node:path';

const raw = process.argv[2];
if (!raw) {
  console.error('用法：node tools/tatoeba-survey.mjs <rawDir>');
  process.exit(1);
}

/** 逐行读，避免把上百 MB 的文件整个塞进内存 */
async function eachLine(file, fn) {
  const rl = createInterface({
    input: createReadStream(join(raw, file), 'utf8'),
    crlfDelay: Infinity,
  });
  for await (const line of rl) if (line) fn(line.split('\t'));
}

// 录音授权分三档：可自由使用 / 仅限非商用 / 不可在站外使用
const FREE = new Set(['CC BY 4.0', 'CC BY-SA 4.0', 'CC0 1.0']);
const NC = new Set(['CC BY-NC 4.0', 'CC BY-NC-ND 3.0']);

const audio = new Map(); // sentenceId -> { id, license, tier }
await eachLine('sentences_with_audio.csv', ([sid, aid, , license]) => {
  const lic = (license ?? '').trim();
  const tier = FREE.has(lic) ? 'free' : NC.has(lic) ? 'nc' : 'no';
  if (tier === 'no') return; // 空授权＝不可在 Tatoeba 之外使用
  if (!audio.has(sid)) audio.set(sid, { id: aid, license: lic, tier });
});

console.log(`有可用录音的句子：${audio.size}`);

const stats = {};
for (const lang of ['jpn', 'eng']) {
  const links = new Map(); // 本语言 id -> 中文 id
  await eachLine(
    lang === 'jpn' ? 'jpn-cmn_links.tsv' : 'eng-cmn_links.tsv',
    ([a, b]) => {
      if (!links.has(a)) links.set(a, b);
    },
  );

  let withAudio = 0;
  let free = 0;
  let nc = 0;
  let withZh = 0;
  let both = 0;
  let bothFree = 0;

  await eachLine(`${lang}_sentences.tsv`, ([id]) => {
    const a = audio.get(id);
    const z = links.has(id);
    if (a) {
      withAudio++;
      if (a.tier === 'free') free++;
      else nc++;
    }
    if (z) withZh++;
    if (a && z) {
      both++;
      if (a.tier === 'free') bothFree++;
    }
  });

  stats[lang] = { withAudio, free, nc, withZh, both, bothFree };
}

for (const [lang, s] of Object.entries(stats)) {
  console.log(
    `\n${lang}\n` +
      `  有录音            ${s.withAudio}\n` +
      `    其中自由授权     ${s.free}\n` +
      `    其中仅非商用     ${s.nc}\n` +
      `  有中文翻译        ${s.withZh}\n` +
      `  录音+中文都有     ${s.both}\n` +
      `    且录音自由授权   ${s.bothFree}`,
  );
}
