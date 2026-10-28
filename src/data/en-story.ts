import type { Work } from '../types';

/**
 * Original teaching sentences written for this site.
 * Narrative voice: past-tense storytelling, the register of audio essays
 * and documentary narration. Long clauses, time markers, reported speech.
 */
export const enStory: Work = {
  id: 'en-story',
  lang: 'en',
  title: '一个人讲完一件事',
  titleOrigin: 'Telling the Whole Story',
  summary: '叙事口吻：过去时、时间标记、转述。句子长，靠连接词撑结构，适合练长句听解。',
  scenes: ['story', 'daily', 'friends'],
  levels: ['B1', 'B2', 'C1'],
  source: '本站原创教学例句',
  license: '可自由用于学习与教学',
  segments: [
    {
      id: 'es-01',
      text: "It started out as a normal Tuesday, or so I thought at the time.",
      zh: '一开始就是个普通的周二，至少我当时是这么以为的。',
      level: 'B1',
      scene: 'story',
      note: 'start out as = 起初是。"or so I thought" 是叙事里埋伏笔的固定说法，暗示后面有转折。',
      keywords: [
        { term: 'started out as', zh: '起初是，一开始是', level: 'B1', note: 'start out 强调起点状态，后面常有变化。' },
        { term: 'or so I thought', zh: '至少我当时这么以为', level: 'B2', note: '叙事套路，预告事情并非如此。' },
      ],
    },
    {
      id: 'es-02',
      text: "I'd been waiting at the stop for maybe ten minutes when the rain hit.",
      zh: '我在站台等了大概十分钟，雨就下来了。',
      level: 'B2',
      scene: 'story',
      note: '过去完成进行时 I\'d been waiting 表示「在某事发生前已持续」。when 引出打断动作。hit 指天气突然来临。',
      keywords: [
        { term: "I'd been waiting", zh: '我（之前）一直在等', level: 'B2', note: '过去完成进行：持续到某个过去时点。' },
        { term: 'the rain hit', zh: '雨下起来了', level: 'B2', note: 'hit 用于天气，强调突然。' },
      ],
    },
    {
      id: 'es-03',
      text: "Nobody had an umbrella, which is exactly how these things go.",
      zh: '谁都没带伞 —— 这种事就是这样。',
      level: 'B2',
      scene: 'story',
      note: 'which 在这里指代前面整句话，不是某个名词。"how these things go" = 这种事情的一般走向。',
      keywords: [
        { term: 'which', zh: '（指代前面整句）这一点', level: 'B2', note: '非限定关系从句，先行词是整个句子。' },
        { term: 'how these things go', zh: '这种事就是这样', level: 'B2' },
      ],
    },
    {
      id: 'es-04',
      text: "This woman next to me just laughed and said she'd walked out without checking.",
      zh: '我旁边那位女士笑了笑，说她出门时根本没看天气。',
      level: 'B2',
      scene: 'story',
      note: '转述句：said she\'d walked out —— 直接引语的 I walked out 变成 she had walked out。without + 动名词表示「没做某事就……」。',
      keywords: [
        { term: "she'd walked out", zh: '她（当时已经）出了门', level: 'B2', note: '转述里的过去完成，对应原话的过去时。' },
        { term: 'without checking', zh: '没看一下就', level: 'B1', note: 'without + -ing，省略了宾语 the forecast。' },
      ],
    },
    {
      id: 'es-05',
      text: "By the time the bus showed up, we were both soaked through.",
      zh: '等公交来的时候，我们俩都淋透了。',
      level: 'B1',
      scene: 'story',
      note: 'by the time = 到……的时候（引导时间从句）。show up = 出现、来了。soaked through = 全身湿透。',
      keywords: [
        { term: 'By the time', zh: '到……的时候', level: 'B1', note: '后接从句，主句常用完成或过去时。' },
        { term: 'soaked through', zh: '湿透，淋透', level: 'B2' },
      ],
    },
    {
      id: 'es-06',
      text: "What I remember most isn't the rain, it's how everyone just dealt with it.",
      zh: '我印象最深的不是那场雨，而是大家都那么自然地接受了。',
      level: 'C1',
      scene: 'story',
      note: 'What 引导的主语从句整体前置，谓语是 isn\'t。后半句 it\'s how… 用 how 引出名词性从句，指「方式」。',
      keywords: [
        { term: 'What I remember most', zh: '我记得最清楚的是', level: 'C1', note: 'What 主语从句，谓语在 isn\'t。' },
        { term: 'dealt with it', zh: '应对、消化了这件事', level: 'B2', note: 'deal with 的过去式 dealt 读 /delt/，不是 /diːld/。' },
      ],
    },
    {
      id: 'es-07',
      text: "Looking back, it was the kind of thing you only appreciate afterwards.",
      zh: '回头想想，那种事只有事后才体会得到。',
      level: 'C1',
      scene: 'story',
      note: 'Looking back 是分词短语作状语（回顾时）。the kind of thing (that) you… 省略了关系代词。',
      keywords: [
        { term: 'Looking back', zh: '回头看，回想起来', level: 'B2', note: '分词作状语，叙事收尾常用。' },
        { term: 'the kind of thing', zh: '那种事情', level: 'B2', note: '后面常接省略 that 的定语从句。' },
      ],
    },
    {
      id: 'es-08',
      text: "I've told that story a dozen times, and it gets shorter every time.",
      zh: '这故事我讲过十几遍了，每讲一次就变短一点。',
      level: 'B2',
      scene: 'friends',
      note: '现在完成时 I\'ve told 强调累积次数。a dozen 口语里不一定正好十二，就是「十几」。',
      keywords: [
        { term: "I've told", zh: '我讲过（累计）', level: 'B1', note: '现在完成时表经验与次数。' },
        { term: 'a dozen times', zh: '十几次，好多次', level: 'B1', note: '夸张用法，不是精确计数。' },
      ],
    },
    {
      id: 'es-09',
      text: "The funny thing is, I never did find out who she was.",
      zh: '有意思的是，我始终没弄清她是谁。',
      level: 'C1',
      scene: 'story',
      note: 'The funny thing is 后面常直接接句子，省略 that。did find out 用 did 加强否定语气：「始终没能」。',
      keywords: [
        { term: 'The funny thing is', zh: '有意思的是', level: 'B2', note: '引出意外细节，后接完整句子。' },
        { term: 'never did find out', zh: '始终没弄清', level: 'C1', note: 'did 在否定句里加强语气，不是时态需要。' },
      ],
    },
    {
      id: 'es-10',
      text: "Had I known it would rain, I'd have taken the earlier train.",
      zh: '要是早知道会下雨，我就坐早一班车了。',
      level: 'C1',
      scene: 'story',
      note: '虚拟语气倒装：Had I known = If I had known。这是书面和正式口语里的省略倒装，听到句首 Had 就要反应过来是假设。',
      keywords: [
        { term: 'Had I known', zh: '要是我早知道（虚拟倒装）', level: 'C1', note: '= If I had known，省略 if 后助动词提前。' },
        { term: "I'd have taken", zh: '我就会坐（了）', level: 'C1', note: 'would have + 过去分词，对过去的假设。' },
      ],
    },
    {
      id: 'es-11',
      text: "Not that it mattered much in the end, but I was late anyway.",
      zh: '其实也没多大关系，反正我最后还是迟到了。',
      level: 'C1',
      scene: 'story',
      note: 'Not that… = 倒也不是说……（先退一步再补充）。anyway 放句尾表示「反正、无论如何」。',
      keywords: [
        { term: 'Not that', zh: '倒不是说……', level: 'C1', note: '句首插入语，削弱前面的重要性。' },
        { term: 'anyway', zh: '反正，无论如何', level: 'B1', note: '句尾时常弱读成 /ˈeniweɪ/ 一个音团。' },
      ],
    },
    {
      id: 'es-12',
      text: "Anyway, that's the whole thing. Nothing dramatic, just one of those days.",
      zh: '总之就这么回事。没什么戏剧性，就是那种日子。',
      level: 'B2',
      scene: 'friends',
      note: 'Anyway 在句首是「总之、言归正传」，用来收尾。one of those days = 不顺的一天（固定说法）。',
      keywords: [
        { term: "that's the whole thing", zh: '就这么回事', level: 'B2', note: '叙事收尾口语。' },
        { term: 'one of those days', zh: '（倒霉、不顺的）那种日子', level: 'B2', note: '固定表达，默认偏负面。' },
      ],
    },
  ],
};
