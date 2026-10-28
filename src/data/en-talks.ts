import type { Work } from '../types';

/**
 * B2–C2 讲演与资讯。本站原创教学例句，模仿演讲／新闻的句法密度，
 * 不转录任何真实 TED / 新闻音视频。
 * 重点：长句的意群切分、抽象名词、插入语。
 */
export const enTalks: Work = {
  id: 'en-talks',
  lang: 'en',
  title: '讲台上的长句',
  titleOrigin: 'Talks & Headlines',
  summary: '演讲与资讯语体：从句套从句、插入语、抽象名词。难点不是生词，是句子的呼吸点。',
  scenes: ['news', 'story', 'work'],
  levels: ['B2', 'C1', 'C2'],
  source: '本站原创教学例句',
  license: '可自由用于学习与教学',
  segments: [
    {
      id: 'et2-01',
      text: 'What I want to argue today is that we have been measuring the wrong thing.',
      zh: '我今天想论证的是：我们一直在衡量错误的东西。',
      level: 'B2',
      scene: 'story',
      note: '演讲最典型的开场结构：What I want to… is that… 把主语整体前置。听的时候要等到 is 才知道主干在哪。',
      keywords: [
        { term: 'What I want to argue', zh: '我想论证的是', level: 'C1', note: '名词性从句作主语，演讲里用来强调论点。' },
        { term: 'have been measuring', zh: '一直在衡量', level: 'B2', note: '现在完成进行时：强调从过去持续到现在。' },
      ],
    },
    {
      id: 'et2-02',
      text: 'The data, as far as we can tell, points in exactly the opposite direction.',
      zh: '据我们目前所知，数据指向的方向恰好相反。',
      level: 'C1',
      scene: 'news',
      note: '插入语 as far as we can tell 把主语和谓语切开了。听到 The data 后先挂住，等插入语说完再接 points。',
      keywords: [
        { term: 'as far as we can tell', zh: '据我们所知', level: 'C1', note: '学术与新闻里常用的保留性插入语。' },
        { term: 'points in', zh: '指向', level: 'B2', note: 'point in a direction：指向某个方向。' },
      ],
    },
    {
      id: 'et2-03',
      text: "Officials have declined to say whether the figures will be revised.",
      zh: '官方拒绝透露这些数字是否会被修正。',
      level: 'C1',
      scene: 'news',
      note: '新闻体的标准句式。decline to + 动词 = 拒绝（比 refuse 更正式、更中立）。',
      keywords: [
        { term: 'declined to say', zh: '拒绝透露', level: 'C1', note: '新闻用语，比 refused 更中性。' },
        { term: 'whether', zh: '是否', level: 'B2', note: '引导宾语从句；口语里常被 if 替代，但书面与播报多用 whether。' },
        { term: 'revised', zh: '修正，修订', level: 'B2' },
      ],
    },
    {
      id: 'et2-04',
      text: 'It is not that the method fails; it is that nobody bothers to apply it.',
      zh: '问题不在于这个方法失效，而在于没人愿意去用它。',
      level: 'C1',
      scene: 'story',
      note: 'It is not that… it is that… 是辩论中纠正对方前提的句型。两个 that 从句形成对照。',
      keywords: [
        { term: 'It is not that', zh: '并不是说', level: 'C1', note: '用来否认对方的归因，再给出真正原因。' },
        { term: 'bothers to', zh: '愿意费力去（做）', level: 'C1', note: '多用于否定句：nobody bothers to…。' },
      ],
    },
    {
      id: 'et2-05',
      text: 'Had we known the cost upfront, we would have taken a different route.',
      zh: '要是早知道成本，我们当初就会选另一条路了。',
      level: 'C2',
      scene: 'work',
      note: '虚拟语气倒装：Had we known = If we had known。正式语体里省略 if 并倒装，听力上开头就是动词，很容易错判成疑问句。',
      keywords: [
        { term: 'Had we known', zh: '要是我们早知道', level: 'C2', note: '倒装虚拟条件句，等于 If we had known。' },
        { term: 'upfront', zh: '事先，预先', level: 'C1', note: '也可指「坦率的」。' },
      ],
    },
    {
      id: 'et2-06',
      text: 'The report, which runs to some four hundred pages, was quietly published last Friday.',
      zh: '这份长达约四百页的报告，上周五悄然发布。',
      level: 'C1',
      scene: 'news',
      note: '非限定性定语从句插在主谓之间。some + 数字 = 约、大约，不是「一些」。',
      keywords: [
        { term: 'runs to', zh: '长达，达到（篇幅／金额）', level: 'C1' },
        { term: 'some four hundred', zh: '约四百', level: 'C1', note: 'some + 数词表示约数，书面语常见。' },
        { term: 'quietly', zh: '悄然，低调地', level: 'B2', note: '新闻里暗示「不想引人注意」。' },
      ],
    },
    {
      id: 'et2-07',
      text: 'What strikes me, more than anything else, is how little any of this has changed.',
      zh: '最让我震惊的，是这一切几乎没有任何变化。',
      level: 'C2',
      scene: 'story',
      note: '三层结构：主语从句 + 插入语 + how 引导的表语从句。how little 是否定意味的强调，等于 almost nothing changed。',
      keywords: [
        { term: 'What strikes me', zh: '让我印象深刻／震惊的是', level: 'C1' },
        { term: 'how little', zh: '多么少（几乎没有）', level: 'C2', note: 'little 在此为否定含义，不是「小」。' },
      ],
    },
    {
      id: 'et2-08',
      text: 'Researchers caution that the findings are preliminary and have yet to be peer-reviewed.',
      zh: '研究人员提醒，这些结果尚属初步，还未经过同行评审。',
      level: 'C2',
      scene: 'news',
      note: 'have yet to + 动词 = 还没有（但预期会发生）。科研报道的高频免责句式。',
      keywords: [
        { term: 'caution that', zh: '提醒说，警告称', level: 'C1', note: '动词用法，后接从句。' },
        { term: 'preliminary', zh: '初步的', level: 'C1' },
        { term: 'have yet to', zh: '尚未，还没有', level: 'C2', note: '比 have not yet 更正式凝练。' },
      ],
    },
  ],
};
