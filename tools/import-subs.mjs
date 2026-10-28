/**
 * 字幕导入工具
 *
 *   node tools/import-subs.mjs --subs <file.srt|file.vtt> --audio /media/xx.mp3 \
 *        --lang ja --id my-work --title "我的材料" [--level N3] [--scene daily] [--out src/data/my-work.ts]
 *
 * 读 SRT / VTT，按时间轴切成片段，输出一个可直接 import 的 .ts 文件。
 * 音频不复制、不改动：只在片段里写上 audio 路径和 clipStart / clipEnd，
 * 播放引擎会按时间轴切片播放。
 *
 * 字幕文件是外部数据：本脚本只读文本、不执行其中任何内容。
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';

// ---------- 参数 ----------

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      out[key] = true;
    } else {
      out[key] = next;
      i++;
    }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));

function need(name) {
  const v = args[name];
  if (!v || v === true) {
    console.error(`缺少参数 --${name}`);
    process.exit(1);
  }
  return String(v);
}

// ---------- 时间戳 ----------

/** "00:01:23,456" / "00:01:23.456" / "01:23.456" → 秒 */
function toSeconds(stamp) {
  const s = stamp.trim().replace(',', '.');
  const parts = s.split(':').map(Number);
  if (parts.some(Number.isNaN)) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] ?? null;
}

const CUE_RE =
  /(\d{1,2}:)?\d{1,2}:\d{2}[.,]\d{1,3}\s*-->\s*(\d{1,2}:)?\d{1,2}:\d{2}[.,]\d{1,3}/;

/** 去掉字幕里的标签与位置信息 */
function cleanLine(line) {
  return line
    .replace(/<[^>]+>/g, '')          // <i> <c.yellow> 之类
    .replace(/\{[^}]*\}/g, '')        // ASS 残留的 {\an8}
    .trim();
}

/**
 * 解析 SRT / VTT。
 * 两种格式的差别主要是头部和序号，按「含 --> 的行」切块就能一起处理。
 */
function parseCues(text) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const cues = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!CUE_RE.test(line)) {
      i++;
      continue;
    }

    const [rawStart, rawEnd] = line.split('-->');
    const start = toSeconds(rawStart);
    // 终点后面可能跟 align:start 之类的设置，取第一段
    const end = toSeconds(String(rawEnd).trim().split(/\s+/)[0]);
    i++;

    const body = [];
    while (i < lines.length && lines[i].trim() !== '' && !CUE_RE.test(lines[i])) {
      const c = cleanLine(lines[i]);
      if (c) body.push(c);
      i++;
    }

    if (start === null || end === null || body.length === 0) continue;
    cues.push({ start, end, text: body.join(' ') });
  }

  return cues;
}

/** 合并太短的片段：一句话被切成两行字幕时，听起来是断的 */
function mergeShort(cues, minSec) {
  const out = [];
  for (const cue of cues) {
    const prev = out[out.length - 1];
    const dur = cue.end - cue.start;
    const prevEndsOpen = prev && !/[。．.!?！？」』]$/.test(prev.text);
    if (prev && (dur < minSec || prevEndsOpen) && cue.start - prev.end < 1.2) {
      prev.end = cue.end;
      prev.text = `${prev.text} ${cue.text}`.replace(/\s+/g, ' ').trim();
    } else {
      out.push({ ...cue });
    }
  }
  return out;
}

// ---------- 输出 ----------

function tsString(s) {
  return JSON.stringify(s);
}

function emit({ id, lang, title, titleOrigin, summary, source, license, level, scene, audio, cues }) {
  const varName = id.replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase());
  const levels = [...new Set(cues.map((c) => c.level))];
  const scenes = [...new Set(cues.map((c) => c.scene))];

  const segments = cues
    .map((c, n) => {
      const sid = `${id}-${String(n + 1).padStart(2, '0')}`;
      return `    {
      id: ${tsString(sid)},
      text: ${tsString(c.text)},
      zh: ${tsString('')},            // TODO 补中文翻译
      level: ${tsString(c.level)},
      scene: ${tsString(c.scene)},
      audio: ${tsString(audio)},
      clipStart: ${c.start.toFixed(2)},
      clipEnd: ${c.end.toFixed(2)},
    },`;
    })
    .join('\n');

  return `import type { Work } from '../types';

/**
 * 由 tools/import-subs.mjs 从字幕文件生成。
 * 翻译（zh）与讲解（note / keywords）需要自己补：
 * 机器翻译不适合做精听讲解，宁可少写也别写错。
 *
 * 来源：${source}
 * 授权：${license}
 */
export const ${varName}: Work = {
  id: ${tsString(id)},
  lang: ${tsString(lang)},
  title: ${tsString(title)},
  titleOrigin: ${tsString(titleOrigin)},
  summary: ${tsString(summary)},
  scenes: ${JSON.stringify(scenes)},
  levels: ${JSON.stringify(levels)},
  source: ${tsString(source)},
  license: ${tsString(license)},
  segments: [
${segments}
  ],
};
`;
}

/**
 * Git Bash 会把 /media/x.mp3 这种参数改写成
 * C:/Program Files/Git/media/x.mp3，写进 audio 字段就全错了。
 * 这里把它还原成站内路径，并统一成 / 开头。
 */
function normalizeAudio(input) {
  let v = String(input).replace(/\\/g, '/');

  // 还原 Git Bash 的 MSYS 路径改写
  const mangled = v.match(/^[A-Za-z]:\/.*?\/Git(\/.+)$/);
  if (mangled) {
    console.warn(
      `注意：--audio 被 Git Bash 改写成了 ${v}\n` +
        `      已还原为 ${mangled[1]}。下次可写成 //media/x.mp3 或加 MSYS_NO_PATHCONV=1 避免。`,
    );
    v = mangled[1];
  }

  // Git Bash 对 //media/x.mp3 会留下多余的前导斜杠
  v = v.replace(/^\/{2,}/, '/');

  if (!v.startsWith('/')) v = `/${v}`;
  return v;
}

// ---------- 主流程 ----------

const subsPath = need('subs');
const audio = normalizeAudio(need('audio'));
const lang = need('lang');
const id = need('id');
const title = need('title');

if (lang !== 'ja' && lang !== 'en') {
  console.error('--lang 只能是 ja 或 en');
  process.exit(1);
}

const level = String(args.level ?? (lang === 'ja' ? 'N3' : 'B1'));
const scene = String(args.scene ?? 'daily');
const minSec = Number(args.min ?? 1.4);
const out = String(args.out ?? `src/data/${id}.ts`);

const raw = readFileSync(subsPath, 'utf8');
const parsed = parseCues(raw);

if (parsed.length === 0) {
  console.error('没解析出字幕。确认文件是 SRT 或 VTT，且含有 --> 时间轴。');
  process.exit(1);
}

const merged = mergeShort(parsed, minSec).map((c) => ({ ...c, level, scene }));

const code = emit({
  id,
  lang,
  title,
  titleOrigin: String(args.titleOrigin ?? ''),
  summary: String(args.summary ?? ''),
  source: String(args.source ?? basename(subsPath)),
  license: String(args.license ?? '请自行确认授权范围'),
  level,
  scene,
  audio,
  cues: merged,
});

writeFileSync(out, code, 'utf8');

const total = merged.reduce((n, c) => n + (c.end - c.start), 0);
console.log(`解析 ${parsed.length} 条字幕 → 合并为 ${merged.length} 个片段`);
console.log(`音频总时长约 ${Math.round(total)} 秒`);
console.log(`已写入 ${out}`);
console.log('');
console.log('接下来：');
console.log(`  1. 补每个片段的 zh 翻译（必填，不然讲解步骤是空的）`);
console.log(`  2. 想讲解的句子加 note 和 keywords`);
console.log(`  3. 在 src/data/index.ts 里 import 并加进 works 数组`);
console.log(`  4. 音频放到 public${audio.startsWith('/') ? audio : `/${audio}`}`);
