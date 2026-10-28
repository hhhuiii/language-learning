import type { Work, Lang, Level, Segment } from '../types';
import { jaBasics } from './ja-basics';
import { jaCampus } from './ja-campus';
import { jaTown } from './ja-town';
import { jaDaily } from './ja-daily';
import { jaDining } from './ja-dining';
import { jaNews } from './ja-news';
import { enBasics } from './en-basics';
import { enChat } from './en-chat';
import { enPhone } from './en-phone';
import { enOffice } from './en-office';
import { enTravel } from './en-travel';
import { enStory } from './en-story';
import { enNews } from './en-news';
import { enTalks } from './en-talks';
import { tatoeba_ja_n5 } from './tatoeba-ja-n5';
import { tatoeba_ja_n4 } from './tatoeba-ja-n4';
import { tatoeba_ja_n3 } from './tatoeba-ja-n3';
import { tatoeba_ja_n2 } from './tatoeba-ja-n2';
import { tatoeba_ja_n1 } from './tatoeba-ja-n1';
import { tatoeba_en_a1 } from './tatoeba-en-a1';
import { tatoeba_en_a2 } from './tatoeba-en-a2';
import { tatoeba_en_b1 } from './tatoeba-en-b1';
import { tatoeba_en_b2 } from './tatoeba-en-b2';
import { tatoeba_en_c1 } from './tatoeba-en-c1';
import { tatoeba_en_c2 } from './tatoeba-en-c2';

/** 英语按 A1 → C2 从易到难排，日语按 N5 → N1 */
export const works: Work[] = [
  jaBasics,
  jaCampus,
  jaDining,
  jaTown,
  jaDaily,
  jaNews,
  tatoeba_ja_n5,
  tatoeba_ja_n4,
  tatoeba_ja_n3,
  tatoeba_ja_n2,
  tatoeba_ja_n1,
  enBasics,
  enChat,
  enPhone,
  enOffice,
  enTravel,
  enStory,
  enNews,
  enTalks,
  tatoeba_en_a1,
  tatoeba_en_a2,
  tatoeba_en_b1,
  tatoeba_en_b2,
  tatoeba_en_c1,
  tatoeba_en_c2,
];

export function worksByLang(lang: Lang): Work[] {
  return works.filter((w) => w.lang === lang);
}

export function findWork(id: string): Work | undefined {
  return works.find((w) => w.id === id);
}

export const LEVELS: Record<Lang, Level[]> = {
  ja: ['N5', 'N4', 'N3', 'N2', 'N1'],
  en: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
};

export const LEVEL_LABEL: Record<Level, string> = {
  N5: '入门',
  N4: '基础',
  N3: '进阶',
  N2: '熟练',
  N1: '深入',
  A1: '零基础',
  A2: '初级',
  B1: '中级',
  B2: '中高级',
  C1: '高级',
  C2: '精通',
};

/** 等级在各自语言里的顺序，用来算「等级区间」 */
const LEVEL_ORDER: Level[] = [
  'N5', 'N4', 'N3', 'N2', 'N1',
  'A1', 'A2', 'B1', 'B2', 'C1', 'C2',
];

/** 把一套材料的等级压成区间显示：A2–C1 / N5–N3 */
export function levelRange(levels: Level[]): string {
  if (levels.length === 0) return '—';
  const sorted = [...levels].sort(
    (a, b) => LEVEL_ORDER.indexOf(a) - LEVEL_ORDER.indexOf(b),
  );
  const lo = sorted[0];
  const hi = sorted[sorted.length - 1];
  return lo === hi ? lo : `${lo}–${hi}`;
}

export interface SegmentFilter {
  level?: Level | 'all';
  query?: string;
}

export function filterSegments(segments: Segment[], f: SegmentFilter): Segment[] {
  const q = f.query?.trim().toLowerCase();
  return segments.filter((s) => {
    if (f.level && f.level !== 'all' && s.level !== f.level) return false;
    if (q) {
      const hay = [
        s.text,
        s.reading ?? '',
        s.zh,
        ...(s.keywords ?? []).flatMap((k) => [k.term, k.reading ?? '', k.zh]),
      ]
        .join(' ')
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
