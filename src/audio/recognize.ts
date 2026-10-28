/**
 * 语音识别：把用户说的话转成文字，再和原文比对。
 *
 * 这是「发音有没有问题」最接近的免费近似：识别器认不出来的词，
 * 通常发音真的有问题。但它给不了音素级的反馈 ——
 * 不会告诉你「th 发成了 s」或「长音不够长」，那需要
 * Azure Pronunciation Assessment 这类付费服务。
 *
 * 另外要注意：Chrome / Edge 的实现是把音频送到服务器处理的，
 * 不是本地跑。界面上必须写明这点，让用户自己决定。
 */

import type { Lang } from '../types';

/** 浏览器前缀差异，TS 的 lib.dom 里没有这些类型 */
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<
    ArrayLike<{ transcript: string; confidence: number }> & { isFinal: boolean }
  >;
}

function ctor(): SpeechRecognitionCtor | null {
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as
    | SpeechRecognitionCtor
    | null;
}

export function recognitionSupported(): boolean {
  return ctor() !== null;
}

const recogLang: Record<Lang, string> = { ja: 'ja-JP', en: 'en-US' };

export interface RecognizeHandle {
  stop: () => void;
}

export interface RecognizeCallbacks {
  /** 中间结果，用来给实时反馈 */
  onPartial?: (text: string) => void;
  /** 最终结果 */
  onFinal: (text: string, confidence: number) => void;
  onError: (message: string) => void;
}

/** 把错误码翻成人能看懂的话 */
function explain(code: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return '麦克风权限被拒绝了。浏览器地址栏右侧可以重新允许。';
    case 'no-speech':
      return '没听到声音。确认麦克风有在工作，再说一遍。';
    case 'audio-capture':
      return '找不到麦克风。检查一下设备连接。';
    case 'network':
      return '识别服务连不上 —— 这个功能需要联网。';
    case 'aborted':
      return '';
    default:
      return `识别出错：${code}`;
  }
}

/**
 * 开始识别一句话。说完会自动停。
 * 返回的 stop 可以提前中断。
 */
export function recognizeOnce(
  lang: Lang,
  cb: RecognizeCallbacks,
): RecognizeHandle {
  const C = ctor();
  if (!C) {
    cb.onError('这个浏览器不支持语音识别。Chrome 或 Edge 可以用。');
    return { stop: () => {} };
  }

  const r = new C();
  r.lang = recogLang[lang];
  r.continuous = false;
  r.interimResults = true;
  r.maxAlternatives = 1;

  let settled = false;

  r.onresult = (e) => {
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i];
      const alt = res[0];
      if (!alt) continue;
      if (res.isFinal) {
        settled = true;
        cb.onFinal(alt.transcript, alt.confidence ?? 0);
      } else {
        cb.onPartial?.(alt.transcript);
      }
    }
  };

  r.onerror = (e) => {
    const msg = explain(e.error);
    if (msg) cb.onError(msg);
  };

  r.onend = () => {
    // 有时候 onend 先到而没有 final，当成没识别到
    if (!settled) cb.onFinal('', 0);
  };

  try {
    r.start();
  } catch {
    cb.onError('启动识别失败，稍后再试。');
  }

  return {
    stop: () => {
      try {
        r.stop();
      } catch {
        /* 已经停了 */
      }
    },
  };
}
