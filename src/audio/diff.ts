/**
 * 听写比对。
 * 日语按字符比，英语按单词比；用 LCS 对齐，标出对、错、漏。
 */

import type { Lang } from '../types';

export type Mark = 'ok' | 'bad' | 'miss';
export interface DiffPart {
  mark: Mark;
  text: string;
  /** 这一段包含多少个比对单元，算正确率用 */
  units: number;
}

/** 规范化：去掉标点和空白差异，避免因为一个句点判错 */
export function normalize(s: string, lang: Lang): string {
  let out = s.trim().toLowerCase();
  // 全角转半角的常见标点
  out = out.replace(/[、。，．！？「」『』（）]/g, ' ');
  out = out.replace(/[.,!?;:"'`()\[\]{}\-–—]/g, ' ');
  if (lang === 'ja') out = out.replace(/\s+/g, '');
  else out = out.replace(/\s+/g, ' ').trim();
  return out;
}

/** 切成比对单元：日语单字，英语单词 */
export function tokenize(s: string, lang: Lang): string[] {
  const n = normalize(s, lang);
  if (!n) return [];
  return lang === 'ja' ? Array.from(n) : n.split(' ');
}

/**
 * 对齐两个序列，返回带标记的片段。
 * ok   = 听对了
 * bad  = 写了但不对（多写／写错）
 * miss = 原文有，没写出来
 */
export function diffTokens(answer: string[], truth: string[], sep = ''): DiffPart[] {
  const n = answer.length;
  const m = truth.length;

  // LCS 动态规划表
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] =
        answer[i] === truth[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const parts: DiffPart[] = [];
  // 同类标记合并成一段，英语单词之间补 sep，日语直接相连
  const push = (mark: Mark, token: string) => {
    const last = parts[parts.length - 1];
    if (last && last.mark === mark) {
      last.text += sep + token;
      last.units += 1;
    } else {
      parts.push({ mark, text: token, units: 1 });
    }
  };

  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (answer[i] === truth[j]) {
      push('ok', truth[j]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      push('bad', answer[i]);
      i++;
    } else {
      push('miss', truth[j]);
      j++;
    }
  }
  while (i < n) push('bad', answer[i++]);
  while (j < m) push('miss', truth[j++]);

  return parts;
}

export interface DiffResult {
  parts: DiffPart[];
  /** 0–100，按听对的单元数占原文比例 */
  accuracy: number;
}

export function compare(answer: string, truth: string, lang: Lang): DiffResult {
  const a = tokenize(answer, lang);
  const t = tokenize(truth, lang);
  // 英语单词之间要留空格，日语逐字相连
  const parts = diffTokens(a, t, lang === 'ja' ? '' : ' ');

  const okUnits = parts
    .filter((p) => p.mark === 'ok')
    .reduce((sum, p) => sum + p.units, 0);

  const accuracy = t.length === 0 ? 0 : Math.round((okUnits / t.length) * 100);
  return { parts, accuracy };
}
