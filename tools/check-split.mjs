/**
 * 检查句子切分：导入的每一篇文章都要过这一关，切错了后面全错。
 *
 * 直接 import src/store/imported.ts 测真货，不另写一份简化版 ——
 * 上次用「照抄一份正则」的方式测，测的是副本，真模块的问题一个没发现。
 *
 * 用项目自带的 esbuild 把 TS 打成一个临时 .mjs 再跑。
 */

import { build } from 'esbuild';
import { readFile, writeFile, rm } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const OUT = new URL('./.split-check.tmp.mjs', import.meta.url);

await build({
  entryPoints: ['src/store/imported.ts'],
  outfile: new URL(OUT).pathname.replace(/^\//, ''),
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  external: ['react'],
  logLevel: 'silent',
});

const mod = await import(pathToFileURL(new URL(OUT).pathname.replace(/^\//, '')).href);
const { splitSentences, splitParagraphs, buildFromText } = mod;

let bad = 0;
const fail = (label, got, why) => {
  bad++;
  console.log(`✗ ${label}\n    ${why}\n    得到: ${JSON.stringify(got)}`);
};
const ok = (label) => console.log(`✓ ${label}`);

/* ---------- 不能丢字 ---------- */

// 最要命的一类：切分后拼回去必须和原文一样（允许空白差异）
const lossCases = [
  ['en', 'Here is an example of what we mean by this:'],
  ['en', 'No terminator at all'],
  ['en', 'One. Two. Three.'],
  ['en', 'He said "hello." Then he left.'],
  ['en', 'Mr. Smith went to Washington and met Dr. Jones there.'],
  ['en', 'Wait... I am not done. Really!'],
  ['en', 'A short one. ' + 'word '.repeat(60) + 'end.'],
  ['ja', '「行くよ。」と彼は言った。'],
  ['ja', '今日はいい天気ですね。散歩に行きましょうか。'],
  ['ja', '昨日の夜、駅前の新しいラーメン屋に行ってみたんだけど、思ったより混んでいて、結局一時間も待つことになってしまった。'],
];

for (const [lang, text] of lossCases) {
  const parts = splitSentences(text, lang);
  const strip = (s) => s.replace(/\s+/g, '');
  const label = `${lang} 不丢字: ${text.slice(0, 32)}${text.length > 32 ? '…' : ''}`;
  if (strip(parts.join('')) !== strip(text)) {
    fail(label, parts, `拼回去和原文不一致（原文 ${strip(text).length} 字，切完 ${strip(parts.join('')).length} 字）`);
  } else if (parts.length === 0) {
    fail(label, parts, '一句都没切出来');
  } else {
    ok(label);
  }
}

/* ---------- 缩写不该被切开 ---------- */

const abbr = splitSentences('Mr. Smith went to Washington and met Dr. Jones there.', 'en');
if (abbr.length !== 1) {
  fail('en 缩写不切开 (Mr./Dr.)', abbr, `应该是 1 句，实际 ${abbr.length} 句`);
} else {
  ok('en 缩写不切开 (Mr./Dr.)');
}

/* ---------- 引号/括号跟着前一句 ---------- */

const quoted = splitSentences('He said "hello." Then he left.', 'en');
if (quoted.length !== 2 || !quoted[0].trim().endsWith('"')) {
  fail('en 引号跟着前一句', quoted, '句末引号应该留在第一句末尾');
} else {
  ok('en 引号跟着前一句');
}

const jaQuote = splitSentences('「行くよ。」と彼は言った。', 'ja');
if (jaQuote.length !== 1) {
  fail('ja 句中引号不切开', jaQuote, '「…。」在句中，不是句子边界，应为 1 句');
} else {
  ok('ja 句中引号不切开');
}

/* ---------- 省略号不该切成好几段 ---------- */

const dots = splitSentences('Wait... I am not done. Really!', 'en');
if (dots.some((s) => /^[.\s]+$/.test(s))) {
  fail('en 省略号不产生空句', dots, '出现了只有标点的碎片');
} else {
  ok('en 省略号不产生空句');
}

/* ---------- 段落 ---------- */

const paras = splitParagraphs('第一段第一句。第一段第二句。\n\n第二段。\n\n\n第三段。');
if (paras.length !== 3) {
  fail('空行分段', paras, `应该 3 段，实际 ${paras.length} 段`);
} else {
  ok('空行分段');
}

const soft = splitParagraphs('这一行\n接着这一行\n还有这一行');
if (soft.length !== 3) {
  fail('没有空行时按单换行分', soft, `应该 3 段，实际 ${soft.length} 段`);
} else {
  ok('没有空行时按单换行分');
}

/* ---------- 整条流水线 ---------- */

const real = `The sun was already high when we set out.

We walked along the river for a while. Nobody said anything. It was the kind of morning that does not need talking.

Later, when the heat came, we stopped under a tree and ate what we had brought: bread, two apples, and a thermos of tea that had gone lukewarm.`;

const art = buildFromText({ title: 'A Morning Walk', lang: 'en', level: 'B1', text: real });
const joined = art.lines.map((l) => l.text).join(' ').replace(/\s+/g, ' ');
const want = real.replace(/\s+/g, ' ').trim();

if (joined !== want) {
  fail('整条流水线不丢字', { joined, want }, '切完拼回去和原文不一致');
} else {
  ok('整条流水线不丢字');
}

const paraIdx = [...new Set(art.lines.map((l) => l.para))];
if (paraIdx.length !== 3) {
  fail('流水线保留段落号', paraIdx, `应该 3 段，实际 ${paraIdx.length}`);
} else {
  ok('流水线保留段落号');
}

// 时间点必须单调递增，否则二分查找当前句会乱
let mono = true;
for (let i = 1; i < art.lines.length; i++) {
  if (art.lines[i].start < art.lines[i - 1].start) mono = false;
}
if (!mono) fail('时间点单调递增', art.lines.map((l) => l.start), '出现了倒退');
else ok('时间点单调递增');

if (art.tts !== true || art.audio) {
  fail('导入的文章标记为 TTS', { tts: art.tts, audio: art.audio }, 'tts 应为 true 且没有音频地址');
} else {
  ok('导入的文章标记为 TTS');
}

/* ---------- 真实素材抽样 ---------- */

// 现成的 VOA 文章也过一遍，看有没有只剩标点或过短的碎片
try {
  const raw = await readFile('src/data/articles.ts', 'utf8');
  const texts = [...raw.matchAll(/text:\s*'((?:[^'\\]|\\.)*)'/g)].map((m) =>
    m[1].replace(/\\'/g, "'"),
  );
  const junk = texts.filter((t) => t.trim().length < 3 || /^[\p{P}\s]+$/u.test(t));
  if (junk.length) fail('现有素材无碎片行', junk.slice(0, 5), `${junk.length} 行过短或只有标点`);
  else ok(`现有素材无碎片行（抽查 ${texts.length} 行）`);
} catch {
  console.log('· 跳过现有素材抽查（读不到 articles.ts）');
}

await rm(new URL(OUT), { force: true });

console.log(bad === 0 ? '\n全部通过' : `\n${bad} 项不通过`);
process.exit(bad === 0 ? 0 : 1);
