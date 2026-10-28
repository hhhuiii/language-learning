/** 使用说明 + 自备素材导入格式 */

const SAMPLE = `{
  "id": "my-work",
  "lang": "ja",
  "title": "我的素材",
  "summary": "一句话说明这套材料讲什么。",
  "scenes": ["daily"],
  "levels": ["N4", "N3"],
  "source": "素材来源（必填，写清楚出处）",
  "license": "授权说明（必填，确认可以这样用）",
  "segments": [
    {
      "id": "my-work-001",
      "text": "明日の予定、空いてる？",
      "reading": "あしたのよてい、あいてる？",
      "zh": "明天有空吗？",
      "level": "N4",
      "scene": "friends",
      "note": "「空いてる」是「空いている」的口语缩约。",
      "keywords": [
        { "term": "空いてる", "reading": "あいてる", "zh": "有空", "level": "N4" }
      ],
      "audio": "/media/my-work/001.mp3"
    }
  ]
}`;

export default function Guide() {
  return (
    <div className="wrap page page--prose">
      <header className="page__head">
        <p className="page__kicker">How to use</p>
        <h1 className="page__title">怎么用这个站</h1>
        <p className="page__lead">
          精听不是把一句话听一百遍，而是让耳朵、原文、释义三者对上。四步走完，这一句就真的进去了。
        </p>
      </header>

      <h2 className="sec__title">四步精听</h2>
      <ol className="prose-list">
        <li>
          <strong>盲听</strong>
          ：只播声音，不看任何文字。听不懂是正常的，重点是让耳朵先尝试切分音节。建议放 2—3 遍，
          可以降到 0.75 倍速，但别一上来就看字幕。
        </li>
        <li>
          <strong>目标语字幕</strong>
          ：只看日语／英语原文，核对刚才听到的和写下的是否一致。这一步最容易发现「原来这个音是这个词」。
        </li>
        <li>
          <strong>双语讲解</strong>
          ：看中文翻译和词语用法，弄清每个词为什么出现在这里、语气是什么。遇到想记住的，加入生词本。
        </li>
        <li>
          <strong>再次盲听</strong>
          ：回到纯声音。能跟上节奏、不看字幕也懂意思，这一句才算过。
        </li>
      </ol>

      <h2 className="sec__title">键盘快捷键</h2>
      <table className="kbd-table">
        <tbody>
          <tr>
            <td>
              <kbd>空格</kbd>
            </td>
            <td>播放／停止当前片段</td>
          </tr>
          <tr>
            <td>
              <kbd>D</kbd>
            </td>
            <td>盲听时临时显示／隐藏字幕</td>
          </tr>
          <tr>
            <td>
              <kbd>←</kbd> <kbd>→</kbd>
            </td>
            <td>切换精听步骤</td>
          </tr>
        </tbody>
      </table>

      <h2 className="sec__title">关于声音</h2>
      <p className="prose-p">
        片段带 <code>audio</code> 字段时播放真实录音，支持「整段音频 + 时间轴切片」
        （<code>clipStart</code> / <code>clipEnd</code>，单位秒），不必把音频切成几千个小文件。
        没有音频文件时，自动回退到浏览器内置的语音合成，先把流程跑通。
      </p>
      <p className="prose-p">
        语音合成的自然度取决于系统装了哪些语音包。日语建议在系统里安装日语语音，
        Windows 在「时间和语言 → 语音」里添加，macOS 在「系统设置 → 辅助功能 → 朗读内容」里下载。
        真实录音始终比合成音好，正式使用建议配真人音频。
      </p>

      <h2 className="sec__title">导入自己的素材</h2>
      <p className="prose-p">
        素材按「作品」组织，一个作品是一个 TS 文件，放在 <code>src/data/</code> 下，
        再到 <code>src/data/index.ts</code> 的 <code>works</code> 数组里注册。结构如下：
      </p>
      <pre className="code">
        <code>{SAMPLE}</code>
      </pre>
      <p className="prose-p">
        音频文件放 <code>public/media/</code>，用 <code>/media/...</code> 引用。
        <code>keywords</code> 里的 <code>term</code> 必须和 <code>text</code> 里的写法一致才能高亮。
      </p>

      <h2 className="sec__title">素材来源与授权</h2>
      <p className="prose-p">
        站内自带的四套材料是为本站编写的原创例句，用来演示完整流程，可自由修改。
      </p>
      <p className="prose-p">
        如果你要导入影视字幕、教材音频或网上的听力材料，请先确认授权范围。
        字幕组作品常标注禁止商业使用，教材音频通常受版权保护，公开课与新闻播报各有各的许可条款。
        <code>source</code> 和 <code>license</code> 两个字段是必填的，就是为了让每套材料的出处留在原地。
      </p>
      <p className="prose-p">
        想找可以放心用的素材，可以从明确标注开放许可的来源入手：知识共享许可的朗读录音、
        政府或公共广播的公开资料、以及自己录制的音频。
      </p>

      <h2 className="sec__title">记录保存在哪</h2>
      <p className="prose-p">
        学习记录、生词本、听写成绩都存在这台设备的浏览器 localStorage 里，没有上传到任何服务器。
        清浏览器数据会一起清掉，所以换设备或清缓存前，先到
        <strong>生词本</strong>页面导出备份。
      </p>
    </div>
  );
}
