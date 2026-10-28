import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLang } from '../lang';
import { works, LEVELS, LEVEL_LABEL, levelRange } from '../data';
import { useProgress } from '../store/progress';
import type { Level } from '../types';

export default function Library() {
  const { lang } = useLang();
  const { progress } = useProgress();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');

  const level = (params.get('level') ?? 'all') as Level | 'all';

  function set(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value === 'all') next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  }

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return works
      .filter((w) => w.lang === lang)
      .map((w) => {
        const segs = w.segments.filter((s) => {
          if (level !== 'all' && s.level !== level) return false;
          if (q) {
            const hay = [s.text, s.reading ?? '', s.zh].join(' ').toLowerCase();
            if (!hay.includes(q)) return false;
          }
          return true;
        });
        return { work: w, hits: segs.length };
      })
      .filter((x) => x.hits > 0);
  }, [lang, level, query]);

  return (
    <section className="wrap sect">
      <div className="sect__head">
        <h2 className="sect__h">素材库</h2>
        <span className="sect__more">
          {lang === 'ja' ? '日本語' : 'English'} · {list.length} 套
        </span>
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
        {LEVELS[lang].map((l) => (
          <button
            key={l}
            type="button"
            className="chip"
            aria-pressed={level === l}
            onClick={() => set('level', l)}
          >
            {l} {LEVEL_LABEL[l]}
          </button>
        ))}
        <input
          className="search"
          type="search"
          value={query}
          placeholder="搜原文、读音或中文意思"
          onChange={(e) => setQuery(e.target.value)}
          aria-label="搜索片段"
        />
      </div>

      {list.length === 0 ? (
        <p className="empty">
          这个筛选下还没有片段。
          <br />
          换个等级试试，也可以按使用说明导入自己的材料。
        </p>
      ) : (
        <div className="works">
          {list.map(({ work: w, hits }) => {
            const done = w.segments.filter((s) => progress.records[s.id]?.done).length;
            const pct = w.segments.length ? Math.round((done / w.segments.length) * 100) : 0;
            const qs = new URLSearchParams();
            if (level !== 'all') qs.set('level', level);
            const suffix = qs.toString() ? `?${qs}` : '';

            return (
              <Link className="work" to={`/study/${w.id}${suffix}`} key={w.id}>
                <div className="work__head">
                  <div>
                    <div className="work__title">{w.title}</div>
                    {w.titleOrigin && (
                      <div className="work__origin" lang={w.lang}>
                        {w.titleOrigin}
                      </div>
                    )}
                  </div>
                  <span className="tag tag--accent">命中 {hits}</span>
                </div>

                <p className="work__sum">{w.summary}</p>

                <div className="work__levels">
                  <span className="tag tag--lv">等级 {levelRange(w.levels)}</span>
                  <span className="work__lessons">{w.segments.length} 个片段</span>
                </div>

                <div className="bar">
                  <div className="bar__fill" style={{ width: `${pct}%` }} />
                </div>

                <div className="work__meta">
                  <span className="work__count">
                    {done} / {w.segments.length}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
