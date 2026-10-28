import type { Work } from '../types';

/**
 * A1–A2 入门会话。本站原创教学例句，不转录任何受版权保护的音视频。
 * 重点：最高频的功能句 + 连读弱读入门。
 */
export const enBasics: Work = {
  id: 'en-basics',
  lang: 'en',
  title: '最先听懂的那些话',
  titleOrigin: 'Everyday Basics',
  summary: '零基础起步：打招呼、问价钱、点单、问时间。句子短，但连读已经开始出现。',
  scenes: ['daily', 'friends', 'dining'],
  levels: ['A1', 'A2'],
  source: '本站原创教学例句',
  license: '可自由用于学习与教学',
  segments: [
    {
      id: 'eb-01',
      text: 'How much is this one?',
      zh: '这个多少钱？',
      level: 'A1',
      scene: 'daily',
      note: '最高频的问价句。"is this" 两个词常连成一个音团 /ɪzˈðɪs/，听起来像一个词。',
      keywords: [
        { term: 'How much', zh: '多少钱', level: 'A1', note: '问不可数的量或价钱；问可数数量用 How many。' },
      ],
    },
    {
      id: 'eb-02',
      text: "It's ten dollars. Would you like a bag?",
      zh: '十美元。需要袋子吗？',
      level: 'A1',
      scene: 'daily',
      speaker: '店员',
      note: 'Would you like…? 是比 Do you want 更客气的问法，服务场合几乎只用这个。',
      keywords: [
        { term: 'Would you like', zh: '您需要……吗', level: 'A2', note: '礼貌提议；口语里常弱读成 "Would ya like"。' },
      ],
    },
    {
      id: 'eb-03',
      text: "No, thanks. I've got one.",
      zh: '不用，谢谢。我自己有。',
      level: 'A2',
      scene: 'daily',
      note: "I've got = I have，英式口语尤其常见。缩约后 I've 只剩一个很轻的 /v/，初学最容易漏掉。",
      keywords: [
        { term: "I've got", zh: '我有', level: 'A2', note: '等于 I have；缩读后 have 几乎听不见。' },
      ],
    },
    {
      id: 'eb-04',
      text: 'Excuse me, what time does it open?',
      zh: '打扰一下，几点开门？',
      level: 'A2',
      scene: 'daily',
      note: '"does it" 高频连读成 /dəzɪt/。问营业时间的标准句式。',
      keywords: [
        { term: 'Excuse me', zh: '打扰一下', level: 'A1', note: '搭话、借过、打断都用它。' },
        { term: 'what time', zh: '几点', level: 'A1' },
      ],
    },
    {
      id: 'eb-05',
      text: 'It opens at nine, but the kitchen starts at eleven.',
      zh: '九点开门，但厨房十一点才开始。',
      level: 'A2',
      scene: 'dining',
      note: 'at nine / at eleven 里的 at 几乎不发音，只剩一个 /t/ 黏在数字前面。',
      keywords: [
        { term: 'but', zh: '但是', level: 'A1', note: '口语里常弱读成 /bət/，别听成 bad。' },
      ],
    },
    {
      id: 'eb-06',
      text: "Can I get a coffee, please? Just a small one.",
      zh: '可以要一杯咖啡吗？小杯的就好。',
      level: 'A2',
      scene: 'dining',
      note: 'Can I get… 是美式点单最常用的说法。"Can I" 连读成 /kənaɪ/。',
      keywords: [
        { term: 'Can I get', zh: '我可以要', level: 'A2', note: '点单、要东西的固定开头。' },
        { term: 'just', match: 'Just', zh: '只要，就', level: 'A1', note: '弱化语气，表示「不用多」。' },
      ],
    },
    {
      id: 'eb-07',
      text: "Sure. For here or to go?",
      zh: '好的。堂食还是带走？',
      level: 'A2',
      scene: 'dining',
      speaker: '店员',
      note: '咖啡店必考句。to go = 外带（英式说 takeaway）。整句语速极快，但只有四个实词。',
      keywords: [
        { term: 'to go', zh: '外带', level: 'A2', note: '美式说法；英式用 takeaway。' },
      ],
    },
    {
      id: 'eb-08',
      text: "I'm sorry, could you say that again?",
      zh: '抱歉，能再说一遍吗？',
      level: 'A2',
      scene: 'friends',
      note: '听不懂时最该先学会的一句。could you 连读成 /kʊdʒu/，d 和 y 合成 /dʒ/ 音。',
      keywords: [
        { term: 'could you', zh: '你能……吗', level: 'A2', note: '比 can you 更客气；连读出 /dʒ/ 音。' },
        { term: 'again', zh: '再一次', level: 'A1' },
      ],
    },
  ],
};
