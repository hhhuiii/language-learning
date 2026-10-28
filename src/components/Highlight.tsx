/**
 * 把片段原文里的目标词高亮出来。
 * 振假名不在这里处理：日语的读音走 segment.reading 字段，
 * 由 utils/furigana 的 parseFurigana 渲染成 <ruby>。
 */

import type { ReactNode } from 'react';
import type { Keyword } from '../types';

/** 正则转义，词条里可能带 . ? 等字符 */
function esc(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function Highlight({
  text,
  keywords,
}: {
  text: string;
  keywords?: Keyword[];
}): ReactNode {
  // 词卡上显示辞书形（term），高亮用原文里实际出现的形态（match）
  const terms = (keywords ?? []).map((k) => k.match ?? k.term).filter(Boolean);
  if (terms.length === 0) return text;

  // 长词优先，避免短词先匹配把长词切碎
  const sorted = [...new Set(terms)].sort((a, b) => b.length - a.length);
  // 英语句首会大写，按大小写不敏感匹配
  const re = new RegExp(`(${sorted.map(esc).join('|')})`, 'gi');
  const lower = new Set(sorted.map((t) => t.toLowerCase()));
  const parts = text.split(re);

  return parts.map((part, i) =>
    lower.has(part.toLowerCase()) ? (
      <mark className="kw" key={i}>
        {part}
      </mark>
    ) : (
      part
    ),
  );
}
