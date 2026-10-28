/**
 * 从 Tatoeba 导出生成练习句集。生成的文件内容从不可信数据派生，
 * 不执行也不 import，但 validate-data.mjs 运行在同一进程里所以读一样多。
 *
 *   node tools/import-tatoeba.mjs <rawDir> [--lang ja|en] [--max N]
 *
 * --lang ja 只导日语   --lang en 只导英语   不带参数导两种
 * --max N 每种语言最多 N 句（往少了试时用）
 */

import { readFileSync, writeFileSync, createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { join } from 'node:path';

const args = process.argv.slice(2);
const rawDir = args[0];
const langFlag = args.find((a) => a.startsWith('--lang='))?.split('=')[1];
const maxFlag = args.find((a) => a.startsWith('--max='))?.split('=')[1];
const maxPer = maxFlag ? parseInt(maxFlag, 10) : Infinity;

if (!rawDir) {
  console.error('用法：node tools/import-tatoeba.mjs <rawDir> [--lang=ja|en] [--max=N]');
  process.exit(1);
}

async function eachLine(file, fn) {
  const rl = createInterface({
    input: createReadStream(join(rawDir, file), 'utf8'),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    if (line.trim()) {
      const parts = line.split('\t');
      const stop = fn(parts);
      if (stop) break;
    }
  }
}

// 1) 录音授权：只要自由授权的（不导入非商用的，省得以后想开放材料时还得筛）
const FREE = new Set(['CC BY 4.0', 'CC BY-SA 4.0', 'CC0 1.0']);
const audio = new Map();
await eachLine('sentences_with_audio.csv', ([sid, aid, , lic]) => {
  const license = (lic ?? '').trim();
  if (FREE.has(license) && !audio.has(sid)) {
    audio.set(sid, { audioId: aid, license });
  }
});
console.log(`自由授权录音的句子：${audio.size}`);

// 2) 日语振假名
const kana = new Map();
await eachLine('jpn_transcriptions.tsv', ([sid, , , , hrkt]) => {
  // 249k 条，不缺
  if (hrkt && !kana.has(sid)) kana.set(sid, hrkt);
});
console.log(`有振假名标注的句子：${kana.size}`);

// 3) 导入逻辑
async function imp(lang) {
  const code = lang === 'ja' ? 'jpn' : 'eng';
  const linkFile = code === 'jpn' ? 'jpn-cmn_links.tsv' : 'eng-cmn_links.tsv';

  // 中文翻译 map
  const cmn = new Map();
  await eachLine('cmn_sentences.tsv', ([id, , text]) => {
    if (text && !cmn.has(id)) cmn.set(id, text.trim());
  });

  // 句子 → 中文 id
  const links = new Map();
  await eachLine(linkFile, ([a, b]) => {
    if (!links.has(a)) links.set(a, b);
  });

  // 收集符合条件的句子
  const pairs = [];
  await eachLine(`${code}_sentences.tsv`, ([id, , text]) => {
    if (pairs.length >= maxPer) return true; // 提前停
    const zid = links.get(id);
    const zh = zid ? cmn.get(zid) : null;
    if (!zh || !text) return;

    // 日语必须有振假名（否则初学者无法自学），英语无此要求
    const reading = code === 'jpn' ? kana.get(id) : null;
    if (code === 'jpn' && !reading) return;

    // 有录音更好，没有用浏览器 TTS（我们的播放器会 fallback）
    const aud = audio.get(id);

    pairs.push({ id, text: text.trim(), zh, reading, audio: aud });
  });

  // 生成 TS 文件
  const now = new Date().toISOString().split('T')[0];
  const out = [
    `/**`,
    ` * Tatoeba ${code} sentences with CC BY 2.0 FR text and free-licensed audio.`,
    ` * Generated ${now} from Tatoeba exports.`,
    ` * https://tatoeba.org/eng/terms_of_use`,
    ` */`,
    `import type { Work } from '../types';`,
    ``,
    `export const tatoeba_${code}: Work = {`,
    `  id: 'tatoeba-${code}',`,
    `  lang: '${lang}',`,
    `  title: 'Tatoeba ${lang === 'ja' ? '日' : 'En'}',`,
    `  desc: 'Community sentences · CC BY 2.0 FR',`,
    `  levels: ['A1', 'A2', 'B1', 'B2'],`,
    `  scenes: ['daily'],`,
    `  segments: [`,
  ];

  for (let i = 0; i < pairs.length; i++) {
    const p = pairs[i];
    const comma = i < pairs.length - 1 ? ',' : '';
    out.push(`    {`);
    out.push(`      id: '${code}-${p.id}',`);
    out.push(`      level: 'A2',`);
    out.push(`      scene: 'daily',`);
    out.push(`      audio: ${p.audio ? `'tatoeba/${p.audio.audioId}.mp3'` : 'undefined'},`);
    out.push(`      text: ${JSON.stringify(p.text)},`);
    if (p.reading) out.push(`      reading: ${JSON.stringify(p.reading)},`);
    out.push(`      zh: ${JSON.stringify(p.zh)},`);
    out.push(`      keywords: [],`);
    out.push(`    }${comma}`);
  }

  out.push(`  ],`);
  out.push(`};`);
  out.push(``);

  const outPath = join(process.cwd(), 'src', 'data', `tatoeba-${code}.ts`);
  writeFileSync(outPath, out.join('\n'), 'utf8');
  console.log(`${lang}: ${pairs.length} → ${outPath}`);
}

if (!langFlag || langFlag === 'ja') await imp('ja');
if (!langFlag || langFlag === 'en') await imp('en');

console.log('完成。现在运行 node tools/validate-data.mjs 校对');
