import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Lang } from './types';

const KEY = 'bl.lang';

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
}

const LangCtx = createContext<Ctx>({ lang: 'ja', setLang: () => {} });

function read(): Lang {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'ja' || v === 'en') return v;
  } catch {
    /* localStorage 不可用时用默认值 */
  }
  return 'ja';
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(read);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, lang);
    } catch {
      /* ignore */
    }
    // 整站主题色随语言切换：日语朱色，英语藍色
    document.documentElement.setAttribute('data-lang', lang);
  }, [lang]);

  return (
    <LangCtx.Provider value={{ lang, setLang: setLangState }}>
      {children}
    </LangCtx.Provider>
  );
}

export function useLang() {
  return useContext(LangCtx);
}

/** 界面文案：中文为主，少量目标语点缀 */
export const UI = {
  ja: {
    kicker: 'INTENSIVE LISTENING',
    heroTitle: '听得懂的日语，\n从一句原声开始。',
    heroLead:
      '盲听、原文、双语讲解、再次盲听。四步走完一句，词语就留在耳朵里，不只是记在纸上。',
    tagline: '日本語を、耳から。',
    segUnit: '个片段',
  },
  en: {
    kicker: 'INTENSIVE LISTENING',
    heroTitle: 'Real English,\none line at a time.',
    heroLead:
      '盲听、原文、双语讲解、再次盲听。四步走完一句，把听不清的音节真正听清，而不是靠猜。',
    tagline: 'Listen close. Hear it all.',
    segUnit: '个片段',
  },
} satisfies Record<Lang, Record<string, string>>;
