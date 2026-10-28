/**
 * 逐字稿跟读
 *
 * 像歌词一样滚动：音频播到哪里，哪一行就高亮并滚到屏幕中间。
 * 跟读一整篇和一句一句抠不一样 —— 要的是连续的气口和节奏，
 * 所以这里不停、不切，只跟着往下走。
 *
 * 时间轴的真实情况：
 *   VOA 只给音频和纯文稿，不给字幕时间轴。所以这些文章的时间点
 *   是按字数估算的，朗读速度不均匀，偏差必然存在。
 *   界面上如实标出来，并且每一行都能点击跳转，自己修正几秒的误差。
 *   导入带时间轴的 SRT / VTT 才是精确对齐。
 */

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLang } from '../lang';
import { articlesByLang, findArticle, clock } from '../data/articles';
import { LEVEL_LABEL } from '../data';
import { alignArticle, clearAlignCache } from '../audio/align';
import { speakLines, type SpeakHandle } from '../audio/speakLines';
import { mediaUrl } from '../media';
import { useImported } from '../store/imported';
import ImportText from '../components/ImportText';
import type { Article, TranscriptLine } from '../types';

/** 跟读用的速度档，比精听更低 —— 跟不上就没法跟 */
const RATES = [0.6, 0.75, 0.9, 1] as const;

export default function ArticlePage() {
  const { lang } = useLang();
  const [id, setId] = useState<string | null>(null);
  const { list: mine, add, remove } = useImported();

  /** 自己导入的排在前面：刚导进来就想马上读 */
  const list = useMemo(
    () => [...mine.filter((a) => a.lang === lang), ...articlesByLang(lang)],
    [mine, lang],
  );

  const article = id
    ? mine.find((a) => a.id === id) ?? findArticle(id)
    : undefined;

  // 换语言回到列表
  useEffect(() => setId(null), [lang]);

  if (!article) {
    return (
      <PickArticle
        list={list}
        onPick={setId}
        lang={lang}
        onImport={(a) => {
          add(a);
          setId(a.id);
        }}
        onRemove={remove}
        mineIds={new Set(mine.map((a) => a.id))}
      />
    );
  }
  return <Reader article={article} onExit={() => setId(null)} />;
}

/* ---------- 逐字稿跟读 ---------- */

function Reader({ article, onExit }: { article: Article; onExit: () => void }) {
  const [playing, setPlaying] = useState(false);
  const [now, setNow] = useState(0);
  const [rate, setRate] = useState(1);
  /** 自动滚动。用户手动滚动时先关掉，否则两边抢着滚 */
  const [follow, setFollow] = useState(true);

  /**
   * 对齐后的逐字稿。估算的时间点误差能到几秒，
   * 所以提供「按停顿对齐」：解码音频找出真实停顿，把边界吸附过去。
   */
  const [aligned, setAligned] = useState<TranscriptLine[] | null>(null);
  const [aligning, setAligning] = useState(false);
  const [alignMsg, setAlignMsg] = useState<string | null>(null);

  /**
   * 语音合成念到第几句。
   *
   * 两条播放路径的同步方式是相反的：
   *   音频文件 —— 有真实时间轴，由 now 推算当前是第几句（时间点是估算的，会偏）
   *   语音合成 —— 没有时间轴，但每句念完有回调，直接给出第几句（精确）
   * 所以 TTS 的高亮不走 now，单独记一个下标。
   */
  const [ttsIndex, setTtsIndex] = useState(-1);
  const speakRef = useRef<SpeakHandle | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const activeRef = useRef<HTMLSpanElement | null>(null);
  /** 自己触发的滚动不该被当成用户滚动 */
  const selfScroll = useRef(false);

  /** 实际用的行：对齐过就用对齐后的 */
  const lines = aligned ?? article.lines;

  // 换文章时丢掉上一篇的对齐结果和朗读状态
  useEffect(() => {
    setAligned(null);
    setAlignMsg(null);
    setAligning(false);
    setTtsIndex(-1);
    setNow(0);
    speakRef.current?.stop();
    speakRef.current = null;
  }, [article.id]);

  // 离开页面时别让朗读继续在后台念
  useEffect(() => {
    return () => {
      speakRef.current?.stop();
      speakRef.current = null;
    };
  }, []);

  /**
   * 估算时间轴的文章，进来就自动对齐一次（有缓存就是瞬间的）。
   * TTS 文章没有音频文件可解码，跳过 —— 它的高亮本来就是精确的。
   */
  useEffect(() => {
    if (article.tts) return;
    if (article.timing !== 'estimated') return;
    // 没有音频地址就没有东西可解码
    const src = article.audio && mediaUrl(article.audio);
    if (!src) return;
    let cancelled = false;
    setAligning(true);
    alignArticle(article.id, src, article.lines, article.duration)
      .then((r) => {
        if (cancelled) return;
        setAligned(r.lines);
        setAlignMsg(
          r.pauses === 0
            ? '已按上次的对齐结果显示'
            : `找到 ${r.pauses} 处停顿，校正了 ${r.snapped} 行`,
        );
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setAlignMsg(e instanceof Error ? e.message : '对齐失败，仍用估算时间轴');
      })
      .finally(() => {
        if (!cancelled) setAligning(false);
      });
    return () => {
      cancelled = true;
    };
  }, [article.id, article.audio, article.duration, article.timing, article.lines]);

  /** 重新对齐：清掉缓存再算一遍 */
  const realign = useCallback(() => {
    const src = article.audio && mediaUrl(article.audio);
    if (!src) return;
    clearAlignCache(article.id);
    setAligned(null);
    setAligning(true);
    setAlignMsg(null);
    alignArticle(article.id, src, article.lines, article.duration)
      .then((r) => {
        setAligned(r.lines);
        setAlignMsg(`找到 ${r.pauses} 处停顿，校正了 ${r.snapped} 行`);
      })
      .catch((e: unknown) => {
        setAlignMsg(e instanceof Error ? e.message : '对齐失败');
      })
      .finally(() => setAligning(false));
  }, [article.id, article.audio, article.duration, article.lines]);

  /**
   * 当前读到第几句。两条路的来源完全不同：
   *
   *   语音合成：每念完一句有回调，直接就是第几句 —— 精确，没有偏差。
   *   音频文件：只有秒数，要按时间轴反推 —— 时间轴是估算的，所以会偏。
   *
   * 所以导入文本的跟读同步反而比 VOA 那些准。
   */
  const current = useMemo(() => {
    if (article.tts) return ttsIndex;

    let lo = 0;
    let hi = lines.length - 1;
    let found = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (lines[mid].start <= now) {
        found = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return found;
  }, [article.tts, ttsIndex, lines, now]);

  /**
   * 按段落号分组，用来排成文章的样子。
   * 没有段落号（早期导入的数据）时整篇当一段，不至于排版崩掉。
   */
  const paragraphs = useMemo(() => {
    const groups: { para: number; items: { line: TranscriptLine; i: number }[] }[] = [];
    lines.forEach((line, i) => {
      const para = line.para ?? 0;
      const last = groups[groups.length - 1];
      if (last && last.para === para) last.items.push({ line, i });
      else groups.push({ para, items: [{ line, i }] });
    });
    return groups;
  }, [lines]);

  // 跟随滚动：把当前句滚到稿子框的中间
  useEffect(() => {
    if (!follow || current < 0) return;
    const el = activeRef.current;
    const box = listRef.current;
    if (!el || !box) return;

    // 用 rect 相对量算，不用 offsetTop。
    //
    // offsetTop 是相对最近的「定位祖先」算的，而滚动容器没有 position，
    // 所以它量出来是相对更外层元素的距离 —— 容器自身滚过的部分没有被扣掉，
    // 结果就是越往后高亮越落在屏幕下方。而且现在句子是 <p> 里的行内 span，
    // 行内元素的 offsetTop 本身也不可靠。
    //
    // rect 是视口坐标，两个 rect 相减就是「这一句相对容器可视区的位置」，
    // 再加上当前 scrollTop 就是它在内容里的真实位置。
    const elRect = el.getBoundingClientRect();
    const boxRect = box.getBoundingClientRect();
    const elTopInContent = elRect.top - boxRect.top + box.scrollTop;
    const target = elTopInContent - box.clientHeight / 2 + elRect.height / 2;

    const max = box.scrollHeight - box.clientHeight;
    const next = Math.max(0, Math.min(target, max));
    if (Math.abs(next - box.scrollTop) < 2) return;

    selfScroll.current = true;
    box.scrollTo({ top: next, behavior: 'smooth' });
    // smooth 滚动要一会儿才停，期间别把它当成用户滚动
    const t = window.setTimeout(() => (selfScroll.current = false), 700);
    return () => window.clearTimeout(t);
  }, [current, follow]);

  /**
   * 从第几句开始朗读（TTS 路）。
   * 语音合成不能跳到任意秒，只能从某一句重新开始念。
   */
  const speakFrom = useCallback(
    (from: number, atRate?: number) => {
      speakRef.current?.stop();
      setTtsIndex(from);
      setPlaying(true);
      speakRef.current = speakLines({
        lines,
        lang: article.lang,
        // 改速度时 rate 这一帧还是旧值，所以允许显式传入
        rate: atRate ?? rate,
        from,
        onLine: (i) => setTtsIndex(i),
        onDone: () => {
          setPlaying(false);
          speakRef.current = null;
        },
      });
    },
    [lines, article.lang, rate],
  );

  const toggle = useCallback(() => {
    if (article.tts) {
      if (playing) {
        speakRef.current?.stop();
        speakRef.current = null;
        setPlaying(false);
      } else {
        // 停在哪句就从哪句接着念
        speakFrom(Math.max(0, ttsIndex));
      }
      return;
    }
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) void a.play();
    else a.pause();
  }, [article.tts, playing, ttsIndex, speakFrom]);

  /** 跳到某一句，并把跟随打开 —— 点了就是想从那里开始听 */
  const seekTo = useCallback(
    (line: TranscriptLine, index: number) => {
      setFollow(true);
      if (article.tts) {
        speakFrom(index);
        return;
      }
      const a = audioRef.current;
      if (!a) return;
      a.currentTime = line.start + 0.01;
      if (a.paused) void a.play();
    },
    [article.tts, speakFrom],
  );

  /** 重听当前这一句 */
  const replayLine = useCallback(() => {
    if (current < 0) return;
    seekTo(lines[current], current);
  }, [current, lines, seekTo]);

  /**
   * 前后跳。音频按秒，TTS 按句 ——
   * 语音合成没有时间轴，「退 5 秒」在它那里没有意义。
   */
  const skip = useCallback((sec: number) => {
    if (article.tts) {
      const step = sec < 0 ? -1 : 1;
      const to = Math.max(0, Math.min(lines.length - 1, Math.max(0, current) + step));
      speakFrom(to);
      return;
    }
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = Math.max(0, Math.min(a.duration || article.duration, a.currentTime + sec));
  }, [article.tts, article.duration, lines.length, current, speakFrom]);

  // 键盘：跟读时眼睛在稿子上，手只按这几个键
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA)$/.test(t.tagName)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        toggle();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        skip(-5);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        skip(5);
      } else if (e.key === 'r' || e.key === 'R') {
        replayLine();
      } else if (e.key === 'f' || e.key === 'F') {
        setFollow((v) => !v);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle, skip, replayLine]);

  /**
   * 进度条。
   * 音频路按秒算；TTS 路没有秒数，按「第几句 / 共几句」算 ——
   * 句子长度不均匀，所以这条进度不是严格的时间比例，但它是真的。
   */
  const pct = article.tts
    ? lines.length
      ? ((Math.max(0, current) + 1) / lines.length) * 100
      : 0
    : article.duration
      ? (now / article.duration) * 100
      : 0;

  return (
    <div className="wrap page">
      <button type="button" className="back" onClick={onExit}>
        ← 换一篇
      </button>

      <div className="sect__head">
        <div>
          <h2 className="sect__h">{article.title}</h2>
          <p className="work__origin">
            {article.level} {LEVEL_LABEL[article.level]} · {article.lines.length} 行 ·{' '}
            {clock(article.duration)}
          </p>
        </div>
      </div>

      {/*
        对齐状态如实说明：原始时间轴是按字数估算的，误差能到好几秒。
        停顿对齐能把边界吸到真实的句间静音上，但不是强制对齐，仍有偏差。
      */}
      {/*
        语音合成的文章单独说明：它的高亮是精确的（每句念完有回调），
        但没有时间轴，所以只能按句跳，不能拖秒数。
      */}
      {article.tts ? (
        <div className="align-note">
          <span className="align-note__ok">✓ 逐句精确高亮</span>
          <span className="align-note__tip">
            这篇用浏览器语音合成朗读。每句念完才走下一句，所以高亮和读音是严格对齐的；
            代价是不能拖进度，只能按句前后跳。
          </span>
        </div>
      ) : article.timing === 'estimated' && (
        <div className="align-note">
          {aligning ? (
            <span className="align-note__busy">正在分析音频里的停顿，校准时间轴…</span>
          ) : aligned ? (
            <>
              <span className="align-note__ok">✓ 已按音频停顿校准</span>
              <span className="align-note__tip">
                原始时间轴按字数估算，误差可达数秒；这里把每行起点吸附到了最近的真实停顿。
                仍有偏差时点任意一行跳过去。
              </span>
            </>
          ) : (
            <>
              <span className="align-note__warn">时间轴为估算</span>
              <span className="align-note__tip">
                {alignMsg ?? '来源只提供音频和纯文稿，没有字幕时间轴。'}
              </span>
              <button type="button" className="btn btn--mini" onClick={realign}>
                重新校准
              </button>
            </>
          )}
        </div>
      )}

      {/*
        音频本体：不用自带控件，自己做更贴合跟读。
        TTS 文章没有音频文件，连标签都不要渲染 ——
        src="" 会让浏览器去加载当前页面地址，然后报一个没必要的加载错误。
      */}
      {!article.tts && (
        <audio
          ref={audioRef}
          src={mediaUrl(article.audio ?? '')}
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onTimeUpdate={(e) => setNow(e.currentTarget.currentTime)}
          onEnded={() => setPlaying(false)}
        />
      )}

      <section className="reader" aria-label="逐字稿跟读">
        <div className="reader__bar">
          <button type="button" className="btn btn--solid" onClick={toggle}>
            {playing ? '■ 暂停（空格）' : '▶ 播放（空格）'}
          </button>
          {/* TTS 没有时间轴，前后跳的单位是句，按钮上就得这么写 */}
          <button type="button" className="btn" onClick={() => skip(-5)}>
            {article.tts ? '← 上一句' : '← 退 5 秒'}
          </button>
          <button type="button" className="btn" onClick={replayLine}>
            ↺ 重听这句（R）
          </button>
          <button type="button" className="btn" onClick={() => skip(5)}>
            {article.tts ? '下一句 →' : '进 5 秒 →'}
          </button>

          <div className="rates" role="group" aria-label="播放速度">
            {RATES.map((r) => (
              <button
                key={r}
                type="button"
                className={`rate ${rate === r ? 'is-on' : ''}`}
                aria-pressed={rate === r}
                onClick={() => {
                  setRate(r);
                  if (audioRef.current) audioRef.current.playbackRate = r;
                  // 语音合成的速度写在 utterance 上，已经排出去的那句改不了，
                  // 所以正在念的时候改速度要从这一句重念
                  if (article.tts && playing) speakFrom(Math.max(0, ttsIndex), r);
                }}
              >
                {r}×
              </button>
            ))}
          </div>

          <button
            type="button"
            className={`btn ${follow ? 'btn--on' : ''}`}
            aria-pressed={follow}
            onClick={() => setFollow((v) => !v)}
          >
            {follow ? '⇅ 跟随中（F）' : '⇅ 已停止跟随'}
          </button>

          {/*
            TTS 没有 currentTime，秒数永远是 0 —— 显示它等于显示一个假的进度。
            改成报句号，这个数是真的。
          */}
          <span className="reader__clock">
            {article.tts
              ? `第 ${Math.max(0, current) + 1} / ${lines.length} 句`
              : `${clock(now)} / ${clock(article.duration)}`}
          </span>
        </div>

        <div className="bar">
          <div className="bar__fill" style={{ width: `${pct}%` }} />
        </div>

        {/*
          文章流式排版：按原文段落分段，句子在段内连排。
          读到哪句高亮哪句，点任意一句跳过去。
          不做成一行一条的列表 —— 那是歌词样式，读整篇时眼睛要
          跟着文章走，不是跟着表格走。
        */}
        <div
          className="reader__doc"
          ref={listRef}
          onScroll={() => {
            // 用户自己滚动就停掉跟随，不然两边抢
            if (selfScroll.current) return;
            if (follow) setFollow(false);
          }}
        >
          {paragraphs.map((group) => (
            <p className="reader__para" key={group.para} lang={article.lang}>
              {group.items.map(({ line, i }, idx) => (
                <Fragment key={line.id}>
                  {/*
                    句与句之间要有间隔。相邻的 span 之间没有任何字符，
                    英文会连成「sunrise.He said」。
                    用真的空格文本节点，不用 margin —— 复制整段出去时
                    margin 不会变成空格，粘出来还是连着的。
                    日语不用空格分词，加了反而不像原文。
                  */}
                  {idx > 0 && article.lang !== 'ja' ? ' ' : null}
                  <span
                    role="button"
                    tabIndex={0}
                    ref={i === current ? activeRef : undefined}
                    className={`reader__sent ${i === current ? 'is-now' : ''} ${
                      i < current ? 'is-past' : ''
                    }`}
                    title={clock(line.start)}
                    onClick={() => seekTo(line, i)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        seekTo(line, i);
                      }
                    }}
                  >
                    {line.text}
                  </span>
                </Fragment>
              ))}
            </p>
          ))}
        </div>

        <div className="stage__foot">
          <span className="stage__tip">
            {article.tts
              ? '空格 播放 · ← → 上下一句 · R 重听这句 · F 开关跟随 · 点任意一句跳到那里'
              : '空格 播放 · ← → 退进 5 秒 · R 重听这句 · F 开关跟随 · 点任意一句跳到那里'}
          </span>
        </div>
      </section>

      <div className="src-note">
        <strong>来源与授权</strong>
        <br />
        {article.source}
        <br />
        {article.license}
        {/* TTS 的高亮是精确的，不要套用音频那套「估算」说明 */}
        {article.tts ? (
          <>
            <br />
            浏览器语音合成朗读，高亮逐句精确；文章只存在这台设备上。
          </>
        ) : (
          article.timing === 'estimated' && (
            <>
              <br />
              时间轴按字数比例估算，不是精确对齐 —— 偏了就点那一行跳过去。
            </>
          )
        )}
      </div>
    </div>
  );
}

/* ---------- 选一篇 ---------- */

function PickArticle({
  list,
  onPick,
  lang,
  onImport,
  onRemove,
  mineIds,
}: {
  list: Article[];
  onPick: (id: string) => void;
  lang: 'ja' | 'en';
  onImport: (a: Article) => void;
  onRemove: (id: string) => void;
  /** 哪些是自己导入的 —— 只有这些能删 */
  mineIds: Set<string>;
}) {
  return (
    <div className="wrap page">
      <header className="page__head">
        <p className="page__kicker">
          {lang === 'ja' ? '通しで、声に乗せて。' : 'Follow it all the way through.'}
        </p>
        <h1 className="page__title">影子跟读</h1>
        <p className="page__lead">
          读到哪里，哪一句就亮起来。影子跟读练的是滞后半拍一直跟着说，
          所以这里不停、不切 —— 跟不上就让它过去，下一句再接上。
        </p>
      </header>

      <ImportText lang={lang} onDone={onImport} />

      {list.length === 0 ? (
        <p className="empty">
          这个语言还没有材料。
          <br />
          上面「导入一篇文章」可以直接粘贴文字，不需要音频文件。
        </p>
      ) : (
        <div className="works">
          {list.map((a) => (
            <div className="work work--pick" key={a.id}>
              {/* 删除按钮不能套在卡片按钮里面 —— 嵌套 button 是无效 HTML */}
              {mineIds.has(a.id) && (
                <button
                  type="button"
                  className="work__del"
                  aria-label={`删除「${a.title}」`}
                  title="删除这篇导入的文章"
                  onClick={() => onRemove(a.id)}
                >
                  ×
                </button>
              )}

              <button type="button" className="work__open" onClick={() => onPick(a.id)}>
                <div className="work__head">
                  <div className="work__title">{a.title}</div>
                </div>

                {a.summary && <p className="work__sum">{a.summary}</p>}

                <div className="work__levels">
                  <span className="tag tag--lv">{a.level} {LEVEL_LABEL[a.level]}</span>
                  <span className="work__lessons">
                    {a.lines.length} 句 · {clock(a.duration)}
                  </span>
                </div>

                <div className="work__meta">
                  {mineIds.has(a.id) && <span className="tag tag--mine">自己导入</span>}
                  {a.tts ? (
                    <span className="tag">语音合成朗读 · 高亮精确</span>
                  ) : (
                    a.timing === 'estimated' && <span className="tag">时间轴为估算</span>
                  )}
                </div>
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="src-note">
        <strong>关于同步精度</strong>
        <br />
        标「时间轴为估算」的材料，来源只提供音频和纯文稿，没有字幕时间轴，
        所以行的时间点是按字数比例推算的 —— 朗读速度不均匀，偏差几秒是正常的。
        每一句都可以点击跳转，自己对齐。
        <br />
        自己导入的纯文本走语音合成，没有音频文件也就不需要对时间轴：
        每句念完才走下一句，高亮是精确的。代价是不能拖进度，只能按句跳。
      </div>
    </div>
  );
}
