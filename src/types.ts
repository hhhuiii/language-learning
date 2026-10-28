/** 双语精听 · 数据模型 */

export type Lang = 'ja' | 'en';

export type Level =
  | 'N5' | 'N4' | 'N3' | 'N2' | 'N1'                  // 日语 JLPT
  | 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';          // 英语 CEFR

/**
 * 场景标签。界面上已不做筛选：Tatoeba 那 2970 句是算法分类的，
 * 九成落进了 daily，筛选等于没有。手写素材的标签是准的，所以字段留着，
 * 将来要做更好的分类不用重新标。
 */
export type Scene =
  | 'campus' | 'friends' | 'daily' | 'work'
  | 'dining' | 'travel' | 'news' | 'story';

/** 片段里被重点标注的词语／用法 */
export interface Keyword {
  /**
   * 词条标题，用字典形（辞書形 / 原形）。
   * 卡片上显示这个，方便查词和记忆。
   */
  term: string;
  /**
   * 句子里实际出现的形态，用来高亮。
   * term 是「気にする」而句中是「気にしない」时填这里；
   * 和 term 一致时可省略。
   *
   * 像 "might be V-ing" 这种带占位符的句型，句中没有字面对应，
   * 填上真正出现的那部分（"might be waiting"）即可。
   */
  match?: string;
  /** 读音：日语假名 / 英语音标 */
  reading?: string;
  /** 中文释义 */
  zh: string;
  level?: Level;
  /** 用法讲解 */
  note?: string;
}

/** 一个精听片段 = 一句原声 */
export interface Segment {
  id: string;
  /** 目标语原文 */
  text: string;
  /** 假名／音标辅助行，可空 */
  reading?: string;
  /** 中文翻译 */
  zh: string;
  level: Level;
  /** 场景标签。界面不筛选，保留供将来使用 */
  scene?: Scene;
  /** 讲解：语法、语气、文化背景 */
  note?: string;
  keywords?: Keyword[];
  /**
   * 真实音频。留空则回退到浏览器语音合成（Web Speech）。
   * 可以是 /media/xxx.mp3，也可以是整段音频 + 时间轴切片。
   */
  audio?: string;
  clipStart?: number;
  clipEnd?: number;
  speaker?: string;
}

/**
 * 逐字稿里的一行。
 *
 * start / end 是秒。来源不同，精度也不同：
 *   导入 SRT / VTT   时间轴是真的，逐行精确对齐
 *   VOA 这类纯文稿   只有音频和文字，没有时间轴，只能按字数估算
 *
 * 所以 Article.timing 要标明是哪种，界面上如实告诉用户，
 * 不能让估算出来的滚动看起来像精确对齐。
 */
export interface TranscriptLine {
  id: string;
  text: string;
  start: number;
  end: number;
  speaker?: string;
  /**
   * 这句属于原文第几段（从 0 开始）。
   * 阅读界面按段落排版，整段连续显示而不是一行一条，
   * 所以必须知道段落边界。旧数据没有这个字段时全部算一段。
   */
  para?: number;
}

/**
 * 一篇带音频的文章，用来做逐字稿跟读（像歌词那样滚动）。
 * 和 Work 分开：Work 是一句一句独立的练习素材，
 * Article 是一整段连续音频，重点在跟着往下走。
 */
export interface Article {
  id: string;
  lang: Lang;
  title: string;
  /**
   * 音频地址：/media/articles/xxx.mp3 或外链。
   * 纯文本导入的材料没有音频，这里留空，改用语音合成朗读。
   */
  audio?: string;
  /**
   * 没有音频文件、用语音合成朗读时为 true。
   * 这种情况下时间轴只能是估算的，而且合成音的节奏和真人不同。
   */
  tts?: boolean;
  /**
   * 音频总长（秒）。导入时就算好，因为滚动和进度条都要用它。
   * 估算来的也写进来，播放时浏览器读到真实时长会自己校正。
   */
  duration: number;
  /** 'exact' = 来自字幕文件；'estimated' = 按字数估算 */
  timing: 'exact' | 'estimated';
  lines: TranscriptLine[];
  level: Level;
  summary?: string;
  source: string;
  license: string;
}

/** 一部作品／一套材料 */
export interface Work {
  id: string;
  lang: Lang;
  title: string;
  /** 目标语原题 */
  titleOrigin?: string;
  summary: string;
  /** 场景标签。界面不筛选，保留供将来使用 */
  scenes?: Scene[];
  levels: Level[];
  /** 来源与授权说明，必填：尊重素材权利 */
  source: string;
  license: string;
  segments: Segment[];
}
