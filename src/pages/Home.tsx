import { Link } from 'react-router-dom';
import { useLang } from '../lang';
import { worksByLang, levelRange } from '../data';
import { useProgress } from '../store/progress';

const FLOW = [
  { n: '01', t: '盲听', d: '只给声音。不看字幕，先让耳朵自己去抓节奏和词界。' },
  { n: '02', t: '原文字幕', d: '只看目标语。核对刚才听到的，找出漏掉的那几个音。' },
  { n: '03', t: '双语讲解', d: '中文翻译加用法说明，弄清这个词为什么出现在这里。' },
  { n: '04', t: '再次盲听', d: '回到纯声音。这一遍听懂了，这句才算真的过了。' },
];

export default function Home() {
  const { lang } = useLang();
  const { progress } = useProgress();
  const list = worksByLang(lang);

  const segTotal = list.reduce((n, w) => n + w.segments.length, 0);
  const doneCount = list.reduce(
    (n, w) => n + w.segments.filter((s) => progress.records[s.id]?.done).length,
    0,
  );

  return (
    <>
      <section className="wrap hero">
        <p className="hero__kicker">
          {lang === 'ja' ? 'にほんごを、耳から。' : 'Listen it through.'}
        </p>
        <h1>听得懂的那一句，才真的学会了。</h1>
        <p>
          精听不是反复播放到会背，而是四步走完一句：先盲听，再看原文，然后弄懂用法，
          最后回到纯声音确认。日语和英语都在这里，一套流程练到底。
        </p>

        <div className="hero__stats">
          <div>
            <div className="stat__n">{list.length}</div>
            <div className="stat__l">套材料</div>
          </div>
          <div>
            <div className="stat__n">{segTotal}</div>
            <div className="stat__l">个片段</div>
          </div>
          <div>
            <div className="stat__n">{doneCount}</div>
            <div className="stat__l">已听懂</div>
          </div>
        </div>
      </section>

      <section className="wrap">
        <div className="flow">
          {FLOW.map((f) => (
            <div className="flow__step" key={f.n}>
              <div className="flow__i">{f.n}</div>
              <h3 className="flow__t">{f.t}</h3>
              <p className="flow__d">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="wrap sect">
        <div className="sect__head">
          <h2 className="sect__h">{lang === 'ja' ? '日语材料' : '英语材料'}</h2>
          <Link to="/library" className="sect__more">
            全部素材 →
          </Link>
        </div>

        <div className="works">
          {list.map((w) => {
            const done = w.segments.filter((s) => progress.records[s.id]?.done).length;
            const pct = w.segments.length ? Math.round((done / w.segments.length) * 100) : 0;
            return (
              <Link className="work" to={`/study/${w.id}`} key={w.id}>
                <div className="work__head">
                  <div>
                    <div className="work__title">{w.title}</div>
                    {w.titleOrigin && (
                      <div className="work__origin" lang={w.lang}>
                        {w.titleOrigin}
                      </div>
                    )}
                  </div>
                  <span className="tag tag--accent">{w.lang === 'ja' ? '日本語' : 'English'}</span>
                </div>

                <p className="work__sum">{w.summary}</p>

                <div className="bar">
                  <div className="bar__fill" style={{ width: `${pct}%` }} />
                </div>

                <div className="work__meta">
                  <span className="tag tag--lv">等级 {levelRange(w.levels)}</span>
                  <span className="work__count">
                    {done} / {w.segments.length}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}
