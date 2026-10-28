/**
 * 自己导入的文章，存 localStorage。
 *
 * 纯文本导入的材料没有音频文件，播放走浏览器语音合成。
 * 这反而比估算时间轴更准 —— 语音合成每句念完会回调，
 * 高亮跟着回调走，是真同步，不是按字数猜的。
 */

import { useCallback, useEffect, useState } from 'react';
import type { Article, Lang, Level, TranscriptLine } from '../types';

const KEY = 'bl.imported.articles.v1';

/* ---------- 读写 ---------- */

function read(): Article[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    // 只保留结构完整的，坏数据直接丢掉而不是让页面崩
    return arr.filter(
      (a): a is Article =>
        Boolean(a) &&
        typeof (a as Article).id === 'string' &&
        Array.isArray((a as Article).lines) &&
        (a as Article).lines.length > 0,
    );
  } catch {
    return [];
  }
}

function write(list: Article[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

/** 跨组件同步，和 progress 用同一套做法 */
const listeners = new Set<(list: Article[]) => void>();
let current = read();

function commit(next: Article[]) {
  current = next;
  write(next);
  listeners.forEach((fn) => fn(next));
}

export function importedArticles(): Article[] {
  return current;
}

export function useImported() {
  const [list, setList] = useState<Article[]>(current);

  useEffect(() => {
    listeners.add(setList);
    return () => {
      listeners.delete(setList);
    };
  }, []);

  const add = useCallback((a: Article) => {
    // 同 id 视为覆盖，方便改完再导一次
    commit([a, ...current.filter((x) => x.id !== a.id)]);
  }, []);

  const remove = useCallback((id: string) => {
    commit(current.filter((a) => a.id !== id));
  }, []);

  return { list, add, remove };
}

/* ---------- 文本 → 文章 ---------- */

/**
 * 按空行分段。
 *
 * 纯文本的段落边界就是空行，这是唯一可靠的信号 ——
 * 单个换行在很多编辑器里只是软换行，不代表分段。
 * 但如果整篇一个空行都没有，就退回按单换行分段，
 * 否则整篇会挤成一段。
 */
export function splitParagraphs(text: string): string[] {
  const normalized = text.replace(/\r\n?/g, '\n').trim();
  if (!normalized) return [];

  const byBlank = normalized
    .split(/\n\s*\n+/)
    .map((p) => p.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean);

  if (byBlank.length > 1) return byBlank;

  // 没有空行：按单换行分，至少保住段落感
  return normalized
    .split('\n')
    .map((p) => p.trim())
    .filter(Boolean);
}

/** 句末标点：中日英都要认 */
const TERM = /[.!?。！？…]/;

/**
 * 成对的括号／引号。里面的句号不是句子边界 ——
 * 「行くよ。」と彼は言った。整句只有最后那个。才是句末。
 */
const OPEN = '「『（(【〈《［[';
const CLOSE = '」』）)】〉》］]';

/**
 * 允许跟在句末标点后面的收尾符号。
 * He said "hello." —— 引号属于前一句，不能甩给下一句开头。
 * ASCII 的 " 和 ' 开合同形，没法当成对括号数，只能这样兜。
 */
const TRAIL = '"\'’”」』）)］]';

/**
 * 英文缩写词：后面那个点不是句末。
 * 'no' / 'co' / 'ed' 这类太容易和真正的句尾撞（"I said no. Then…"），
 * 宁可漏判也不收进来。
 */
const ABBREV = new Set([
  'mr', 'mrs', 'ms', 'dr', 'prof', 'st', 'jr', 'sr', 'vs', 'etc',
  'inc', 'ltd', 'fig', 'dept', 'approx', 'vol', 'pp', 'al',
  'sgt', 'capt', 'gen', 'lt', 'rev', 'hon', 'messrs', 'mt', 'ave', 'blvd', 'rd',
]);

/** 点前面那个词是不是缩写（或 U.S. 那样的单字母首字母） */
function isAbbrev(s: string, dotAt: number): boolean {
  let k = dotAt - 1;
  while (k >= 0 && /[A-Za-z]/.test(s[k])) k--;
  const word = s.slice(k + 1, dotAt);
  if (!word) return false;
  if (word.length === 1 && /[A-Z]/.test(word)) return true;
  return ABBREV.has(word.toLowerCase());
}

/**
 * 先按句末标点粗切一遍。
 *
 * 逐字符扫，遇到句末标点时要同时满足几件事才真的断开：
 *   1. 不在括号／引号里面（括号里的句号是引文的，不是这句的）
 *   2. 不是 Mr. Dr. 这类缩写后面的点
 *   3. 后面不是紧跟小写字母（跟小写说明这句还没完）
 * 断点取在收尾引号之后，这样引号留在前一句。
 */
function roughSplit(para: string, lang: Lang): string[] {
  const out: string[] = [];
  let start = 0;
  let depth = 0;
  let i = 0;

  while (i < para.length) {
    const ch = para[i];

    if (OPEN.includes(ch)) {
      depth++;
      i++;
      continue;
    }
    if (CLOSE.includes(ch)) {
      depth = Math.max(0, depth - 1);
      i++;
      continue;
    }
    if (!TERM.test(ch)) {
      i++;
      continue;
    }

    // 连续的句末标点算一个（省略号、!?）
    let j = i;
    while (j < para.length && TERM.test(para[j])) j++;
    const run = para.slice(i, j);

    // 判断用标点所在位置的深度，不能用吃掉收尾引号之后的
    // —— 否则「行くよ。」里的。会因为 」把深度降到 0 而被当成句末
    const depthHere = depth;

    while (j < para.length && TRAIL.includes(para[j])) {
      if (CLOSE.includes(para[j])) depth = Math.max(0, depth - 1);
      j++;
    }

    const boundary =
      depthHere === 0 &&
      !(lang === 'en' && run === '.' && isAbbrev(para, i)) &&
      !(lang === 'en' && run === '.' && /^\s+[a-z]/.test(para.slice(j)));

    if (boundary) {
      out.push(para.slice(start, j));
      start = j;
    }
    i = j;
  }

  if (start < para.length) out.push(para.slice(start));
  return out;
}

/**
 * 把一段切成句子。
 *
 * 和导入 VOA 时同一套思路：太长的跟不动，太短的跟读没意义。
 * 日语没有空格，所以长度按字符数判断，不能按词数。
 */
export function splitSentences(para: string, lang: Lang): string[] {
  const maxLen = lang === 'ja' ? 46 : 180;
  const minLen = lang === 'ja' ? 4 : 12;

  const rough = roughSplit(para, lang);

  // 过长的在次级标点处补断
  const out: string[] = [];
  for (const s of rough) {
    const t = s.trim();
    if (!t) continue;
    if (t.length <= maxLen) {
      out.push(t);
      continue;
    }
    const parts = t.split(/(?<=[,，、;；:：])\s*/);
    let acc = '';
    for (const p of parts) {
      acc += p;
      if (acc.length >= maxLen * 0.55) {
        out.push(acc.trim());
        acc = '';
      }
    }
    if (acc.trim()) out.push(acc.trim());
  }

  // 太短的并进前一句，不然跟读时一闪而过
  const merged: string[] = [];
  for (const s of out) {
    if (s.length < minLen && merged.length) {
      merged[merged.length - 1] += ' ' + s;
    } else {
      merged.push(s);
    }
  }
  return merged.filter((s) => /[A-Za-z0-9぀-ヿ一-鿿]/.test(s));
}

/**
 * 朗读速度，字符/秒。用来估算时长，只影响进度条和时间显示；
 * 高亮不靠它 —— 语音合成每句念完会回调，高亮跟回调走。
 */
const CHARS_PER_SEC: Record<Lang, number> = { ja: 6.5, en: 14 };

export interface BuildOptions {
  title: string;
  lang: Lang;
  level: Level;
  text: string;
  summary?: string;
  source?: string;
}

/** 纯文本 → 可以直接跟读的文章 */
export function buildFromText(opts: BuildOptions): Article {
  const paras = splitParagraphs(opts.text);
  const lines: TranscriptLine[] = [];
  let t = 0;
  let n = 0;

  paras.forEach((para, pi) => {
    for (const sent of splitSentences(para, opts.lang)) {
      const dur = Math.max(1.2, sent.length / CHARS_PER_SEC[opts.lang]);
      lines.push({
        id: `l${String(++n).padStart(3, '0')}`,
        text: sent,
        para: pi,
        start: Number(t.toFixed(2)),
        end: Number((t + dur).toFixed(2)),
      });
      t += dur;
    }
  });

  return {
    id: `my-${Date.now().toString(36)}`,
    lang: opts.lang,
    title: opts.title.trim() || '未命名',
    audio: '',
    tts: true,
    duration: Math.round(t),
    timing: 'estimated',
    level: opts.level,
    summary: opts.summary?.trim() || undefined,
    source: opts.source?.trim() || '自己导入',
    license: '自行确认授权范围',
    lines,
  };
}
