/**
 * 逐字稿跟读材料汇总。
 *
 * 和 works（单句素材）分开放：这些是成篇的音频 + 滚动逐字稿，
 * 用法是跟着一整篇读下来，不是一句一句抠。
 */

import type { Article, Lang } from '../types';
import { voa_american_stories } from './voa-american-stories';
import { voa_as_it_is } from './voa-as-it-is';
import { voa_everyday_grammar } from './voa-everyday-grammar';
import { voa_ask_a_teacher } from './voa-ask-a-teacher';

/** 按难度从易到难：问老师最短，美国故事最长 */
export const articles: Article[] = [
  ...voa_ask_a_teacher,
  ...voa_everyday_grammar,
  ...voa_as_it_is,
  ...voa_american_stories,
];

export function articlesByLang(lang: Lang): Article[] {
  return articles.filter((a) => a.lang === lang);
}

export function findArticle(id: string): Article | undefined {
  return articles.find((a) => a.id === id);
}

/** 把秒数写成 3:42 */
export function clock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}
