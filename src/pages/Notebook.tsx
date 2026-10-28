/**
 * 生词本 + 学习足迹
 * 记录存在 localStorage，可以导出备份、从文件恢复。
 */

import { useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../lang';
import { works, LEVEL_LABEL } from '../data';
import { useProgress, exportJSON } from '../store/progress';
import { Highlight } from '../components/Highlight';
import { parseFurigana } from '../utils/furigana';

export default function Notebook() {
  const { lang } = useLang();
  const { progress, toggleMark, reset, importJSON } = useProgress();
  const fileRef = useRef<HTMLInputElement>(null);

  // 把记录映射回片段，顺手带上所属作品
  const rows = useMemo(() => {
    const out: {
      workId: string;
      workTitle: string;
      seg: (typeof works)[number]['segments'][number];
      done: number;
      marked: boolean;
      at: number;
    }[] = [];
    for (const w of works) {
      for (const s of w.segments) {
        const r = progress.records[s.id];
        if (!r) continue;
        out.push({
          workId: w.id,
          workTitle: w.title,
          seg: s,
          done: r.done,
          marked: !!r.marked,
          at: r.at,
        });
      }
    }
    return out.sort((a, b) => b.at - a.at);
  }, [progress.records]);

  const marked = rows.filter((r) => r.marked);
  const learned = rows.filter((r) => r.done > 0);

  const dictAvg =
    progress.dictation.length === 0
      ? null
      : Math.round(
          progress.dictation.reduce((s, d) => s + d.accuracy, 0) / progress.dictation.length,
        );

  const download = () => {
    const blob = new Blob([exportJSON(progress)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `listening-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const upload = (file: File) => {
    const fr = new FileReader();
    fr.onload = () => {
      try {
        importJSON(String(fr.result));
      } catch {
        alert('这个文件读不出来，请确认是本站导出的备份。');
      }
    };
    fr.readAsText(file);
  };

  return (
    <div className="wrap page">
      <header className="page__head">
        <p className="page__kicker">My Notebook</p>
        <h1 className="page__title">生词本与学习足迹</h1>
        <p className="page__lead">
          记录保存在这台设备的浏览器里。换设备前先导出备份，再在新设备恢复。
        </p>
      </header>

      <div className="stats-row">
        <div className="stat-box">
          <div className="stat__n">{learned.length}</div>
          <div className="stat__l">已精听片段</div>
        </div>
        <div className="stat-box">
          <div className="stat__n">{marked.length}</div>
          <div className="stat__l">生词本条目</div>
        </div>
        <div className="stat-box">
          <div className="stat__n">{progress.dictation.length}</div>
          <div className="stat__l">听写次数</div>
        </div>
        <div className="stat-box">
          <div className="stat__n">{dictAvg === null ? '—' : `${dictAvg}%`}</div>
          <div className="stat__l">听写平均正确率</div>
        </div>
      </div>

      <div className="filters">
        <span className="filters__label">记录管理</span>
        <button type="button" className="btn" onClick={download}>
          ↓ 备份学习记录
        </button>
        <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
          ↑ 恢复记录
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="sr"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          className="btn btn--danger"
          onClick={() => {
            if (confirm('清空本机所有学习记录？此操作不可撤销，建议先导出备份。')) reset();
          }}
        >
          清空记录
        </button>
      </div>

      <h2 className="sec__title">生词本</h2>
      {marked.length === 0 ? (
        <p className="empty">
          还没有加入生词本的片段。
          <br />
          在精听台点「＋ 加入生词本」，这一句就会出现在这里。
        </p>
      ) : (
        <div className="nb-list">
          {marked.map((r) => (
            <article className="nb-item" key={r.seg.id}>
              <div className="nb-item__main">
                <p className="nb-item__text tgt" lang={works.find((w) => w.id === r.workId)?.lang}>
                  <Highlight text={r.seg.text} keywords={r.seg.keywords} />
                </p>
                {r.seg.reading && <p className="nb-item__reading">{parseFurigana(r.seg.reading)}</p>}
                <p className="nb-item__zh">{r.seg.zh}</p>
                <div className="nb-item__meta">
                  <span className="tag">{LEVEL_LABEL[r.seg.level]}</span>
                  <span className="nb-item__src">{r.workTitle}</span>
                  {r.done > 0 && <span className="nb-item__src">已听 {r.done} 次</span>}
                </div>
              </div>
              <div className="nb-item__side">
                <Link className="btn btn--ghost" to={`/study/${r.workId}?seg=${r.seg.id}`}>
                  去精听
                </Link>
                <button type="button" className="btn btn--ghost" onClick={() => toggleMark(r.seg.id)}>
                  移出
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <h2 className="sec__title">最近学过</h2>
      {learned.length === 0 ? (
        <p className="empty">
          还没有完成记录。
          <br />
          走完四步精听后点「听懂了，记录本次学习」，就会累积在这里。
        </p>
      ) : (
        <div className="nb-list">
          {learned.slice(0, 20).map((r) => (
            <article className="nb-item nb-item--slim" key={r.seg.id}>
              <div className="nb-item__main">
                <p className="nb-item__text tgt" lang={works.find((w) => w.id === r.workId)?.lang}>
                  {r.seg.text}
                </p>
                <p className="nb-item__zh">{r.seg.zh}</p>
                <div className="nb-item__meta">
                  <span className="nb-item__src">{r.workTitle}</span>
                  <span className="nb-item__src">已听 {r.done} 次</span>
                  <span className="nb-item__src">
                    {new Date(r.at).toLocaleDateString('zh-CN')}
                  </span>
                </div>
              </div>
              <div className="nb-item__side">
                <Link className="btn btn--ghost" to={`/study/${r.workId}?seg=${r.seg.id}`}>
                  再听一次
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}

      <p className="src-note">
        当前学习语言：{lang === 'ja' ? '日语' : '英语'}。生词本会展示两种语言的全部记录，
        不随顶部语言切换过滤。
      </p>
    </div>
  );
}
