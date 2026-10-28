/**
 * 按句朗读一篇文章，用浏览器语音合成。
 *
 * 为什么单独写一套，不复用 <audio> 那条路：
 *   自己导入的纯文本没有音频文件。语音合成和音频文件的同步方式
 *   完全相反 ——
 *
 *   音频文件：有真实时间轴，但逐字稿的时间点是估算的，高亮会偏。
 *   语音合成：没有时间轴，不能跳到任意秒，但每句念完会回调，
 *             所以高亮跟着回调走，是精确的，不存在偏差。
 *
 *   换句话说，导入文本的跟读同步比 VOA 那些估算时间轴的还准。
 *
 * 代价是不能随意拖进度，只能按句跳 —— 对跟读来说够用。
 */

import type { Lang } from '../types';

const voiceLang: Record<Lang, string> = { ja: 'ja-JP', en: 'en-US' };

/**
 * 挑发音最自然的语音。
 * Windows 上神经语音（Natural）和老的 SAPI 语音混在同一个列表里，
 * 不打分的话很可能选中老的那个，白装了好语音。
 */
function pickVoice(lang: Lang): SpeechSynthesisVoice | undefined {
  const want = voiceLang[lang];
  const base = want.slice(0, 2);
  const all = window.speechSynthesis.getVoices();

  const candidates = all.filter((v) => {
    const l = v.lang.replace('_', '-');
    return l === want || l.startsWith(base);
  });
  if (candidates.length === 0) return undefined;

  const score = (v: SpeechSynthesisVoice) => {
    const n = v.name.toLowerCase();
    let s = 0;
    if (/natural|neural/.test(n)) s += 100;
    if (/online/.test(n)) s += 40;
    if (v.lang.replace('_', '-') === want) s += 10;
    if (/compact|espeak/.test(n)) s -= 50;
    return s;
  };

  return [...candidates].sort((a, b) => score(b) - score(a))[0];
}

export interface SpeakHandle {
  /** 停止朗读。已经排队的句子一并取消 */
  stop: () => void;
  /** 当前念到第几句（从 0 开始） */
  index: () => number;
}

export interface SpeakOptions {
  lines: { text: string }[];
  lang: Lang;
  rate: number;
  /** 从第几句开始念 */
  from?: number;
  /** 每念到一句时回调，用来驱动高亮 */
  onLine: (index: number) => void;
  /** 整篇念完 */
  onDone: () => void;
}

/**
 * 逐句朗读。
 *
 * 一句一个 utterance、念完再排下一句，而不是一次性全部 queue 进去：
 *   1. 中途要能改速度和停止，全排进去就改不动了
 *   2. 长文一次排几百个 utterance，部分浏览器会丢句
 */
export function speakLines(opts: SpeakOptions): SpeakHandle {
  if (!('speechSynthesis' in window)) {
    opts.onDone();
    return { stop: () => {}, index: () => -1 };
  }

  const synth = window.speechSynthesis;
  const voice = pickVoice(opts.lang);
  let i = Math.max(0, opts.from ?? 0);
  let cancelled = false;
  /** 同一句被打断后重试了几次，防止无限原地重试 */
  let retries = 0;

  const sayNext = () => {
    if (cancelled) return;
    if (i >= opts.lines.length) {
      opts.onDone();
      return;
    }

    const text = opts.lines[i].text;
    opts.onLine(i);

    const u = new SpeechSynthesisUtterance(text);
    u.lang = voiceLang[opts.lang];
    if (voice) u.voice = voice;
    u.rate = opts.rate;

    const advance = () => {
      if (cancelled) return;
      i++;
      retries = 0;
      // 留一小口气，否则句子连得太紧跟不上
      window.setTimeout(sayNext, 120);
    };

    u.onend = advance;

    u.onerror = (e) => {
      if (cancelled) return;

      // canceled / interrupted 不是「这句念不出来」，是被打断了。
      //
      // 典型来路：点句子跳转时先 stop() 再新建一轮，而 cancel() 是异步的，
      // 它有可能晚到一步，正好打掉刚排进去的这一句。
      // 当成失败往下走的话，这句会被跳过且一声不发 —— 表现就是高亮
      // 自己往前蹿了好几句。所以原地重试，不推进下标。
      if ((e.error === 'canceled' || e.error === 'interrupted') && retries < 2) {
        retries++;
        window.setTimeout(sayNext, 180);
        return;
      }

      // 其他错误（这个音色念不了等）才往下走，不然卡死在一句上
      advance();
    };

    synth.speak(u);
  };

  // 先把上一段残留清掉
  synth.cancel();

  // 等队列真的空了再开口。
  // cancel() 是异步的，紧跟着 speak() 排进去的那句可能被这次 cancel
  // 一起带走；固定延时赌不准，所以轮询到不再 speaking 为止。
  let waited = 0;
  const begin = () => {
    if (cancelled) return;
    if ((synth.speaking || synth.pending) && waited < 900) {
      waited += 60;
      window.setTimeout(begin, 60);
      return;
    }
    sayNext();
  };
  window.setTimeout(begin, 60);

  return {
    stop: () => {
      cancelled = true;
      synth.cancel();
    },
    index: () => i,
  };
}
