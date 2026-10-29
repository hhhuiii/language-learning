/**
 * 网页里直接导入纯文本，一键变成跟读材料。
 *
 * 只要一段带段落结构的文字就够了 —— 空行分段，程序自己切句、
 * 分配段落号、排好时间点。不需要音频文件：播放走浏览器语音合成，
 * 而语音合成每句念完会回调，所以高亮是精确的，比估算时间轴还准。
 *
 * 导入结果存 localStorage，刷新还在。
 */

import { useEffect, useMemo, useState } from 'react';
import { buildFromText, splitParagraphs, splitSentences } from '../store/imported';
import { LEVELS, LEVEL_LABEL } from '../data';
import type { Article, Lang, Level } from '../types';

export default function ImportText({
  lang,
  onDone,
}: {
  lang: Lang;
  onDone: (a: Article) => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [level, setLevel] = useState<Level>(lang === 'ja' ? 'N3' : 'B1');
  const [err, setErr] = useState<string | null>(null);

  /*
   * 切换语言时把难度拨回这门语言的默认档。
   *
   * useState 的初始值只在挂载时算一次：在英语下开过表单（level = 'B1'），
   * 再切到日语，level 还是 'B1' —— 而日语的档位是 N5…N1，
   * 于是一个都不高亮，看起来像"没有默认难度"。
   * 真导进去的话 level 也会是对不上的那个。
   */
  useEffect(() => {
    setLevel(lang === 'ja' ? 'N3' : 'B1');
  }, [lang]);

  /** 实时预览：让人在导入前就看到会被切成几段几句 */
  const preview = useMemo(() => {
    const paras = splitParagraphs(text);
    const sents = paras.reduce((n, p) => n + splitSentences(p, lang).length, 0);
    return { paras: paras.length, sents };
  }, [text, lang]);

  /** 读本地 .txt 文件，省得手动复制粘贴 */
  async function pickFile(file: File) {
    try {
      const raw = await file.text();
      setText(raw);
      if (!title.trim()) {
        setTitle(file.name.replace(/\.[^.]+$/, ''));
      }
      setErr(null);
    } catch {
      setErr('读不出这个文件，换成直接粘贴文字试试。');
    }
  }

  function submit() {
    if (preview.sents === 0) {
      setErr('没解析出句子。确认文本里有内容，段落之间用空行隔开。');
      return;
    }
    const article = buildFromText({ title, lang, level, text });
    // 清空表单，方便接着导下一篇
    setTitle('');
    setText('');
    setErr(null);
    setOpen(false);
    onDone(article);
  }

  if (!open) {
    return (
      <div className="import-bar">
        <button type="button" className="btn btn--solid" onClick={() => setOpen(true)}>
          ＋ 导入一篇文章
        </button>
        <span className="import-bar__tip">
          粘贴一段带段落的文字就行，程序自己切句、排时间。不需要音频文件。
        </span>
      </div>
    );
  }

  return (
    <section className="import" aria-label="导入文章">
      <div className="import__head">
        <h3 className="import__title">导入一篇文章</h3>
        <button type="button" className="btn btn--ghost" onClick={() => setOpen(false)}>
          取消
        </button>
      </div>

      <div className="import__row">
        <label className="import__label" htmlFor="imp-title">
          标题
        </label>
        <input
          id="imp-title"
          className="search import__input"
          value={title}
          placeholder={lang === 'ja' ? '例：昨日のニュース' : 'e.g. A Morning Walk'}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="import__row">
        <span className="import__label">难度</span>
        <div className="filters" style={{ border: 0, padding: 0, margin: 0 }}>
          {LEVELS[lang].map((l) => (
            <button
              key={l}
              type="button"
              className="chip"
              aria-pressed={level === l}
              onClick={() => setLevel(l)}
            >
              {l} {LEVEL_LABEL[l]}
            </button>
          ))}
        </div>
      </div>

      <div className="import__row import__row--stack">
        <label className="import__label" htmlFor="imp-text">
          正文
        </label>
        <textarea
          id="imp-text"
          className="dict__input import__text"
          lang={lang}
          value={text}
          placeholder={
            lang === 'ja'
              ? '段落のあいだを空行で区切って貼り付けてください。'
              : 'Paste your text here. Separate paragraphs with a blank line.'
          }
          onChange={(e) => {
            setText(e.target.value);
            setErr(null);
          }}
        />
      </div>

      <div className="import__foot">
        <label className="btn import__file">
          选个 .txt 文件
          <input
            type="file"
            accept=".txt,text/plain"
            className="vis-hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void pickFile(f);
            }}
          />
        </label>

        <span className="import__count">
          {preview.sents > 0
            ? `将切成 ${preview.paras} 段 / ${preview.sents} 句`
            : '段落之间用空行隔开'}
        </span>

        <button
          type="button"
          className="btn btn--solid"
          onClick={submit}
          disabled={preview.sents === 0}
        >
          导入并开始跟读
        </button>
      </div>

      {err && <p className="import__err">{err}</p>}

      <p className="import__note">
        导入的文章用浏览器语音合成朗读。它不能拖进度，但每句念完会回调，
        所以高亮是精确跟着读音走的 —— 比 VOA 那些按字数估算的时间轴更准。
        文章存在这台设备的浏览器里，不会上传。
      </p>
    </section>
  );
}
