import type { Work } from '../types';

/**
 * 原创教学例句，非任何动画／影视作品的字幕。
 * 最短的日常句子：寒暄、数字、时间、买东西。
 * 零基础第一关：先把音节边界听出来。
 */
export const jaBasics: Work = {
  id: 'ja-basics',
  lang: 'ja',
  title: '最先听懂的那几句',
  titleOrigin: 'はじめの一言',
  summary: '寒暄、数字、时间、价格。句子短，但缩约和连音已经出现了。',
  scenes: ['daily', 'friends', 'dining'],
  levels: ['N5', 'N4'],
  source: '本站原创教学例句',
  license: '可自由用于学习与教学',
  segments: [
    {
      id: 'jb-01',
      text: 'すみません、今何時ですか。',
      reading: 'すみません、いまなんじですか。',
      zh: '不好意思，现在几点？',
      level: 'N5',
      scene: 'daily',
      note: '「すみません」在这里是叫住别人的开场，不是道歉。快读时常听成「すいません」。',
      keywords: [
        { term: 'すみません', reading: 'すみません', zh: '不好意思（叫人／道歉）', level: 'N5', note: '口语里常说成「すいません」，m 音脱落。' },
        { term: '何時', reading: 'なんじ', zh: '几点', level: 'N5' },
      ],
    },
    {
      id: 'jb-02',
      text: 'これ、いくらですか。',
      reading: 'これ、いくらですか。',
      zh: '这个多少钱？',
      level: 'N5',
      scene: 'dining',
      note: '买东西最短的问法。「これ」后面本该有「は」，口语里直接省掉。',
      keywords: [
        { term: 'いくら', reading: 'いくら', zh: '多少钱', level: 'N5' },
      ],
    },
    {
      id: 'jb-03',
      text: 'ちょっと待ってください。',
      reading: 'ちょっとまってください。',
      zh: '请稍等一下。',
      level: 'N5',
      scene: 'daily',
      note: '「待って」是「待つ」的て形。促音「っ」要停一拍，听的时候那个空白就是它。',
      keywords: [
        { term: 'ちょっと', reading: 'ちょっと', zh: '稍微，一下', level: 'N5', note: '也可以单说「ちょっと…」表示委婉拒绝。' },
        { term: '待って', reading: 'まって', zh: '等（て形）', level: 'N5' },
      ],
    },
    {
      id: 'jb-04',
      text: 'わたし、コーヒーでいいです。',
      reading: 'わたし、コーヒーでいいです。',
      zh: '我咖啡就行。',
      level: 'N4',
      scene: 'dining',
      note: '「〜でいい」是「这个就可以」，比「〜がいい」客气一点，但也透着随便。',
      keywords: [
        { term: 'でいい', reading: 'でいい', zh: '……就行', level: 'N4', note: '对比「がいい」= 就要这个，语气更强。' },
      ],
    },
    {
      id: 'jb-05',
      text: 'ごめん、ちょっと遅れる。',
      reading: 'ごめん、ちょっとおくれる。',
      zh: '抱歉，我会晚一点。',
      level: 'N4',
      scene: 'friends',
      note: '对朋友用「ごめん」，对外人要说「すみません」。句尾用辞书形结句，是很随意的口气。',
      keywords: [
        { term: 'ごめん', reading: 'ごめん', zh: '抱歉（随意）', level: 'N5', note: '正式场合用「ごめんなさい」或「すみません」。' },
        { term: '遅れる', reading: 'おくれる', zh: '迟到，晚到', level: 'N4' },
      ],
    },
    {
      id: 'jb-06',
      text: 'お願いします。',
      reading: 'おねがいします。',
      zh: '那就麻烦你了。',
      level: 'N5',
      scene: 'daily',
      note: '点单、拜托、交接都能用的一句。听起来像一个词，其实是「お＋願い＋します」。',
      keywords: [
        { term: 'お願いします', reading: 'おねがいします', zh: '麻烦你了，拜托了', level: 'N5' },
      ],
    },
    {
      id: 'jb-07',
      text: 'もう一回言ってもらえますか。',
      reading: 'もういっかいいってもらえますか。',
      zh: '能再说一遍吗？',
      level: 'N4',
      scene: 'daily',
      note: '听不清时最该会的一句。「〜てもらえますか」是请求对方为自己做某事，比「〜てください」客气。',
      keywords: [
        { term: 'もう一回', reading: 'もういっかい', zh: '再一次', level: 'N5', note: '「一回」的促音让它听起来像「いっかい」。' },
        { term: 'てもらえますか', reading: 'てもらえますか', zh: '能帮我……吗', level: 'N4', note: '请求句型，比命令形客气很多。' },
      ],
    },
    {
      id: 'jb-08',
      text: '大丈夫、気にしないで。',
      reading: 'だいじょうぶ、きにしないで。',
      zh: '没事，别在意。',
      level: 'N4',
      scene: 'friends',
      note: '「気にしないで」是「気にする」的否定て形，省略了后面的「ください」。',
      keywords: [
        { term: '大丈夫', reading: 'だいじょうぶ', zh: '没关系，没事', level: 'N5', note: '也能当问句：「大丈夫？」= 你没事吧？' },
        { term: '気にする', match: '気にしない', reading: 'きにする', zh: '在意，介意', level: 'N4' },
      ],
    },
    {
      id: 'jb-09',
      text: 'じゃあ、また明日ね。',
      reading: 'じゃあ、またあしたね。',
      zh: '那，明天见。',
      level: 'N5',
      scene: 'friends',
      note: '「じゃあ」是「では」的口语音变，收尾的「ね」把语气放软。',
      keywords: [
        { term: 'じゃあ', reading: 'じゃあ', zh: '那么（口语）', level: 'N5', note: '书面／正式场合是「では」。' },
        { term: 'また明日', reading: 'またあした', zh: '明天见', level: 'N5' },
      ],
    },
    {
      id: 'jb-10',
      text: 'ありがとう、助かった。',
      reading: 'ありがとう、たすかった。',
      zh: '谢谢，帮大忙了。',
      level: 'N4',
      scene: 'friends',
      note: '「助かった」用过去形，表示「（因为你）我得救了」，是很自然的道谢加强。',
      keywords: [
        { term: '助かった', reading: 'たすかった', zh: '得救了，帮大忙了', level: 'N4', note: '固定说法，常紧跟在道谢后面。' },
      ],
    },
  ],
};
