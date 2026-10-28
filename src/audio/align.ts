/**
 * 逐字稿对齐：把估算的时间点吸附到音频里真实的停顿上。
 *
 * 为什么需要这个：
 *   VOA 只给音频和纯文稿，不给字幕时间轴。按字数比例估算出来的时间点
 *   误差能到好几秒 —— 朗读有快有慢，句间停顿长短不一，字数和时长不成正比。
 *
 * 思路：
 *   朗读时每个句子边界几乎都对应一段静音。所以不需要做真正的强制对齐
 *   （那要声学模型），只要把估算的边界吸附到附近真实的停顿上就能准很多。
 *
 * 做法：
 *   1. Web Audio 解码 MP3 拿到 PCM
 *   2. 按 20ms 窗口算能量，找出连续低能量的段落 = 停顿
 *   3. 每个估算边界在 ±2.5 秒内找最近的停顿，吸附过去，并保证单调递增
 *
 * 算完缓存进 localStorage，同一篇不用每次重算。
 */

import type { TranscriptLine } from '../types';

/** 分析窗口：20ms，足够分辨词间空隙和句间停顿 */
const WIN_MS = 20;

/** 认定为停顿的最短时长。比这短的是词间空隙，不是句子边界 */
const MIN_PAUSE_MS = 180;

/** 边界最多挪这么远。再远就说明估算本身偏得太多，硬吸附反而更错 */
const SNAP_WINDOW_SEC = 2.5;

const CACHE_PREFIX = 'bl.align.';

export interface AlignResult {
  lines: TranscriptLine[];
  /** 找到多少个停顿 */
  pauses: number;
  /** 实际挪动了多少个边界 */
  snapped: number;
}

/* ---------- 缓存 ---------- */

function cacheKey(articleId: string): string {
  return `${CACHE_PREFIX}${articleId}`;
}

/** 缓存只存边界时间点，不存整行文本 */
function readCache(articleId: string, count: number): number[] | null {
  try {
    const raw = localStorage.getItem(cacheKey(articleId));
    if (!raw) return null;
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr) || arr.length !== count) return null;
    if (!arr.every((n) => typeof n === 'number' && Number.isFinite(n))) return null;
    return arr as number[];
  } catch {
    return null;
  }
}

function writeCache(articleId: string, starts: number[]) {
  try {
    localStorage.setItem(cacheKey(articleId), JSON.stringify(starts));
  } catch {
    /* 存不下就算了，下次重算 */
  }
}

/** 清掉某篇的对齐缓存，重新对齐时用 */
export function clearAlignCache(articleId: string) {
  try {
    localStorage.removeItem(cacheKey(articleId));
  } catch {
    /* ignore */
  }
}

/* ---------- 停顿检测 ---------- */

/**
 * 找出音频里的停顿，返回每段停顿的中点（秒）。
 *
 * 用相对阈值而不是固定值：不同录音的整体音量差很多，
 * 固定阈值在安静的录音上会把所有地方都当成停顿。
 */
function findPauses(buf: AudioBuffer): number[] {
  const data = buf.getChannelData(0);
  const sr = buf.sampleRate;
  const win = Math.max(1, Math.floor((sr * WIN_MS) / 1000));
  const n = Math.floor(data.length / win);

  // 每个窗口的均方根能量
  const rms = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    const start = i * win;
    for (let j = 0; j < win; j++) {
      const v = data[start + j];
      sum += v * v;
    }
    rms[i] = Math.sqrt(sum / win);
  }

  // 阈值取「有声部分中位数」的一个比例。先粗筛掉接近零的窗口，
  // 再取中位数，避免大段静音把中位数压到 0。
  const voiced = Array.from(rms).filter((v) => v > 1e-4);
  if (voiced.length === 0) return [];
  voiced.sort((a, b) => a - b);
  const median = voiced[Math.floor(voiced.length * 0.5)];
  const threshold = median * 0.18;

  const minWins = Math.ceil(MIN_PAUSE_MS / WIN_MS);
  const pauses: number[] = [];
  let runStart = -1;

  for (let i = 0; i < n; i++) {
    const quiet = rms[i] < threshold;
    if (quiet) {
      if (runStart === -1) runStart = i;
    } else if (runStart !== -1) {
      if (i - runStart >= minWins) {
        // 取停顿中点：句子通常在停顿中间断开
        const mid = ((runStart + i) / 2) * (WIN_MS / 1000);
        pauses.push(mid);
      }
      runStart = -1;
    }
  }
  // 结尾的静音段
  if (runStart !== -1 && n - runStart >= minWins) {
    pauses.push(((runStart + n) / 2) * (WIN_MS / 1000));
  }

  return pauses;
}

/* ---------- 吸附 ---------- */

/**
 * 把每行的起点吸附到最近的停顿。
 *
 * 保证单调：吸附后的时间点必须比上一行晚，否则两行会重叠，
 * 高亮会来回跳。找不到合适停顿就保留原估算值。
 */
function snapToPauses(
  lines: TranscriptLine[],
  pauses: number[],
  duration: number,
): { starts: number[]; snapped: number } {
  const starts: number[] = [];
  let snapped = 0;
  let pi = 0;

  for (let i = 0; i < lines.length; i++) {
    const est = lines[i].start;
    const prev = i === 0 ? 0 : starts[i - 1];

    // 第一行固定从 0 开始
    if (i === 0) {
      starts.push(0);
      continue;
    }

    // 候选停顿必须晚于上一行，且在吸附窗口内
    while (pi < pauses.length && pauses[pi] <= prev + 0.05) pi++;

    let best = -1;
    let bestDist = Infinity;
    for (let k = pi; k < pauses.length; k++) {
      const p = pauses[k];
      if (p > est + SNAP_WINDOW_SEC) break;
      const d = Math.abs(p - est);
      if (d < bestDist) {
        bestDist = d;
        best = p;
      }
    }

    if (best >= 0 && bestDist <= SNAP_WINDOW_SEC) {
      starts.push(best);
      if (Math.abs(best - est) > 0.08) snapped++;
    } else {
      // 没有合适的停顿：保留估算，但别早于上一行
      starts.push(Math.max(est, prev + 0.2));
    }
  }

  // 保证全程单调且不超出音频长度
  for (let i = 1; i < starts.length; i++) {
    if (starts[i] <= starts[i - 1]) starts[i] = starts[i - 1] + 0.2;
  }
  for (let i = 0; i < starts.length; i++) {
    starts[i] = Math.min(starts[i], Math.max(0, duration - 0.3));
  }

  return { starts, snapped };
}

/** 用吸附好的起点重建每行的 start / end */
function rebuild(lines: TranscriptLine[], starts: number[], duration: number): TranscriptLine[] {
  return lines.map((line, i) => ({
    ...line,
    start: starts[i],
    end: i + 1 < starts.length ? starts[i + 1] : duration,
  }));
}

/* ---------- 对外接口 ---------- */

/**
 * 对齐一篇文章的逐字稿。
 *
 * 先看缓存；没有就下载音频、解码、找停顿、吸附。
 * 解码几兆的 MP3 要一两秒，所以调用方要显示进度。
 */
export async function alignArticle(
  articleId: string,
  audioUrl: string,
  lines: TranscriptLine[],
  duration: number,
): Promise<AlignResult> {
  // 缓存命中：直接用
  const cached = readCache(articleId, lines.length);
  if (cached) {
    return { lines: rebuild(lines, cached, duration), pauses: 0, snapped: 0 };
  }

  const res = await fetch(audioUrl);
  if (!res.ok) throw new Error(`音频下载失败（${res.status}）`);
  const bytes = await res.arrayBuffer();

  const Ctx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) throw new Error('这个浏览器不支持 Web Audio，无法做停顿对齐。');

  const ctx = new Ctx();
  let buf: AudioBuffer;
  try {
    buf = await ctx.decodeAudioData(bytes);
  } finally {
    void ctx.close();
  }

  const realDuration = buf.duration || duration;
  const pauses = findPauses(buf);
  const { starts, snapped } = snapToPauses(lines, pauses, realDuration);

  writeCache(articleId, starts);
  return { lines: rebuild(lines, starts, realDuration), pauses: pauses.length, snapped };
}
