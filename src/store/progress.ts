/** 学习记录：存 localStorage，可导出／恢复备份 */

import { useCallback, useEffect, useState } from 'react';

const KEY = 'bilingual-listening-progress-v1';

export interface SegmentRecord {
  /** 已完成精听的次数 */
  done: number;
  /** 加入生词本 */
  marked?: boolean;
  /** 最后一次学习时间 */
  at: number;
}

export interface Progress {
  /** segmentId -> record */
  records: Record<string, SegmentRecord>;
  /** 听写得分历史 */
  dictation: { at: number; segmentId: string; accuracy: number }[];
  /** 影子跟读：segmentId -> 跟读过几遍 */
  shadow: Record<string, number>;
}

const empty: Progress = { records: {}, dictation: [], shadow: {} };

function read(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<Progress>;
    return {
      records: parsed.records ?? {},
      dictation: parsed.dictation ?? [],
      // 旧版本的备份没有这个字段
      shadow: parsed.shadow ?? {},
    };
  } catch {
    return empty;
  }
}

function write(p: Progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* 隐身模式等场景下写入失败，忽略 */
  }
}

/** 跨组件同步 */
const listeners = new Set<(p: Progress) => void>();
let current = read();

function commit(next: Progress) {
  current = next;
  write(next);
  listeners.forEach((fn) => fn(next));
}

export function useProgress() {
  const [state, setState] = useState<Progress>(current);

  useEffect(() => {
    listeners.add(setState);
    return () => {
      listeners.delete(setState);
    };
  }, []);

  const complete = useCallback((segmentId: string) => {
    const prev = current.records[segmentId];
    commit({
      ...current,
      records: {
        ...current.records,
        [segmentId]: { done: (prev?.done ?? 0) + 1, marked: prev?.marked, at: Date.now() },
      },
    });
  }, []);

  const toggleMark = useCallback((segmentId: string) => {
    const prev = current.records[segmentId];
    commit({
      ...current,
      records: {
        ...current.records,
        [segmentId]: { done: prev?.done ?? 0, marked: !prev?.marked, at: Date.now() },
      },
    });
  }, []);

  const logDictation = useCallback((segmentId: string, accuracy: number) => {
    commit({
      ...current,
      dictation: [...current.dictation, { at: Date.now(), segmentId, accuracy }].slice(-200),
    });
  }, []);

  const reset = useCallback(() => commit(empty), []);

  const importJSON = useCallback((text: string) => {
    const parsed = JSON.parse(text) as Partial<Progress>;
    commit({
      records: parsed.records ?? {},
      dictation: parsed.dictation ?? [],
      shadow: parsed.shadow ?? {},
    });
  }, []);

  return {
    progress: state,
    complete,
    toggleMark,
    logDictation,
    reset,
    importJSON,
  };
}

export function exportJSON(p: Progress): string {
  return JSON.stringify(p, null, 2);
}
