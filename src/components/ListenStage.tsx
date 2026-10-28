/**
 * 四步精听台
 *   01 盲听      只有声音，先自己听
 *   02 日语/英语字幕  只看目标语，核对自己听到的
 *   03 双语讲解   中文翻译 + 词语用法
 *   04 再次盲听   回到纯声音，确认真的听懂了
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Lang, Segment } from '../types';
import { playSegment, stopAll } from '../audio/player';
import { Highlight } from './Highlight';
import { parseFurigana } from '../utils/furigana';
import { LEVEL_LABEL } from '../data';

const RATES = [0.75, 1, 1.25] as const;

export interface StepDef {
  n: string;
  title: string;
  hint: string;
}

function steps(lang: Lang): StepDef[] {
  const subtitle = lang === 'ja' ? '日语字幕' : '英语字幕';
  return [
    { n: '01', title: '盲听', hint: '这次，只听声音。听不懂也先别看字幕，让耳朵自己去抓。' },
    { n: '02', title: subtitle, hint: '只看原文，核对刚才听到的和写在纸上的是否一致。' },
    { n: '03', title: '双语讲解', hint: '对照中文与用法说明，弄清每个词为什么出现在这里。' },
    { n: '04', title: '再次盲听', hint: '回到纯声音。能跟上节奏、听懂意思，这一句就过了。' },
  ];
}

export default function ListenStage({
  segment,
  lang,
  index,
  total,
  marked,
  onComplete,
  onToggleMark,
  onPrev,
  onNext,
}: {
  segment: Segment;
  lang: Lang;
  index: number;
  total: number;
  marked: boolean;
  onComplete: () => void;
  onToggleMark: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const [step, setStep] = useState(0);
  const [rate, setRate] = useState<number>(1);
  const [playing, setPlaying] = useState(false);
  const [reveal, setReveal] = useState(false);
  const stopRef = useRef<(() => void) | null>(null);
  const defs = steps(lang);

  // 换句子就回到第一步
  useEffect(() => {
    setStep(0);
    setReveal(false);
    stopAll();
    setPlaying(false);
  }, [segment.id]);

  useEffect(() => () => stopAll(), []);

  const play = useCallback(() => {
    stopRef.current?.();
    setPlaying(true);
    stopRef.current = playSegment(segment, lang, rate, () => setPlaying(false));
  }, [segment, lang, rate]);

  const stop = useCallback(() => {
    stopRef.current?.();
    stopAll();
    setPlaying(false);
  }, []);

  const blind = step === 0 || step === 3;
  const showTarget = step === 1 || step === 2 || (blind && reveal);
  const showZh = step === 2;

  // 键盘快捷键：空格播放，D 显示/隐藏字幕，方向键切步骤
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA)$/.test(t.tagName)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        playing ? stop() : play();
      } else if (e.key === 'd' || e.key === 'D') {
        if (blind) setReveal((v) => !v);
      } else if (e.key === 'ArrowRight' && step < 3) {
        setStep((s) => s + 1);
      } else if (e.key === 'ArrowLeft' && step > 0) {
        setStep((s) => s - 1);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [playing, play, stop, blind, step]);

  return (
    <section className="stage" aria-label="精听台">
      <div className="stage__bar">
        <span className="stage__pos">
          {index + 1} / {total}
        </span>
        <span className="tag">{LEVEL_LABEL[segment.level]}</span>
        <div className="stage__bar-right">
          <button type="button" className="btn btn--ghost" onClick={onPrev} disabled={!onPrev}>
            ← 上一句
          </button>
          <button type="button" className="btn btn--ghost" onClick={onNext} disabled={!onNext}>
            下一句 →
          </button>
        </div>
      </div>

      <div className="steps" role="tablist" aria-label="精听步骤">
        {defs.map((d, i) => (
          <button
            key={d.n}
            type="button"
            role="tab"
            className="step"
            aria-current={i === step ? 'step' : undefined}
            aria-selected={i === step}
            onClick={() => setStep(i)}
          >
            <span className="step__n">{d.n}</span>
            <span className="step__t">{d.title}</span>
          </button>
        ))}
      </div>

      <p className="stage__hint">{defs[step].hint}</p>

      {blind && (
        <div className={`blind ${playing ? 'is-playing' : ''}`} aria-hidden="true">
          {Array.from({ length: 24 }).map((_, i) => (
            <span
              className="blind__bar"
              key={i}
              style={{ animationDelay: `${(i % 12) * 0.08}s` }}
            />
          ))}
        </div>
      )}

      <div className="line">
        {segment.speaker && <p className="line__speaker">{segment.speaker}</p>}

        {showTarget ? (
          <>
            <p className="line__text tgt" lang={lang}>
              <Highlight text={segment.text} keywords={segment.keywords} />
            </p>
            {segment.reading && <p className="line__reading">{parseFurigana(segment.reading)}</p>}
          </>
        ) : (
          <p className="line__masked" aria-label="字幕已隐藏">
            ····· 字幕已隐藏 ·····
          </p>
        )}

        {showZh && <p className="line__zh">{segment.zh}</p>}
      </div>

      <div className="controls">
        <button type="button" className="btn btn--solid" onClick={playing ? stop : play}>
          {playing ? '■ 停止' : '▶ 播放片段'}
        </button>
        <button type="button" className="btn" onClick={play}>
          ↺ 重播
        </button>
        {blind && (
          <button type="button" className="btn" onClick={() => setReveal((v) => !v)}>
            {reveal ? '隐藏字幕（D）' : '看一眼字幕（D）'}
          </button>
        )}
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
      </div>

      {step === 2 && (
        <>
          {segment.note && <div className="note">{segment.note}</div>}
          {segment.keywords && segment.keywords.length > 0 && (
            <div className="kws">
              <h3 className="kws__h">词语与用法</h3>
              {segment.keywords.map((k) => (
                <div className="kw-card" key={k.term}>
                  <div className="kw-card__top">
                    <span className="kw-card__term tgt" lang={lang}>
                      {k.term}
                    </span>
                    {k.reading && <span className="kw-card__reading">{k.reading}</span>}
                    {k.level && <span className="tag">{k.level}</span>}
                  </div>
                  <p className="kw-card__zh">{k.zh}</p>
                  {k.note && <p className="kw-card__note">{k.note}</p>}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <div className="stage__foot">
        <button
          type="button"
          className={`btn ${marked ? 'btn--on' : ''}`}
          onClick={onToggleMark}
          aria-pressed={marked}
        >
          {marked ? '✓ 已在生词本' : '＋ 加入生词本'}
        </button>

        {step < 3 ? (
          <button type="button" className="btn btn--solid" onClick={() => setStep(step + 1)}>
            下一步：{defs[step + 1].title} →
          </button>
        ) : (
          <button
            type="button"
            className="btn btn--solid"
            onClick={() => {
              onComplete();
              onNext?.();
            }}
          >
            听懂了，记录本次学习
          </button>
        )}
      </div>
    </section>
  );
}
