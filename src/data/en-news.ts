import type { Work } from '../types';

/**
 * Original teaching sentences written for this site.
 * Not transcribed from any broadcast or publication.
 * Scene: news-register English — the passive voice, attribution
 * phrases and number-heavy clauses that broadcasts run together.
 */
export const enNews: Work = {
  id: 'en-news',
  lang: 'en',
  title: '播报腔的英语',
  titleOrigin: 'In the Headlines',
  summary: '被动语态、消息来源、数字密集的长句。播报语速快，但句型反复就那几种。',
  scenes: ['news', 'story'],
  levels: ['B1', 'B2', 'C1'],
  source: '本站原创教学例句',
  license: '可自由用于学习与教学',
  segments: [
    {
      id: 'en-01',
      text: 'Residents were told to stay indoors as the storm moved inland.',
      zh: '随着风暴向内陆推进，居民被告知待在室内。',
      level: 'B1',
      scene: 'news',
      note: '播报最常见的开头：被动语态 were told 隐去「谁告知的」。听的时候要抓住 as —— 它在这里是「随着」，不是「因为」。',
      keywords: [
        { term: 'be told to', match: 'were told to', zh: '被告知要……', level: 'B1', note: '被动语态，省略施动者。' },
        { term: 'as', zh: '随着，当……时', level: 'B1', note: '引导时间状语，不是「因为」。' },
        { term: 'inland', zh: '向内陆', level: 'B2' },
      ],
    },
    {
      id: 'en-02',
      text: 'According to the agency, the figure has nearly doubled since last year.',
      zh: '据该机构称，这一数字自去年以来几乎翻了一倍。',
      level: 'B1',
      scene: 'news',
      note: 'According to 是最标准的消息来源标记，听到它就知道后面不是记者的判断。has doubled 用现在完成时，强调「到现在为止」。',
      keywords: [
        { term: 'according to', match: 'According to', zh: '据……称', level: 'B1', note: '引出消息来源，表示不为内容背书。' },
        { term: 'figure', zh: '数字，数据', level: 'B1', note: '这里不是「人物」或「身材」。' },
        { term: 'double', match: 'doubled', zh: '翻倍', level: 'B2', note: '可作动词，不必说 become two times。' },
      ],
    },
    {
      id: 'en-03',
      text: 'The measure is expected to take effect at the start of next month.',
      zh: '该措施预计将于下月初生效。',
      level: 'B2',
      scene: 'news',
      note: 'is expected to 是播报里表示预测的固定说法，比 will 更谨慎。take effect 是「生效」的固定搭配。',
      keywords: [
        { term: 'be expected to', match: 'is expected to', zh: '预计将……', level: 'B2', note: '被动＋不定式，不指明谁在预测。' },
        { term: 'take effect', zh: '生效', level: 'B2', note: '法规、政策的固定搭配。' },
        { term: 'measure', zh: '措施', level: 'B2', note: '这里不是「测量」。' },
      ],
    },
    {
      id: 'en-04',
      text: 'Officials declined to comment on whether an investigation is underway.',
      zh: '官员拒绝就是否正在调查发表评论。',
      level: 'C1',
      scene: 'news',
      note: 'declined to comment 是「无可奉告」的新闻说法。whether 引导的从句做介词 on 的宾语，整句主干很短，难点全在后半截。',
      keywords: [
        { term: 'decline to', match: 'declined to', zh: '拒绝（做某事）', level: 'C1', note: '比 refuse 中性，不带情绪。' },
        { term: 'whether', zh: '是否', level: 'B2', note: '引导宾语从句，不能换成 if 放在介词后。' },
        { term: 'underway', zh: '正在进行', level: 'C1', note: '形容词，常作表语：is underway。' },
      ],
    },
    {
      id: 'en-05',
      text: 'The company said in a statement that no customer data had been affected.',
      zh: '该公司在一份声明中表示，没有客户数据受到影响。',
      level: 'B2',
      scene: 'news',
      note: 'said in a statement 表示这是书面回应而非采访。had been affected 用过去完成被动 —— 比 said 更早发生，时间层次要听出来。',
      keywords: [
        { term: 'in a statement', zh: '在一份声明中', level: 'B2', note: '表明是书面正式回应。' },
        { term: 'had been affected', zh: '曾受到影响', level: 'C1', note: '过去完成被动，表示比主句更早。' },
      ],
    },
    {
      id: 'en-06',
      text: 'Flights were delayed for several hours, leaving thousands stranded.',
      zh: '航班延误数小时，导致数千人滞留。',
      level: 'B2',
      scene: 'news',
      note: 'leaving 是分词短语表结果，相当于 and this left。播报爱用这个结构把两件事压进一句。',
      keywords: [
        { term: 'leaving', zh: '导致，使得（结果）', level: 'B2', note: '分词短语表结果，不是「离开」。' },
        { term: 'stranded', zh: '滞留的，走不了的', level: 'B2', note: '常和 leave 搭配：leave someone stranded。' },
      ],
    },
    {
      id: 'en-07',
      text: 'The report found that fewer than half of those surveyed felt prepared.',
      zh: '报告发现，受访者中感到有准备的不足半数。',
      level: 'C1',
      scene: 'news',
      note: 'those surveyed ＝ the people who were surveyed，省略了关系代词和 be 动词。这种压缩在书面和播报里非常常见。',
      keywords: [
        { term: 'fewer than', zh: '少于（可数）', level: 'B2', note: '可数名词用 fewer，不可数用 less。' },
        { term: 'those surveyed', zh: '受访者', level: 'C1', note: 'those ＋ 过去分词，省略 who were。' },
      ],
    },
    {
      id: 'en-08',
      text: 'Talks broke down late Tuesday, though both sides say they remain open to negotiation.',
      zh: '周二晚谈判破裂，不过双方都表示仍愿意继续谈。',
      level: 'C1',
      scene: 'news',
      note: 'break down 在这里是「破裂」。though 后面的让步在播报里几乎是标配 —— 先说坏消息，再留口子。',
      keywords: [
        { term: 'break down', match: 'broke down', zh: '（谈判）破裂', level: 'C1', note: '多义短语动词，也可指机器故障。' },
        { term: 'remain open to', zh: '仍愿意接受', level: 'C1', note: 'remain ＋ 形容词，比 are still 正式。' },
      ],
    },
    {
      id: 'en-09',
      text: 'It is the first time in over a decade that the index has fallen this sharply.',
      zh: '这是十多年来该指数首次如此大幅下跌。',
      level: 'C1',
      scene: 'news',
      note: 'It is the first time … that … 后面必须跟完成时 has fallen。over a decade 比 more than ten years 更常用在播报里。',
      keywords: [
        { term: 'It is the first time that', match: 'It is the first time', zh: '这是第一次……', level: 'C1', note: '后接现在完成时，不能用过去式。' },
        { term: 'sharply', zh: '急剧地，大幅', level: 'B2', note: '修饰涨跌幅度的标准副词。' },
      ],
    },
    {
      id: 'en-10',
      text: 'Researchers say the findings, while preliminary, point to a clear trend.',
      zh: '研究人员表示，这些发现虽属初步，但指向一个明确的趋势。',
      level: 'C1',
      scene: 'story',
      note: 'while preliminary 是插入的让步，完整说法是 while they are preliminary，省略了主语和 be 动词。点睛的是 point to ＝ 指向。',
      keywords: [
        { term: 'while', zh: '虽然（让步）', level: 'C1', note: '这里不是「当……时」，而是 although。' },
        { term: 'preliminary', zh: '初步的', level: 'C1' },
        { term: 'point to', zh: '指向，表明', level: 'B2', note: '证据指向某个结论。' },
      ],
    },
  ],
};
