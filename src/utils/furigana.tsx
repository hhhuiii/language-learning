/**
 * 解析 Tatoeba 标记式振假名 [漢字|よみ] 为 JSX <ruby> 元素。
 * 纯假名部分原样返回。
 */

export function parseFurigana(text: string): JSX.Element[] {
  const result: JSX.Element[] = [];
  let i = 0;
  let key = 0;

  while (i < text.length) {
    const start = text.indexOf('[', i);
    if (start === -1) {
      // 剩余纯文本
      const plain = text.slice(i);
      if (plain) result.push(<span key={key++}>{plain}</span>);
      break;
    }

    // start 之前的纯文本
    if (start > i) {
      result.push(<span key={key++}>{text.slice(i, start)}</span>);
    }

    const end = text.indexOf(']', start);
    if (end === -1) {
      // 没有闭合 ]，原样输出
      result.push(<span key={key++}>{text.slice(start)}</span>);
      break;
    }

    // [漢字|よみ] → <ruby>漢字<rt>よみ</rt></ruby>
    const inner = text.slice(start + 1, end);
    const pipe = inner.indexOf('|');
    if (pipe === -1) {
      // 没有 |，原样输出
      result.push(<span key={key++}>{text.slice(start, end + 1)}</span>);
    } else {
      const parts = inner.split('|');
      const base = parts[0];
      const reading = parts.slice(1).join(''); // 处理 [誕生|たん|じょう] 多管道情况
      result.push(
        <ruby key={key++}>
          {base}
          <rt>{reading}</rt>
        </ruby>,
      );
    }

    i = end + 1;
  }

  return result;
}
