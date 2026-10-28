/**
 * 听写练习
 *
 * 参考 dailydictation 的做法：先选一套材料，再逐句听写做完，
 * 而不是把所有句子混成一个池子随机给。听写要的是「做完一课」
 * 的完成感，和能回头看自己哪几句一直写错。
 *
 * 键盘全程可用：播放、重播、提交、下一句都不用碰鼠标，
 * 因为听写时手一直在键盘上。
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLang } from '../lang';
import { worksByLang, LEVEL_LABEL, levelRange } from '../data';
import type { Segment, Work } from '../types';
import { playSegment, stopAll } from '../audio/player';
import { parseFurigana } from '../utils/furigana';
import { compare } from '../audio/diff';
import { useProgress } from '../store/progress';

const RATES = [0.75, 1, 1.25] as const;

/** 听写算过关的正确率门槛 */
const PASS = 80;

export default function Dictation() {
  const { lang } = useLang();
  const [workId, setWorkId] = useState<string | null>(null);

  const works = useMemo(() => worksByLang(lang), [lang]);
  const work = works.find((w) => w.id === workId);

  // 换语言时回到选材料
  useEffect(() => setWorkId(null), [lang]);

  if (!work) {
    return <PickWork works={works} onPick={setWorkId} lang={lang} />;
  }

  return <Session work={work} onExit={() => setWorkId(null)} />;
}

/* ---------- 第一步：选一套材料 ---------- */

function PickWork({
  works,
  onPick,
  lang,
}: {
  works: Work[];
  onPick: (id: string) => void;
  lang: 'ja' | 'en';
}) {
  const { progress } = useProgress();

  // 每套材料已经写对过几句
  const doneCount = (w: Work) =>
    w.segments.filter((s) =>
      progress.dictation.some((d) => d.segmentId === s.id && d.accuracy >= PASS),
    ).length;

  return (
    <div className="wrap page">
      <header className="page__head">
        <p className="page__kicker">
          {lang === 'ja' ? '聴こえたことばを、自分の手で。' : 'Write what you hear.'}
        </p>
        <h1 className="page__title">听写练习</h1>
        <p className="page__lead">
          选一套材料，一句一句写下来。写完能看到哪个音没听出来 ——
          听写是把「大概听懂」变成「真的听清」最快的办法。
        </p>
      </header>

      <div className="works">
        {works.map((w) => {
          const done = doneCount(w);
          const pct = w.segments.length
            ? Math.round((done / w.segments.length) * 100)
            : 0;
          return (
            <button
              type="button"
              className="work"
              key={w.id}
              onClick={() => onPick(w.id)}
              style={{ textAlign: 'left', cursor: 'pointer' }}
            >
              <div className="work__head">
                <div>
                  <div className="work__title">{w.title}</div>
                  {w.titleOrigin && (
                    <div className="work__origin" lang={w.lang}>
                      {w.titleOrigin}
                    </div>
                  )}
                </div>
              </div>

              {w.summary && <p className="work__sum">{w.summary}</p>}

              <div className="work__levels">
                <span className="tag tag--lv">等级 {levelRange(w.levels)}</span>
                <span className="work__lessons">{w.segments.length} 句</span>
              </div>

              <div className="bar">
                <div className="bar__fill" style={{ width: `${pct}%` }} />
              </div>

              <div className="work__meta">
                <span className="work__count">
                  写对 {done} / {w.segments.length}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- 第二步：逐句听写 ---------- */

function Session({ work, onExit }: { work: Work; onExit: () => void }) {
  const { progress, logDictation } = useProgress();
  const [i, setI] = useState(0);
  const [answer, setAnswer] = useState('');
  const [checked, setChecked] = useState(false);
  const [rate, setRate] = useState<number>(1);
  const [playing, setPlaying] = useState(false);
  const [hint, setHint] = useState(false);
  const [plays, setPlays] = useState(0);
  const stopRef = useRef<(() => void) | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const lang = work.lang;
  const seg: Segment | undefined = work.segments[i];

  const play = useCallback(() => {
    if (!seg) return;
    stopRef.current?.();
    setPlaying(true);
    setPlays((n) => n + 1);
    stopRef.current = playSegment(seg, lang, rate, () => setPlaying(false));
  }, [seg, lang, rate]);

  // 换句子就自动放一遍，省一次按键
  useEffect(() => {
    setAnswer('');
    setChecked(false);
    setHint(false);
    setPlays(0);
    const t = window.setTimeout(() => {
      play();
      inputRef.current?.focus();
    }, 150);
    return () => window.clearTimeout(t);
    // play 依赖 rate，但换速度不该重新触发自动播放
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seg?.id]);

  useEffect(() => () => stopAll(), []);

  const result = useMemo(
    () => (checked && seg ? compare(answer, seg.text, lang) : null),
    [checked, answer, seg, lang],
  );

  const submit = useCallback(() => {
    if (!seg || !answer.trim() || checked) return;
    const r = compare(answer, seg.text, lang);
    setChecked(true);
    stopAll();
    setPlaying(false);
    logDictation(seg.id, r.accuracy);
  }, [seg, answer, checked, lang, logDictation]);

  const go = useCallback(
    (delta: number) => {
      stopAll();
      setPlaying(false);
      setI((v) => Math.min(Math.max(v + delta, 0), work.segments.length - 1));
    },
    [work.segments.length],
  );

  const retry = useCallback(() => {
    setChecked(false);
    setAnswer('');
    play();
    inputRef.current?.focus();
  }, [play]);

  // 快捷键：听写时手在键盘上，不该为了重播去点鼠标
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Tab 重播：输入框里也要能用，所以不跳过 textarea
      if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        play();
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (checked) go(1);
        else submit();
        return;
      }
      if (e.key === 'Escape') {
        stopAll();
        setPlaying(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [play, submit, checked, go]);

  if (!seg) {
    return (
      <div className="wrap page">
        <p className="empty">这套材料里没有句子。</p>
      </div>
    );
  }

  const passed = work.segments.filter((s) =>
    progress.dictation.some((d) => d.segmentId === s.id && d.accuracy >= PASS),
  ).length;
  const pct = Math.round((passed / work.segments.length) * 100);

  return (
    <div className="wrap page">
      <button type="button" className="back" onClick={onExit}>
        ← 换一套材料
      </button>

      <div className="sect__head">
        <div>
          <h2 className="sect__h">{work.title}</h2>
          {work.titleOrigin && (
            <p className="work__origin" lang={lang}>
              {work.titleOrigin}
            </p>
          )}
        </div>
        <span className="sect__more">
          写对 {passed} / {work.segments.length} 句（{pct}%）
        </span>
      </div>

      <div className="bar">
        <div className="bar__fill" style={{ width: `${pct}%` }} />
      </div>

      <section className="stage" aria-label="听写台">
        <div className="stage__bar">
          <span className="stage__pos">
            {i + 1} / {work.segments.length}
          </span>
          <span className="tag">{LEVEL_LABEL[seg.level]}</span>
          {plays > 0 && <span className="tag">听了 {plays} 遍</span>}
          <div className="stage__bar-right">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => go(-1)}
              disabled={i === 0}
            >
              ← 上一句
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => go(1)}
              disabled={i === work.segments.length - 1}
            >
              下一句 →
            </button>
          </div>
        </div>

        <div className={`blind ${playing ? 'is-playing' : ''}`} aria-hidden="true">
          {Array.from({ length: 24 }).map((_, k) => (
            <span
              className="blind__bar"
              key={k}
              style={{ animationDelay: `${(k % 12) * 0.08}s` }}
            />
          ))}
        </div>

        <div className="controls" style={{ borderTop: 0, marginTop: 0, paddingTop: 0 }}>
          <button type="button" className="btn btn--solid" onClick={play}>
            {playing ? '◼ 正在播放' : '▶ 再听一遍（Tab）'}
          </button>
          <div className="rates" role="group" aria-label="播放速度">
            {RATES.map((r) => (
              <button
                key={r}
                type="button"
                className={`rate ${rate === r ? 'is-on' : ''}`}
                aria-pressed={rate === r}
                onClick={() => setRate(r)}
              >
                {r}×
              </button>
            ))}
          </div>
          {!checked && (
            <button type="button" className="btn" onClick={() => setHint((v) => !v)}>
              {hint ? '收起提示' : '给点提示'}
            </button>
          )}
        </div>

        {hint && !checked && (
          <div className="note">
            <strong>中文意思：</strong>
            {seg.zh}
            <br />
            <strong>长度：</strong>
            {lang === 'ja'
              ? `${[...seg.text].length} 个字`
              : `${seg.text.split(/\s+/).length} 个词`}
          </div>
        )}

        {!checked ? (
          <div style={{ marginTop: 22 }}>
            <label className="sr" htmlFor="dict-input">
              把听到的句子写下来
            </label>
            <textarea
              id="dict-input"
              ref={inputRef}
              className="dict__input tgt"
              lang={lang}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder={
                lang === 'ja' ? '聞こえたとおりに書いてみる…' : 'Type what you heard…'
              }
            />
            <div className="stage__foot">
              <span className="stage__tip">
                Tab 重播 · Enter 提交 · Shift+Enter 换行
              </span>
              <button
                type="button"
                className="btn btn--solid"
                onClick={submit}
                disabled={!answer.trim()}
              >
                对一下答案
              </button>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 22 }}>
            <p className="score">
              正确率 {result?.accuracy}%
              {(result?.accuracy ?? 0) >= PASS ? ' · 这句过了' : ' · 再练一遍'} ·{' '}
              <span className="ok-txt">绿色听对</span> ·{' '}
              <span className="bad-txt">波浪线写错</span> ·{' '}
              <span className="miss-txt">灰色漏听</span>
            </p>

            <p className="diff tgt" lang={lang}>
              {result?.parts.map((p, k) => (
                <i className={p.mark} key={k}>
                  {p.text}
                  {lang === 'en' ? ' ' : ''}
                </i>
              ))}
            </p>

            <div className="note">
              <strong>原文：</strong>
              <span className="tgt" lang={lang}>
                {seg.text}
              </span>
              {seg.reading && seg.reading !== seg.text && (
                <>
                  <br />
                  <strong>读音：</strong>
                  {parseFurigana(seg.reading)}
                </>
              )}
              <br />
              <strong>中文：</strong>
              {seg.zh}
              {seg.note && (
                <>
                  <br />
                  <strong>讲解：</strong>
                  {seg.note}
                </>
              )}
            </div>

            <div className="stage__foot">
              <button type="button" className="btn" onClick={retry}>
                ↺ 再听一遍，重写
              </button>
              <button
                type="button"
                className="btn btn--solid"
                onClick={() => go(1)}
                disabled={i === work.segments.length - 1}
              >
                下一句 →（Enter）
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
