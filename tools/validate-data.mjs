/**
 * 素材校对工具。
 *
 *   node tools/validate-data.mjs
 *
 * 检查那些「不会报错、但会让功能静默失效」的问题：
 *   - keyword.term 没有出现在 text 里   → 高亮不出来，页面上看不出有错
 *   - 片段 level 不在作品 levels 里      → 等级筛选会漏掉这一句
 *   - 片段 scene 不在作品 scenes 里      → 场景筛选会漏掉这一句
 *   - id 重复                            → 学习记录会互相覆盖
 *   - zh 为空                            → 讲解步骤是空白
 *   - 日语振假名含汉字                   → reading 没写完
 *   - 英语句子里混进日文假名（反之同理） → 复制粘贴串了
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'src/data';
const problems = [];
const warnings = [];

function problem(file, id, msg) {
  problems.push({ file, id, msg });
}
function warn(file, id, msg) {
  warnings.push({ file, id, msg });
}

/** 从 TS 源码里抓出字符串字段的值，容忍单双引号和转义 */
function field(block, name) {
  const re = new RegExp(`${name}:\\s*(['"])((?:\\\\.|(?!\\1).)*)\\1`);
  const m = block.match(re);
  if (!m) return null;
  return m[2].replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\');
}

/** 取数组字面量里的字符串，如 levels: ['N5', 'N4'] */
function arrayField(src, name) {
  const m = src.match(new RegExp(`${name}:\\s*\\[([^\\]]*)\\]`));
  if (!m) return [];
  return [...m[1].matchAll(/['"]([^'"]+)['"]/g)].map((x) => x[1]);
}

/** 按顶层大括号深度把 segments 切成一段一段 */
function splitSegments(src) {
  const start = src.indexOf('segments:');
  if (start === -1) return [];
  const out = [];
  let depth = 0;
  let buf = '';
  let inSeg = false;
  for (let i = src.indexOf('[', start); i < src.length; i++) {
    const ch = src[i];
    if (ch === '{') {
      depth++;
      if (depth === 1) {
        inSeg = true;
        buf = '';
        continue;
      }
    }
    if (ch === '}') {
      depth--;
      if (depth === 0 && inSeg) {
        out.push(buf);
        inSeg = false;
        continue;
      }
    }
    if (inSeg) buf += ch;
  }
  return out;
}

/** keywords 块里每个 { term: ..., zh: ... } */
function splitKeywords(segBlock) {
  const kwStart = segBlock.indexOf('keywords:');
  if (kwStart === -1) return [];
  const tail = segBlock.slice(kwStart);
  const out = [];
  let depth = 0;
  let buf = '';
  for (const ch of tail) {
    if (ch === '{') {
      depth++;
      if (depth === 1) {
        buf = '';
        continue;
      }
    }
    if (ch === '}') {
      depth--;
      if (depth === 0) {
        out.push(buf);
        continue;
      }
    }
    if (depth === 1) buf += ch;
  }
  return out;
}

const KANJI = /[一-鿿]/;
const KANA = /[぀-ヿ]/;
const LATIN_WORD = /[A-Za-z]{2,}/;

const seenIds = new Map();

/**
 * 只校对 Work（单句素材）文件。
 *
 * 这个工具查的是 Segment 上的字段。逐字稿文章（voa-*.ts）和汇总文件
 * （articles.ts）里没有 segments，结构完全不同 —— 以前把它们也扫进来，
 * 结果 articles.ts 永远报一条「lang 不是 ja/en」：它只是把各个文件拼起来，
 * 本身没有 lang 字段。那是工具的毛病，不是数据的毛病。
 * 文章由 check-articles.mjs 单独校对。
 */
const files = readdirSync(DIR).filter(
  (f) =>
    f.endsWith('.ts') &&
    f !== 'index.ts' &&
    readFileSync(join(DIR, f), 'utf8').includes('segments:'),
);

let segTotal = 0;
let kwTotal = 0;

for (const file of files) {
  const src = readFileSync(join(DIR, file), 'utf8');
  const lang = field(src, 'lang');
  const workLevels = arrayField(src, 'levels');
  const workScenes = arrayField(src, 'scenes');

  if (lang !== 'ja' && lang !== 'en') {
    problem(file, '-', `lang 不是 ja/en，读到的是 ${lang}`);
    continue;
  }

  for (const seg of splitSegments(src)) {
    const id = field(seg, 'id');
    const text = field(seg, 'text');
    const zh = field(seg, 'zh');
    const reading = field(seg, 'reading');
    const level = field(seg, 'level');
    const scene = field(seg, 'scene');

    if (!id) {
      problem(file, '?', '片段缺 id');
      continue;
    }
    segTotal++;

    if (seenIds.has(id)) {
      problem(file, id, `id 和 ${seenIds.get(id)} 重复`);
    } else {
      seenIds.set(id, file);
    }

    if (!text) problem(file, id, 'text 为空');
    if (!zh) problem(file, id, 'zh 为空（讲解步骤会是空白）');

    if (level && workLevels.length && !workLevels.includes(level)) {
      problem(file, id, `level ${level} 不在作品 levels [${workLevels}] 里，等级筛选会漏掉这句`);
    }
    if (scene && workScenes.length && !workScenes.includes(scene)) {
      problem(file, id, `scene ${scene} 不在作品 scenes [${workScenes}] 里，场景筛选会漏掉这句`);
    }

    // 语言串台检查
    if (lang === 'ja' && text && !KANA.test(text) && LATIN_WORD.test(text)) {
      problem(file, id, '日语作品里的句子看着是英文');
    }
    if (lang === 'en' && text && KANA.test(text)) {
      problem(file, id, '英语作品里的句子含日文假名');
    }

    // 日语振假名应当是纯假名或 Tatoeba [漢字|よみ] 格式
    if (lang === 'ja') {
      if (!reading) {
        warn(file, id, '没有 reading（振假名），初学者看不到读音');
      } else {
        // 剔除 Tatoeba 标记后检查剩余部分
        const stripped = reading.replace(/\[[^\]]+\]/g, '');
        if (KANJI.test(stripped)) {
          problem(file, id, `reading 里还有汉字：${reading}`);
        }
      }
    }

    // 关键词必须能在原文里找到，否则高亮静默失效。
    // term 是卡片上显示的词典形（figure out / 気にする），
    // match 是这句话里真正出现的那个形态（figuring out / 気にしない）。
    // 有 match 就校对 match，没有就校对 term。
    for (const kw of splitKeywords(seg)) {
      const term = field(kw, 'term');
      const match = field(kw, 'match');
      const kzh = field(kw, 'zh');
      if (!term) {
        problem(file, id, 'keyword 缺 term');
        continue;
      }
      kwTotal++;
      if (!kzh) problem(file, id, `keyword「${term}」没有中文释义`);

      const needle = match || term;
      // 英语大小写不敏感（句首会大写），日语原样比
      const hay = /[ぁ-んァ-ヶ一-龯]/.test(text) ? text : text.toLowerCase();
      const pin = /[ぁ-んァ-ヶ一-龯]/.test(text) ? needle : needle.toLowerCase();

      if (text && !hay.includes(pin)) {
        if (match) {
          problem(file, id, `keyword「${term}」的 match「${match}」在原文里找不到`);
        } else {
          problem(
            file,
            id,
            `keyword「${term}」在原文里找不到 —— 若是活用形／抽象句型，加 match 字段`,
          );
        }
      }
    }
  }
}

// ---------- 报告 ----------

console.log(`校对 ${files.length} 个数据文件，${segTotal} 个片段，${kwTotal} 个词条\n`);

if (problems.length) {
  console.log(`✗ 需要修的问题 ${problems.length} 处：`);
  for (const p of problems) console.log(`  [${p.file}] ${p.id}  ${p.msg}`);
  console.log('');
}
if (warnings.length) {
  console.log(`· 提示 ${warnings.length} 处（不影响功能）：`);
  for (const w of warnings.slice(0, 20)) console.log(`  [${w.file}] ${w.id}  ${w.msg}`);
  if (warnings.length > 20) console.log(`  ……还有 ${warnings.length - 20} 处`);
  console.log('');
}
if (!problems.length) console.log('✓ 没有发现会导致功能失效的错误');

process.exit(problems.length ? 1 : 0);
