import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { findWork, filterSegments, LEVELS, LEVEL_LABEL } from '../data';
import { useProgress } from '../store/progress';
import ListenStage from '../components/ListenStage';
import type { Level } from '../types';

export default function Study() {
  const { workId } = useParams();
  const [params, setParams] = useSearchParams();
  const { progress, complete, toggleMark } = useProgress();
  const [cursor, setCursor] = useState(0);

  const work = workId ? findWork(workId) : undefined;

  const level = (params.get('level') ?? 'all') as Level | 'all';
  const query = params.get('q') ?? '';

  const segments = useMemo(
    () => (work ? filterSegments(work.segments, { level, query }) : []),
    [work, level, query],
  );

  // 筛选条件变了，回到第一句
  useEffect(() => setCursor(0), [level, query, workId]);

  function set(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (!value || value === 'all') next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  }

  if (!work) {
    return (
      <section className="wrap sect">
        <p className="empty">
          没找到这套材料。
          <br />
          <Link className="btn" to="/library">
            ← 回到素材库
          </Link>
        </p>
      </section>
    );
  }

  const segment = segments[Math.min(cursor, segments.length - 1)];
  const doneCount = work.segments.filter((s) => progress.records[s.id]?.done).length;
  const pct = work.segments.length ? Math.round((doneCount / work.segments.length) * 100) : 0;

  return (
    <section className="wrap sect">
      <Link className="back" to="/library">
        ← 选择其他材料
      </Link>

      <div className="sect__head">
        <div>
          <h2 className="sect__h">{work.title}</h2>
          {work.titleOrigin && (
            <p className="work__origin" lang={work.lang}>
              {work.titleOrigin}
            </p>
          )}
        </div>
        <span className="sect__more">
          已听 {doneCount} / {work.segments.length} 句（{pct}%）
        </span>
      </div>

      <div className="bar">
        <div className="bar__fill" style={{ width: `${pct}%` }} />
      </div>

      <div className="filters">
        <span className="filters__label">等级</span>
        <button
          type="button"
          className="chip"
          aria-pressed={level === 'all'}
          onClick={() => set('level', 'all')}
        >
          全部
        </button>
        {LEVELS[work.lang].map((l) => (
          <button
            key={l}
            type="button"
            className="chip"
            aria-pressed={level === l}
            onClick={() => set('level', l)}
          >
            {l}
          </button>
        ))}
      </div>

      {!segment ? (
        <p className="empty">这个筛选下还没有片段，试试其他等级。</p>
      ) : (
        <ListenStage
          key={segment.id}
          segment={segment}
          lang={work.lang}
          index={Math.min(cursor, segments.length - 1)}
          total={segments.length}
          marked={Boolean(progress.records[segment.id]?.marked)}
          onComplete={() => complete(segment.id)}
          onToggleMark={() => toggleMark(segment.id)}
          onPrev={cursor > 0 ? () => setCursor((c) => c - 1) : undefined}
          onNext={cursor < segments.length - 1 ? () => setCursor((c) => c + 1) : undefined}
        />
      )}

      <div className="kb-hint">
        快捷键：<kbd>空格</kbd> 播放／停止 · <kbd>D</kbd> 显示或隐藏字幕 ·{' '}
        <kbd>←</kbd> <kbd>→</kbd> 切换精听步骤
      </div>

      <div className="src-note">
        <strong>本套材料的范围与来源</strong>
        <br />
        共 {work.segments.length} 个片段，覆盖{' '}
        {work.levels.map((l) => `${l}（${LEVEL_LABEL[l]}）`).join('、')}。
        <br />
        来源：{work.source}
        <br />
        授权：{work.license}
      </div>
    </section>
  );
}
