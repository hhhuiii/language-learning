#!/usr/bin/env node
/**
 * 从 VOA Learning English 抓文章和音频，做成逐字稿跟读材料。
 *
 *   node tools/import-voa.mjs [--limit N] [--feeds a,b,c] [--no-audio]
 *
 * 为什么可以抓 VOA：
 *   VOA 是美国政府作品，属公有领域，官网明确写了文本、MP3、图片、视频
 *   都可以转载和商用，署名 learningenglish.voanews.com 即可。
 *   这和前面 anonjp / dailydictation 的情况完全不同。
 *
 * 一个重要限制：
 *   VOA 只给音频和纯文稿，不提供字幕时间轴（查过 .vtt / <track> 都没有）。
 *   所以逐字稿的时间点只能按字数比例估算，标成 timing: 'estimated'，
 *   界面上如实说明。导入自己的 SRT / VTT 才是精确对齐。
 */

import { writeFileSync, mkdirSync, existsSync, statSync, createWriteStream } from 'node:fs';
import { join } from 'node:path';
import { get } from 'node:https';
import { spawnSync } from 'node:child_process';

/**
 * Node 的 fetch 默认无视 HTTP_PROXY / HTTPS_PROXY，要 NODE_USE_ENV_PROXY=1
 * 才认。而这个变量必须在进程启动时就存在（undici 启动时读一次），
 * 进程里再 set 已经来不及。所以检测到有代理但没开这个开关时，
 * 带上开关把自己重跑一遍 —— 省得每次手动写环境变量。
 */
if (
  !process.env.NODE_USE_ENV_PROXY &&
  (process.env.HTTPS_PROXY || process.env.HTTP_PROXY ||
   process.env.https_proxy || process.env.http_proxy)
) {
  const r = spawnSync(process.execPath, process.argv.slice(1), {
    stdio: 'inherit',
    env: { ...process.env, NODE_USE_ENV_PROXY: '1' },
  });
  process.exit(r.status ?? 1);
}

// ---------- 参数 ----------

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
}

const LIMIT = Number(arg('limit', 6)) || 6;
const NO_AUDIO = Boolean(arg('no-audio', false));
const OUT_DATA = 'src/data';
const OUT_AUDIO = 'public/media/articles';

/**
 * VOA 的栏目 feed。选这几个是因为它们是成篇的叙事或讲解，
 * 适合连续跟读；新闻短讯太碎，不适合。
 * 栏目本身就分难度：American Stories 偏初级，Science 偏中高级。
 */
const FEEDS = {
  'american-stories': {
    path: '/api/zyg__l-vomx-tpetmty',
    title: '美国故事',
    level: 'B1',
    note: '改写过的经典短篇，语速慢、句子完整，适合第一次做逐字稿跟读。',
  },
  'as-it-is': {
    path: '/api/zkm-ql-vomx-tpej-rqi',
    title: '时事纵横',
    level: 'B2',
    note: '时事报道，信息密度比故事高，专有名词多。',
  },
  'everyday-grammar': {
    path: '/api/zoroqql-vomx-tpeptpqq',
    title: '每日语法',
    level: 'B1',
    note: '语法讲解，句型重复出现，适合练结构。',
  },
  'ask-a-teacher': {
    path: '/api/zti_qvl-vomx-tpekgvqr',
    title: '问老师',
    level: 'B1',
    note: '答疑式短文，口语化，有问有答。',
  },
};

const HOST = 'learningenglish.voanews.com';

// ---------- 网络 ----------

/** VOA 的证书链在部分 Windows 环境下校验不过，这里只放宽 CRL 检查 */
function fetchText(url) {
  return new Promise((resolve, reject) => {
    get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return fetchText(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} ${url}`));
      }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve(body));
    }).on('error', reject);
  });
}

function download(url, path) {
  return new Promise((resolve, reject) => {
    get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return download(res.headers.location, path).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const f = createWriteStream(path);
      res.pipe(f);
      f.on('finish', () => f.close(() => resolve()));
      f.on('error', reject);
    }).on('error', reject);
  });
}

// ---------- 解析 ----------

function decodeEntities(s) {
  return s
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&amp;/g, '&');
}

function stripTags(s) {
  return decodeEntities(s.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
}

/** RSS → [{ title, link }] */
function parseFeed(xml) {
  const out = [];
  const items = xml.split('<item>').slice(1);
  for (const raw of items) {
    const chunk = raw.split('</item>')[0];
    const title = chunk.match(/<title>([\s\S]*?)<\/title>/)?.[1];
    const link = chunk.match(/<link>([\s\S]*?)<\/link>/)?.[1];
    if (title && link) {
      out.push({ title: stripTags(title), link: link.trim() });
    }
  }
  return out;
}

/** 文章页 → { audio, paragraphs } */
function parseArticle(html) {
  // 音频在播放器的 <audio src>
  const audio = html.match(/<audio[^>]+src="([^"]+\.mp3)"/)?.[1] ?? null;

  // 正文在 div.wsw 里，但开头还嵌着播放器，所以只取 <p> 标签
  const wsw = html.indexOf('<div class="wsw">');
  if (wsw === -1) return { audio, paragraphs: [] };

  let body = html.slice(wsw, wsw + 200000);

  // 文末的「Words in This Story」生词表是 <h2>，不是 <p>，
  // 所以不能靠扫段落文字来停 —— 必须先把这一段之后的 HTML 切掉。
  // 不切的话生词表的释义会被当成正文，再被切成 "teeth" "oars" 这种碎片。
  // 标题文字可能还套着 <small><big> 之类的内联标签（两篇文章写法就不一样），
  // 所以允许标题开始标签和文字之间夹任意标签。
  const glossary = body.search(/<h\d[^>]*>(?:\s|<[^>]+>)*Words in This Story/i);
  if (glossary !== -1) body = body.slice(0, glossary);

  const paragraphs = [];
  for (const m of body.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)) {
    const text = stripTags(m[1]);
    // 过滤播放器残留、版权声明和太短的行
    if (text.length < 25) continue;
    // 播放器自己的提示文字，不是正文
    if (/^No media source|^Embed share|^The URL has been copied|^\d+:\d+\s*\/\s*\d+:\d+/i.test(text)) continue;
    if (/^(I'm|And I'm)\s+\w+\.$/i.test(text)) continue;   // 播音员署名
    if (/words in this story/i.test(text)) break;          // 生词表之后不要
    paragraphs.push(text);
  }
  return { audio, paragraphs };
}

/** 把一段文字切成适合跟读的短句：太长的句子跟不动 */
function splitSentences(text) {
  // 先按句末标点断，再把过长的按逗号补断。
  // 收尾引号要含中文／弯引号，否则 ...sinks.” 会把 ” 切成单独一行。
  //
  // 最后一个分支是「没有句末标点的收尾」，必须用 [^.!?]+ 而不是 \S+ ——
  // 用 \S+ 只会匹配到最后一个词，前面整句都被丢掉（"...we mean by this:"
  // 会只剩 "this:"）。那是静默丢数据，不只是切出碎片。
  const rough = text.match(/[^.!?]+[.!?]+["'’”）)\]]*|[^.!?]+$/g) ?? [text];
  const out = [];
  for (const s of rough) {
    const t = s.trim();
    if (!t) continue;
    // 只剩标点的碎片不要（切句边界没对齐时会出现）
    if (!/[A-Za-z0-9぀-ヿ一-鿿]/.test(t)) continue;
    if (t.split(/\s+/).length <= 28) {
      out.push(t);
      continue;
    }
    // 过长：在逗号处补断，但每段至少 6 个词，避免切出碎片
    let buf = [];
    for (const part of t.split(/,\s*/)) {
      buf.push(part);
      const joined = buf.join(', ');
      if (joined.split(/\s+/).length >= 12) {
        out.push(joined);
        buf = [];
      }
    }
    if (buf.length) out.push(buf.join(', '));
  }
  return mergeTooShort(out);
}

/**
 * 把过短的句子并进邻居。
 *
 * 像 “Yes!” 这种本身是完整句子，但单独成行跟读没有意义 ——
 * 一行只有一个词，播放不到一秒就跳走了。并进上一句，
 * 对话的来回才跟得起来。
 */
const MIN_WORDS = 4;

function mergeTooShort(lines) {
  const out = [];
  for (const line of lines) {
    const short = line.split(/\s+/).length < MIN_WORDS;
    if (short && out.length) {
      out[out.length - 1] += ' ' + line;
    } else {
      out.push(line);
    }
  }
  // 开头就是短句时上面并不动它，这里把它并进后一句
  if (out.length > 1 && out[0].split(/\s+/).length < MIN_WORDS) {
    out[1] = out[0] + ' ' + out[1];
    out.shift();
  }
  return out;
}

/**
 * 按字符数比例分配时间点。
 *
 * 这是估算，不是对齐：朗读速度不均匀，停顿也不按字数来。
 * 但对跟读够用 —— 用户可以点任意一行跳到那里，偏差几秒能自己修正。
 * 真要精确就得导入带时间轴的字幕文件。
 */
function estimateTimings(sentences, totalSec) {
  const weights = sentences.map((s) => Math.max(s.text.length, 10));
  const sum = weights.reduce((a, b) => a + b, 0);
  let t = 0;
  return sentences.map((s, i) => {
    const dur = (weights[i] / sum) * totalSec;
    const line = {
      id: `l${String(i + 1).padStart(3, '0')}`,
      text: s.text,
      // 段落号：阅读视图要按段分行，不能把整篇排成一条
      para: s.para,
      start: Number(t.toFixed(2)),
      end: Number((t + dur).toFixed(2)),
    };
    t += dur;
    return line;
  });
}

/** 按 64kbps 估算 MP3 时长；浏览器播放时会用真实时长覆盖 */
function estimateDuration(bytes) {
  return Math.round(bytes / (64000 / 8));
}

// ---------- 生成 ----------

function tsString(s) {
  return JSON.stringify(s);
}

function emit(articles, feedKey, meta) {
  const varName = `voa_${feedKey.replace(/-/g, '_')}`;
  const body = articles
    .map((a) => {
      const lines = a.lines
        .map(
          (l) =>
            `      { id: '${l.id}', para: ${l.para}, text: ${tsString(l.text)}, start: ${l.start}, end: ${l.end} },`,
        )
        .join('\n');
      return `  {
    id: ${tsString(a.id)},
    lang: 'en',
    title: ${tsString(a.title)},
    audio: ${tsString(a.audio)},
    duration: ${a.duration},
    timing: 'estimated',
    level: '${meta.level}',
    summary: ${tsString(meta.note)},
    source: ${tsString(a.source)},
    license: '公有领域（美国政府作品）',
    lines: [
${lines}
    ],
  },`;
    })
    .join('\n');

  const code = `import type { Article } from '../types';

/**
 * VOA Learning English · ${meta.title}
 *
 * 公有领域（美国政府作品），可自由转载与商用，署名 learningenglish.voanews.com。
 *
 * 时间轴是估算的：VOA 只提供音频和纯文稿，不提供字幕时间轴，
 * 所以这里按字符数比例分配时间点。朗读速度不均匀，偏差是必然的 ——
 * 界面上标了 timing: 'estimated'，并支持点任意一行跳转。
 * 需要精确对齐的话，导入带时间轴的 SRT / VTT 文件。
 */
export const ${varName}: Article[] = [
${body}
];
`;

  const path = join(OUT_DATA, `voa-${feedKey}.ts`);
  writeFileSync(path, code, 'utf8');
  return { varName, path };
}

// ---------- 主流程 ----------

const wanted = (() => {
  const v = arg('feeds', null);
  if (!v || v === true) return Object.keys(FEEDS);
  return String(v).split(',').map((s) => s.trim()).filter((k) => FEEDS[k]);
})();

mkdirSync(OUT_AUDIO, { recursive: true });

const exports_ = [];

for (const key of wanted) {
  const meta = FEEDS[key];
  console.log(`\n=== ${meta.title}（${key}）===`);

  let items;
  try {
    const xml = await fetchText(`https://${HOST}${meta.path}`);
    items = parseFeed(xml).slice(0, LIMIT);
  } catch (err) {
    console.error(`  feed 读取失败：${err.message}`);
    continue;
  }
  console.log(`  feed 里 ${items.length} 篇`);

  const articles = [];

  for (const it of items) {
    const slug = it.link.split('/').pop()?.replace(/\.html$/, '') ?? '';
    const id = `voa-${key}-${slug}`;

    let html;
    try {
      html = await fetchText(it.link);
    } catch (err) {
      console.log(`  ✗ ${it.title.slice(0, 40)} — 页面读取失败`);
      continue;
    }

    const { audio: audioUrl, paragraphs } = parseArticle(html);
    if (!audioUrl) {
      console.log(`  ✗ ${it.title.slice(0, 40)} — 没有音频，跳过`);
      continue;
    }
    if (paragraphs.length < 3) {
      console.log(`  ✗ ${it.title.slice(0, 40)} — 正文太短，跳过`);
      continue;
    }

    // 下载音频
    const localName = `${id}.mp3`;
    const localPath = join(OUT_AUDIO, localName);
    let bytes = 0;

    if (NO_AUDIO) {
      bytes = 0;
    } else if (existsSync(localPath) && statSync(localPath).size > 10000) {
      bytes = statSync(localPath).size;
    } else {
      try {
        await download(audioUrl, localPath);
        bytes = statSync(localPath).size;
      } catch (err) {
        console.log(`  ✗ ${it.title.slice(0, 40)} — 音频下载失败`);
        continue;
      }
    }

    // 保留段落归属：阅读界面要按原文的段落排版，
    // 拍平成一串句子的话段落边界就没了。
    const sentences = paragraphs.flatMap((text, pi) =>
      splitSentences(text).map((s) => ({ text: s, para: pi })),
    );
    const duration = bytes ? estimateDuration(bytes) : sentences.length * 5;
    const lines = estimateTimings(sentences, duration);

    articles.push({
      id,
      title: it.title,
      audio: `/media/articles/${localName}`,
      duration,
      lines,
      source: `VOA Learning English · ${it.link}`,
    });

    const mins = (duration / 60).toFixed(1);
    console.log(`  ✓ ${it.title.slice(0, 44)} — ${lines.length} 行 / ${mins} 分钟`);
  }

  if (articles.length === 0) {
    console.log('  这个栏目没抓到可用文章');
    continue;
  }

  const { varName, path } = emit(articles, key, meta);
  exports_.push(varName);
  console.log(`  → ${path}（${articles.length} 篇）`);
}

console.log('\n完成。在 src/data/articles.ts 里汇总这些变量：');
console.log(exports_.join(', '));
