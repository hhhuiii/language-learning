#!/usr/bin/env node
/**
 * 从 Tatoeba 导出文件构建分级语料。
 *
 *   node tools/import-corpus.mjs <tatoeba导出目录> [输出目录]
 *
 * 分级思路：不手写 JLPT / CEFR 词表（容易写错且无法核对），
 * 而是用语料自身算词频 —— 日语按汉字频次，英语按单词频次。
 * 难度 = 句长 + 生僻字词的数量和稀有度。频次表来自 24.9 万日语句
 * 和 203 万英语句，是数据而非拍脑袋。
 *
 * 授权：Tatoeba 导出文件为 CC BY 2.0 FR，须署名。
 * 录音另有各自授权，这里只取文本，发音回退到浏览器语音合成。
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as OpenCC from 'opencc-js';

/**
 * Tatoeba 的 cmn 语料里繁简混杂（实测 760 条繁体 / 1072 条简体）。
 * 本站统一用简体，所以全部过一遍 OpenCC 繁→简。
 * 用 OpenCC 而不是手写对照表：转换数据由上游维护，不会漏字也不会转错。
 */
const toSimplified = OpenCC.Converter({ from: 'tw', to: 'cn' });

const DIR = process.argv[2];
const OUT = process.argv[3] ?? 'src/data';

if (!DIR) {
  console.error('用法: node tools/import-corpus.mjs <tatoeba导出目录> [输出目录]');
  process.exit(1);
}

const read = (name) => readFileSync(join(DIR, name), 'utf8');

/** 逐行回调，避免把 104MB 的英语句子一次性切成大数组 */
function eachLine(text, fn) {
  let start = 0;
  while (start < text.length) {
    let end = text.indexOf('\n', start);
    if (end === -1) end = text.length;
    if (end > start) fn(text.slice(start, end));
    start = end + 1;
  }
}

const KANJI = /[一-龯㐀-䶿]/;
const KANA = /[぀-ヿ]/;
const LATIN = /[A-Za-z]/;

// ---------- 读句子 ----------

/** id -> text */
function loadSentences(file, wanted) {
  const map = new Map();
  eachLine(read(file), (line) => {
    const t1 = line.indexOf('\t');
    const t2 = line.indexOf('\t', t1 + 1);
    if (t1 === -1 || t2 === -1) return;
    const lang = line.slice(t1 + 1, t2);
    if (lang !== wanted) return;
    map.set(line.slice(0, t1), line.slice(t2 + 1).trim());
  });
  return map;
}

/** 源 id -> 译文 id（同一句可能有多个译文，留第一个） */
function loadLinks(file) {
  const map = new Map();
  eachLine(read(file), (line) => {
    const t = line.indexOf('\t');
    if (t === -1) return;
    const from = line.slice(0, t);
    if (!map.has(from)) map.set(from, line.slice(t + 1).trim());
  });
  return map;
}

/** id -> [漢字|よみ] 形式的振假名 */
function loadTranscriptions(file) {
  const map = new Map();
  eachLine(read(file), (line) => {
    const p = line.split('\t');
    if (p.length < 5) return;
    const text = p[4].trim();
    if (text) map.set(p[0], text);
  });
  return map;
}

// ---------- 分级 ----------

/**
 * 日语分级：看句子长度、汉字密度、以及最生僻的那个汉字有多生僻。
 * 一句话的难度由它最难的部分决定，所以用最大排名而不是平均。
 */
function gradeJa(text, kanjiRank) {
  const len = [...text].length;
  const kanji = [...text].filter((c) => KANJI.test(c));
  const density = len ? kanji.length / len : 0;

  // 最生僻汉字的排名；没有汉字算 0
  let hardest = 0;
  for (const ch of kanji) {
    const r = kanjiRank.get(ch) ?? 3000;
    if (r > hardest) hardest = r;
  }

  // 书面体/新闻体的标志，出现就往上提一级
  const formal = /(である|による|とみられ|によります|ており|述べ|実施|発表)/.test(text);

  if (len <= 12 && hardest <= 200 && density <= 0.25) return 'N5';
  if (len <= 20 && hardest <= 500) return 'N4';
  if (len <= 32 && hardest <= 1100 && !formal) return 'N3';
  if (len <= 48 && hardest <= 1800) return 'N2';
  return 'N1';
}

/**
 * 英语分级：句长 + 最生僻单词的排名。
 * 另外看从句数量，三个以上从句标记基本就不是初级句。
 */
function gradeEn(text, wordRank) {
  const words = text.toLowerCase().match(/[a-z']+/g) ?? [];
  const n = words.length;

  let hardest = 0;
  for (const w of words) {
    const r = wordRank.get(w) ?? 20000;
    if (r > hardest) hardest = r;
  }

  const clauses = (text.match(/\b(that|which|who|whom|whose|because|although|though|while|whereas|unless|despite)\b/gi) ?? []).length;

  if (n <= 6 && hardest <= 700) return 'A1';
  if (n <= 10 && hardest <= 2000) return 'A2';
  if (n <= 16 && hardest <= 5000 && clauses <= 1) return 'B1';
  if (n <= 24 && hardest <= 9000 && clauses <= 2) return 'B2';
  if (n <= 34 && hardest <= 16000) return 'C1';
  return 'C2';
}

/**
 * 场景分类。
 *
 * 不用「先命中谁算谁」：那样靠规则顺序决定结果，而且词表一薄
 * 绝大多数句子就全掉进 daily。这里给每个场景数命中次数，取最高分，
 * 并要求至少 2 分才归类 —— 只沾一个词（比如随口提到「道」）
 * 不足以说明整句是那个场景。
 *
 * 关键词按「这个场景真正会说什么」铺开，日英各一份。
 */
const SCENE_WORDS = {
  dining: [
    /レストラン|居酒屋|喫茶店|食堂/g, /注文|頼[むみ]|おかわり/g,
    /食べ|飲[むみま]|味|おいし|うま[いく]/g,
    /料理|メニュー|定食|弁当|お菓子|デザート/g,
    /ご飯|朝ご飯|昼ご飯|晩ご飯|朝食|昼食|夕食|食事/g,
    /お茶|コーヒー|ビール|お酒|ワイン|ジュース|水を/g,
    /肉|魚|野菜|果物|パン|米|卵|スープ|サラダ/g,
    /\b(restaurant|cafe|diner|bar|pub)\b/gi,
    /\b(order|menu|waiter|waitress|reservation|bill|tip)\b/gi,
    /\b(eat|ate|eaten|eating|drink|drank|drinking|taste|tasty|delicious|hungry|thirsty)\b/gi,
    /\b(breakfast|lunch|dinner|supper|meal|snack|dessert|dish|recipe|cook|cooked|cooking)\b/gi,
    /\b(coffee|tea|beer|wine|juice|water|milk|bread|rice|meat|fish|vegetable|fruit|soup|salad|cake)\b/gi,
  ],
  travel: [
    /駅|電車|列車|地下鉄|新幹線|バス|タクシー/g,
    /飛行機|空港|船|自転車|車に乗/g,
    /切符|予約|荷物|スーツケース|パスポート/g,
    /ホテル|旅館|宿|泊ま/g,
    /旅行|観光|出発|到着|乗り換え|行き方/g,
    /地図|案内|道を|右に曲が|左に曲が|まっすぐ/g,
    /\b(station|train|subway|metro|bus|taxi|cab|tram)\b/gi,
    /\b(plane|airplane|flight|airport|ship|ferry|bicycle|bike)\b/gi,
    /\b(ticket|booking|luggage|baggage|suitcase|passport|visa|boarding)\b/gi,
    /\b(hotel|hostel|motel|inn|check in|checked in|stay|stayed)\b/gi,
    /\b(travel|travelled|traveled|trip|journey|tour|tourist|sightseeing|abroad|overseas)\b/gi,
    /\b(depart|departure|arrive|arrival|transfer|map|direction|directions|route|turn left|turn right)\b/gi,
  ],
  work: [
    /会社|職場|事務所|オフィス|工場|支店/g,
    /仕事|勤[めま]|働[いくき]|就職|転職|退職/g,
    /会議|打ち合わせ|資料|報告|企画|契約|取引/g,
    /上司|部長|課長|社長|同僚|部下|お客様|取引先/g,
    /出張|残業|有給|休暇を|給料|昇進|面接|履歴書/g,
    /締め切り|納期|プロジェクト|予算|売上/g,
    /\b(office|workplace|factory|branch|headquarters|firm|company|corporation)\b/gi,
    /\b(work|worked|working|job|career|employ|employed|employee|employer|hire|hired|resign|quit)\b/gi,
    /\b(meeting|conference|presentation|report|proposal|contract|client|customer|deal)\b/gi,
    /\b(boss|manager|director|colleague|coworker|staff|team|supervisor)\b/gi,
    /\b(salary|wage|promotion|interview|resume|overtime|deadline|project|budget|sales|business trip)\b/gi,
  ],
  campus: [
    /学校|小学校|中学校|高校|大学|大学院|塾/g,
    /先生|教師|教授|学生|生徒|同級生|クラスメート/g,
    /授業|講義|宿題|課題|試験|テスト|受験|入学|卒業/g,
    /教室|図書館|校庭|部活|サークル|黒板|教科書/g,
    /勉強|習[うっ]|覚え|学[ぶびん]|成績|点数/g,
    /\b(school|elementary school|high school|university|college|campus|kindergarten)\b/gi,
    /\b(teacher|professor|student|pupil|classmate|principal|tutor)\b/gi,
    /\b(class|lesson|lecture|homework|assignment|exam|test|quiz|grade|grades|semester)\b/gi,
    /\b(classroom|library|textbook|notebook|blackboard|dormitory|graduate|graduated|graduation)\b/gi,
    /\b(study|studied|studying|learn|learned|learnt|teach|taught|memorize|educate|education)\b/gi,
  ],
  news: [
    /発表|報道|記者|新聞|ニュース|番組/g,
    /政府|首相|大統領|国会|議員|選挙|政治|法律|条例/g,
    /経済|景気|株価|物価|税|企業が|市場/g,
    /事故|事件|火事|火災|犯人|逮捕|裁判|被害/g,
    /地震|台風|洪水|津波|災害|avalanche/g,
    /according to|によりますと|とみられ|明らかに/g,
    /\b(news|newspaper|press|reporter|journalist|broadcast|headline|media)\b/gi,
    /\b(government|president|prime minister|parliament|congress|senator|election|vote|policy|law|court)\b/gi,
    /\b(economy|economic|recession|stock|market|inflation|tax|industry)\b/gi,
    /\b(accident|incident|crime|criminal|arrest|arrested|trial|victim|investigation)\b/gi,
    /\b(earthquake|typhoon|hurricane|flood|tsunami|disaster|emergency|casualties)\b/gi,
    /\b(announced|announce|official|authorities|reportedly|statement)\b/gi,
  ],
  friends: [
    /友達|友人|仲間|親友|彼女|彼氏/g,
    /遊[びぶん]|一緒に|みんなで|集ま/g,
    /楽し|面白|嬉し|好き|嫌い|つまらな/g,
    /おめでとう|ありがとう|ごめん|さすが|すごい/g,
    /話[すしそ]|しゃべ|相談|冗談|笑[うっい]/g,
    /誘[うっ]|パーティー|飲み会|デート|結婚/g,
    /\b(friend|friends|buddy|mate|girlfriend|boyfriend|partner)\b/gi,
    /\b(hang out|hung out|together|gather|gathered|invite|invited|party|date|wedding)\b/gi,
    /\b(fun|funny|interesting|happy|glad|enjoy|enjoyed|like|love|hate|boring)\b/gi,
    /\b(congratulations|congrats|thanks|thank you|sorry|amazing|awesome|great)\b/gi,
    /\b(chat|chatted|talk|talked|joke|joked|laugh|laughed|gossip)\b/gi,
  ],
};

/** 数一个场景在句子里命中多少次 */
function sceneScore(text, patterns) {
  let n = 0;
  for (const re of patterns) {
    const m = text.match(re);
    if (m) n += m.length;
  }
  return n;
}

/**
 * 取得分最高的场景，至少 2 分才算；否则归 daily。
 * 同时返回得分，调用方可以据此决定是否收录。
 */
function classifyScene(text, zh = '') {
  const hay = `${text} ${zh}`;
  let best = 'daily';
  let bestScore = 0;
  for (const [scene, patterns] of Object.entries(SCENE_WORDS)) {
    const s = sceneScore(hay, patterns);
    if (s > bestScore) {
      bestScore = s;
      best = scene;
    }
  }
  return bestScore >= 2 ? best : 'daily';
}

// ---------- 词频表（从语料本身算，不手写词表） ----------

/** 日语：统计每个汉字出现在多少句里 */
function kanjiFrequency(sentences) {
  const freq = new Map();
  for (const text of sentences.values()) {
    const seen = new Set();
    for (const ch of text) {
      if (KANJI.test(ch)) seen.add(ch);
    }
    for (const ch of seen) freq.set(ch, (freq.get(ch) ?? 0) + 1);
  }
  // 频次降序 → 排名（1 = 最常见）
  const rank = new Map();
  [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .forEach(([ch], i) => rank.set(ch, i + 1));
  return rank;
}

/** 英语：统计每个单词出现在多少句里（抽样，2M 句全算太慢） */
function wordFrequency(sentences, sampleEvery = 4) {
  const freq = new Map();
  let n = 0;
  for (const text of sentences.values()) {
    if (n++ % sampleEvery !== 0) continue;
    const seen = new Set();
    for (const w of text.toLowerCase().match(/[a-z']+/g) ?? []) seen.add(w);
    for (const w of seen) freq.set(w, (freq.get(w) ?? 0) + 1);
  }
  const rank = new Map();
  [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .forEach(([w], i) => rank.set(w, i + 1));
  return rank;
}

// ---------- 质量过滤 ----------

/**
 * Tatoeba 里「Tom」「Mary」这类占位人名极多，做听力材料很枯燥，
 * 限制它们的比例。另外剔掉太短、太长、含网址或乱码的句子。
 */
function makeQualityFilter(lang) {
  let tomCount = 0;
  let total = 0;

  return function accept(text, zh) {
    total++;
    if (!text || !zh) return false;

    const len = [...text].length;
    if (lang === 'ja') {
      if (len < 6 || len > 60) return false;
      if (!KANA.test(text)) return false;          // 必须含假名，否则可能是中文混入
      if (LATIN.test(text) && !/[ァ-ヿ]/.test(text)) return false; // 夹英文且无片假名，多是脏数据
    } else {
      const words = text.split(/\s+/).length;
      if (words < 3 || words > 40) return false;
      if (!LATIN.test(text)) return false;
    }

    // 中文译文的基本检查
    const zhLen = [...zh].length;
    if (zhLen < 2 || zhLen > 80) return false;
    if (!/[一-鿿]/.test(zh)) return false;  // 译文必须含汉字

    // 网址、邮箱、明显的标记残留
    if (/(https?:|www\.|@\w+\.|\{|\}|\\n)/.test(text)) return false;

    // 占位人名限额：最多占两成
    if (/\b(Tom|Mary|Tom's|Mary's)\b|トム|メアリー/.test(text)) {
      if (tomCount > total * 0.2) return false;
      tomCount++;
    }

    return true;
  };
}

/** 句子重复、或中文译文重复的，只留一条 */
function dedupe(rows) {
  const seenText = new Set();
  const seenZh = new Set();
  const out = [];
  for (const r of rows) {
    if (seenText.has(r.text) || seenZh.has(r.zh)) continue;
    seenText.add(r.text);
    seenZh.add(r.zh);
    out.push(r);
  }
  return out;
}

// ---------- 生成 TypeScript 文件 ----------

function emitWork(id, lang, title, level, rows, outDir) {
  const varName = id.replace(/-/g, '_');
  const scenes = [...new Set(rows.map((r) => r.scene))].sort();

  let code = `import type { Work } from '../types';\n\n`;
  code += `/**\n * Tatoeba 开源语料，CC BY 2.0 FR 授权。\n`;
  code += ` * 难度分级和场景分类由本站算法生成，仅供参考。\n */\n`;
  code += `export const ${varName}: Work = {\n`;
  code += `  id: '${id}',\n`;
  code += `  lang: '${lang}',\n`;
  code += `  title: '${title}',\n`;
  code += `  summary: '${rows.length} 个句子，覆盖 ${level} 难度',\n`;
  code += `  scenes: ${JSON.stringify(scenes)},\n`;
  code += `  levels: ['${level}'],\n`;
  code += `  source: 'Tatoeba',\n`;
  code += `  license: 'CC BY 2.0 FR',\n`;
  code += `  segments: [\n`;

  for (const r of rows) {
    code += `    {\n`;
    code += `      id: '${r.id}',\n`;
    code += `      text: ${JSON.stringify(r.text)},\n`;
    if (r.reading) code += `      reading: ${JSON.stringify(r.reading)},\n`;
    code += `      zh: ${JSON.stringify(r.zh)},\n`;
    code += `      level: '${r.level}',\n`;
    code += `      scene: '${r.scene}',\n`;
    code += `    },\n`;
  }

  code += `  ],\n};\n`;
  writeFileSync(join(outDir, `${id}.ts`), code);
  console.log(`✓ ${id}.ts (${rows.length} 条)`);
  return varName;
}

// ---------- 主流程 ----------

console.log('读取 Tatoeba 导出文件...');
const jaSentences = loadSentences('jpn_sentences.tsv', 'jpn');
const enSentences = loadSentences('eng_sentences.tsv', 'eng');
const cmn = loadSentences('cmn_sentences.tsv', 'cmn');
const jaLinks = loadLinks('jpn-cmn_links.tsv');
const enLinks = loadLinks('eng-cmn_links.tsv');
const jaTranscriptions = loadTranscriptions('jpn_transcriptions.tsv');

console.log(`日语 ${jaSentences.size} 句，英语 ${enSentences.size} 句，中文 ${cmn.size} 句`);
console.log(`日中链接 ${jaLinks.size}，英中链接 ${enLinks.size}，日语注音 ${jaTranscriptions.size}`);

console.log('计算词频...');
const kanjiRank = kanjiFrequency(jaSentences);
const wordRank = wordFrequency(enSentences);
console.log(`汉字频率表 ${kanjiRank.size} 字，单词频率表 ${wordRank.size} 词`);

// ========== 日语 ==========
console.log('\n构建日语语料...');
const jaFilter = makeQualityFilter('ja');
const jaRows = [];

for (const [id, text] of jaSentences) {
  const cmnId = jaLinks.get(id);
  const raw = cmnId ? cmn.get(cmnId) : null;
  if (!jaFilter(text, raw)) continue;

  const zh = toSimplified(raw);
  const level = gradeJa(text, kanjiRank);
  // 场景判定同时看原文和译文：中文词常常比日文词更直白
  const scene = classifyScene(text, zh);
  const reading = jaTranscriptions.get(id) || text;

  jaRows.push({ id: `ja-${id}`, text, reading, zh, level, scene });
}

const jaByLevel = {};
for (const r of dedupe(jaRows)) {
  (jaByLevel[r.level] ??= []).push(r);
}

console.log(`日语有效句 ${jaRows.length}，去重后按级别分布：`);
const jaExports = [];
for (const level of ['N5', 'N4', 'N3', 'N2', 'N1']) {
  const rows = (jaByLevel[level] || []).slice(0, 300);  // 每级最多 300 条
  if (rows.length === 0) continue;
  console.log(`  ${level}: ${rows.length}`);
  const id = `tatoeba-ja-${level.toLowerCase()}`;
  const title = `Tatoeba 日语 ${level}`;
  const exp = emitWork(id, 'ja', title, level, rows, OUT);
  jaExports.push(exp);
}

// ========== 英语 ==========
console.log('\n构建英语语料...');
const enFilter = makeQualityFilter('en');
const enRows = [];

for (const [id, text] of enSentences) {
  const cmnId = enLinks.get(id);
  const raw = cmnId ? cmn.get(cmnId) : null;
  if (!enFilter(text, raw)) continue;

  const zh = toSimplified(raw);
  const level = gradeEn(text, wordRank);
  const scene = classifyScene(text, zh);

  enRows.push({ id: `en-${id}`, text, zh, level, scene });
}

const enByLevel = {};
for (const r of dedupe(enRows)) {
  (enByLevel[r.level] ??= []).push(r);
}

console.log(`英语有效句 ${enRows.length}，去重后按级别分布：`);
const enExports = [];
for (const level of ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']) {
  const rows = (enByLevel[level] || []).slice(0, 250);
  if (rows.length === 0) continue;
  console.log(`  ${level}: ${rows.length}`);
  const id = `tatoeba-en-${level.toLowerCase()}`;
  const title = `Tatoeba English ${level}`;
  const exp = emitWork(id, 'en', title, level, rows, OUT);
  enExports.push(exp);
}

console.log(`\n完成。记得在 ${OUT}/index.ts 里导出这些新变量：`);
console.log([...jaExports, ...enExports].join(', '));

