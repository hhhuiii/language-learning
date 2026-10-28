/**
 * 播放引擎。
 * 优先播放真实音频（支持整段音频 + 时间轴切片）；
 * 没有音频文件时回退到浏览器语音合成。
 */

import type { Lang, Segment } from '../types';
import { mediaUrl } from '../media';

type StopFn = () => void;

let activeAudio: HTMLAudioElement | null = null;
let activeTimer: number | null = null;

/**
 * 预生成的 Edge 神经语音 MP3 清单。
 * 文件名就是片段 id，所以数据文件不需要写 audio 字段。
 * 清单还没加载完（或某句没生成）时回退到浏览器语音合成，不会没声音。
 */
let ttsIndex: Record<Lang, Set<string>> | null = null;

export async function loadTtsManifest(): Promise<void> {
  if (ttsIndex) return;
  try {
    const res = await fetch(mediaUrl('/media/tts/manifest.json'));
    if (!res.ok) throw new Error(String(res.status));
    const raw = (await res.json()) as Partial<Record<Lang, string[]>>;
    ttsIndex = {
      ja: new Set(raw.ja ?? []),
      en: new Set(raw.en ?? []),
    };
  } catch {
    // 没有清单就全部走语音合成
    ttsIndex = { ja: new Set(), en: new Set() };
  }
}

/** 这个片段有没有预生成的 MP3 */
function ttsUrl(segment: Segment, lang: Lang): string | null {
  if (!ttsIndex?.[lang].has(segment.id)) return null;
  return mediaUrl(`/media/tts/${lang}/${encodeURIComponent(segment.id)}.mp3`);
}

export function stopAll() {
  if (activeTimer !== null) {
    window.clearTimeout(activeTimer);
    activeTimer = null;
  }
  if (activeAudio) {
    activeAudio.pause();
    activeAudio = null;
  }
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

/** 语音合成的发音语言 */
const voiceLang: Record<Lang, string> = { ja: 'ja-JP', en: 'en-US' };

/**
 * 挑发音最自然的那个语音。
 *
 * 系统里新旧语音混在同一个列表里：Windows 既有老的 SAPI 语音
 * （Haruka、Zira，机器音很重），也有神经语音（Nanami Natural、
 * Aria Online）；macOS 的 Kyoko/Samantha 有普通版和加强版。
 * 直接取第一个匹配项，很可能拿到最差的那个，所以按关键词打分。
 */
const GOOD_VOICE = /(natural|neural|online|enhanced|premium|siri)/i;
const POOR_VOICE = /(espeak|compact|pico|festival)/i;

function voiceScore(v: SpeechSynthesisVoice, want: string): number {
  let score = 0;
  // 语言完全匹配优先于只匹配语种（ja-JP 优于 ja）
  if (v.lang.replace('_', '-') === want) score += 10;
  if (GOOD_VOICE.test(v.name)) score += 8;
  if (POOR_VOICE.test(v.name)) score -= 8;
  // 本地语音不依赖网络，响应更快
  if (v.localService) score += 1;
  return score;
}

function pickVoice(lang: Lang): SpeechSynthesisVoice | undefined {
  const want = voiceLang[lang];
  const prefix = want.slice(0, 2);
  const usable = window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.replace('_', '-').startsWith(prefix));

  if (usable.length === 0) return undefined;
  return usable.reduce((best, v) =>
    voiceScore(v, want) > voiceScore(best, want) ? v : best,
  );
}

/** 浏览器语音列表是异步加载的，先预热一次 */
export function warmUpVoices() {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.getVoices();
}

function speak(segment: Segment, lang: Lang, rate: number, onEnd: () => void): StopFn {
  if (!('speechSynthesis' in window)) {
    onEnd();
    return () => {};
  }
  const u = new SpeechSynthesisUtterance(segment.text);
  u.lang = voiceLang[lang];
  const v = pickVoice(lang);
  if (v) u.voice = v;
  u.rate = rate;
  u.onend = onEnd;
  u.onerror = onEnd;
  window.speechSynthesis.speak(u);
  return () => window.speechSynthesis.cancel();
}

function playClip(
  segment: Segment,
  rate: number,
  onEnd: () => void,
  onError: () => void,
): StopFn {
  // 数据里写的是 /media/... 这种根路径，部署到子目录时要套上前缀
  const el = new Audio(mediaUrl(segment.audio ?? ''));
  activeAudio = el;
  el.playbackRate = rate;

  const hasRange = typeof segment.clipStart === 'number' && typeof segment.clipEnd === 'number';
  if (hasRange) el.currentTime = segment.clipStart!;

  const finish = () => {
    if (activeAudio === el) activeAudio = null;
    onEnd();
  };

  if (hasRange) {
    // 到切片终点就停，不等整段音频播完
    const check = () => {
      if (el.currentTime >= segment.clipEnd!) {
        el.pause();
        finish();
      }
    };
    el.addEventListener('timeupdate', check);
  }

  el.onended = finish;
  el.onerror = () => {
    if (activeAudio === el) activeAudio = null;
    onError();
  };
  void el.play().catch(onError);

  return () => {
    el.pause();
    if (activeAudio === el) activeAudio = null;
  };
}

/**
 * 播放一个片段。返回停止函数。
 * 音频加载失败时自动降级到语音合成，不让用户卡住。
 */
export function playSegment(
  segment: Segment,
  lang: Lang,
  rate: number,
  onEnd: () => void = () => {},
): StopFn {
  stopAll();

  // 优先用素材自带的真实录音；没有就用预生成的 Edge 神经语音 MP3
  const url = segment.audio ?? ttsUrl(segment, lang);
  if (!url) return speak(segment, lang, rate, onEnd);

  // 预生成的 MP3 是整句一个文件，没有时间轴切片
  const clip: Segment = segment.audio ? segment : { ...segment, audio: url };

  // 音频可能加载失败（文件缺失、格式不支持），这时改用语音合成。
  // 用一个可变的 holder 持有“当前真正在播的东西”的停止函数，
  // 这样调用方拿到的 stop 在降级发生后依然有效。
  let cancelled = false;
  const holder: { stop: StopFn } = { stop: () => {} };

  holder.stop = playClip(clip, rate, onEnd, () => {
    if (cancelled) return;
    holder.stop = speak(segment, lang, rate, onEnd);
  });

  return () => {
    cancelled = true;
    holder.stop();
  };
}
