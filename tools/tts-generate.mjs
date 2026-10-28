#!/usr/bin/env node
/**
 * 用 Edge 的神经语音把所有片段预生成成 MP3。
 *
 *   node tools/tts-generate.mjs [--lang ja|en] [--limit N] [--force]
 *
 * 为什么预生成而不是实时合成：
 *   浏览器 speechSynthesis 用的是系统自带语音，机器音重，而且各台机器装的
 *   语音包不一样，听感不可控。Edge 的神经语音免费、不需要 API key，而本站
 *   句子是固定的，生成一次就永久当静态文件用，质量和真人接近。
 *
 * 文件落在 public/media/tts/<lang>/<片段id>.mp3，路径由 id 推出来，
 * 所以不用改那 25 个数据文件。另外写一份 manifest 供前端判断哪些有音频。
 *
 * 可中断续跑：已存在的文件默认跳过，--force 才重新生成。
 */

import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  statSync,
} from 'node:fs';
import { join } from 'node:path';

// ---------- 参数 ----------

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
}

const ONLY_LANG = arg('lang', null);
const LIMIT = Number(arg('limit', 0)) || 0;
const FORCE = Boolean(arg('force', false));

/** 日语只有两个神经语音，Nanami 是 Windows 自带那个；英语挑了口齿最清楚的 */
const VOICE = {
  ja: 'ja-JP-NanamiNeural',
  en: 'en-US-EmmaNeural',
};

/** 学习材料要比正常语速稍慢一点，但别慢到失真 */
const RATE = '-8%';

const OUT_ROOT = 'public/media/tts';

// ---------- 读取片段 ----------

/**
 * 直接从 TS 数据文件里抓 id / text / lang。
 * 不走 import 是因为这些是 TS，node 跑不了；正则够用且不引入构建依赖。
 */
function collectSegments() {
  const dir = 'src/data';
  const out = [];

  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.ts') || file === 'index.ts') continue;
    const src = readFileSync(join(dir, file), 'utf8');

    const langM = src.match(/lang:\s*'(ja|en)'/);
    if (!langM) continue;
    const lang = langM[1];

    // 只扫 segments: 之后的部分。作品级的 id（如 ja-basics）在它之前，
    // 否则会和第一个片段的 text 配上对，多出一条假片段。
    const at = src.indexOf('segments:');
    if (at === -1) continue;
    const body = src.slice(at);

    const re = /id:\s*['"]([^'"]+)['"][\s\S]*?text:\s*(['"])((?:\\.|(?!\2).)*)\2/g;
    let m;
    while ((m = re.exec(body))) {
      const id = m[1];
      const text = m[3]
        .replace(/\\'/g, "'")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
      out.push({ id, text, lang, file });
    }
  }
  return out;
}

// ---------- 合成 ----------

/** 每个语言一条连接，连续合成，比每句新建连接快很多 */
async function synthesizeAll(lang, segments) {
  const voice = VOICE[lang];
  const dir = join(OUT_ROOT, lang);
  mkdirSync(dir, { recursive: true });

  const todo = segments.filter((s) => {
    if (FORCE) return true;
    const p = join(dir, `${s.id}.mp3`);
    // 空文件当成没生成（上次中断可能留下 0 字节）
    return !existsSync(p) || statSync(p).size < 512;
  });

  console.log(`${lang}: 共 ${segments.length} 句，待生成 ${todo.length} 句，语音 ${voice}`);
  if (todo.length === 0) return { ok: 0, fail: 0 };

  const list = LIMIT ? todo.slice(0, LIMIT) : todo;

  const tts = new MsEdgeTTS();
  await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

  let ok = 0;
  let fail = 0;
  const failures = [];

  for (let i = 0; i < list.length; i++) {
    const s = list[i];
    const path = join(dir, `${s.id}.mp3`);
    try {
      // 用 toStream 而不是 toFile：toFile 把参数当目录，固定写成 audio.mp3，
      // 没法按片段 id 命名。自己收流再写文件，文件名就可控。
      await new Promise((resolve, reject) => {
        const { audioStream } = tts.toStream(s.text, { rate: RATE });
        const chunks = [];
        audioStream.on('data', (c) => chunks.push(c));
        audioStream.on('end', () => {
          const buf = Buffer.concat(chunks);
          if (buf.length < 512) return reject(new Error(`音频过小 ${buf.length} 字节`));
          writeFileSync(path, buf);
          resolve();
        });
        audioStream.on('error', reject);
      });
      ok++;
    } catch (err) {
      fail++;
      failures.push({ id: s.id, msg: String(err?.message ?? err) });
    }

    if ((i + 1) % 50 === 0 || i === list.length - 1) {
      const pct = Math.round(((i + 1) / list.length) * 100);
      console.log(`  ${lang} ${i + 1}/${list.length} (${pct}%) 成功 ${ok} 失败 ${fail}`);
    }
  }

  tts.close?.();

  if (failures.length) {
    console.log(`  ${lang} 失败样例：`);
    for (const f of failures.slice(0, 5)) console.log(`    ${f.id}: ${f.msg}`);
  }

  return { ok, fail };
}

// ---------- manifest ----------

/** 列出实际生成成功的 id，前端据此决定用 MP3 还是回退语音合成 */
function writeManifest() {
  const manifest = {};
  for (const lang of ['ja', 'en']) {
    const dir = join(OUT_ROOT, lang);
    if (!existsSync(dir)) continue;
    manifest[lang] = readdirSync(dir)
      .filter((f) => f.endsWith('.mp3') && statSync(join(dir, f)).size >= 512)
      .map((f) => f.replace(/\.mp3$/, ''))
      .sort();
  }
  const path = join(OUT_ROOT, 'manifest.json');
  writeFileSync(path, JSON.stringify(manifest), 'utf8');
  const total = Object.values(manifest).reduce((n, a) => n + a.length, 0);
  console.log(`\nmanifest: ${path}（${total} 个音频）`);
  for (const [lang, ids] of Object.entries(manifest)) {
    console.log(`  ${lang}: ${ids.length}`);
  }
}

// ---------- 主流程 ----------

const all = collectSegments();
const byLang = { ja: [], en: [] };
for (const s of all) byLang[s.lang]?.push(s);

console.log(`扫到 ${all.length} 个片段：日语 ${byLang.ja.length}，英语 ${byLang.en.length}\n`);

const langs = ONLY_LANG ? [ONLY_LANG] : ['ja', 'en'];
for (const lang of langs) {
  if (!VOICE[lang]) {
    console.error(`未知语言 ${lang}`);
    continue;
  }
  const r = await synthesizeAll(lang, byLang[lang]);
  console.log(`${lang} 本轮完成：成功 ${r.ok}，失败 ${r.fail}\n`);
}

writeManifest();
console.log('\n没生成到的片段会自动回退到浏览器语音合成，不会播不出声。');
