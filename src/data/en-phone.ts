import type { Work } from '../types';

/**
 * Original teaching sentences written for this site.
 * Phone calls, appointments, service encounters — the places where English
 * speakers compress the most and learners lose the thread fastest.
 */
export const enPhone: Work = {
  id: 'en-phone',
  lang: 'en',
  title: '电话那头',
  titleOrigin: 'On the Phone',
  summary: '预约、改期、客服。看不到嘴型，连读和弱读全靠耳朵，中间段最该练。',
  scenes: ['daily', 'work', 'travel'],
  levels: ['A2', 'B1', 'B2'],
  source: '本站原创教学例句',
  license: '可自由用于学习与教学',
  segments: [
    {
      id: 'ep-01',
      text: "Hi, I'm calling to book an appointment for next week.",
      zh: '你好，我想预约下周的时间。',
      level: 'A2',
      scene: 'daily',
      note: '"I\'m calling to…" 是打电话说明来意的标准开场，比 "I want to" 礼貌。calling to 连读成 /ˈkɔːlɪŋtə/。',
      keywords: [
        { term: "I'm calling to", zh: '我打电话是想……', level: 'A2', note: '电话开场固定说法。' },
        { term: 'book an appointment', zh: '预约', level: 'A2', note: '英式常用 book，美式也说 make an appointment。' },
      ],
    },
    {
      id: 'ep-02',
      text: "Sure, let me pull up the calendar. What day works best for you?",
      zh: '好的，我调一下日程。你哪天最合适？',
      level: 'B1',
      scene: 'work',
      note: 'pull up = 调出（屏幕上的信息）。"What day works for you" 里 works 的主语是 day，不是人 —— 这个说法很常见。',
      keywords: [
        { term: 'pull up', zh: '调出，打开（信息）', level: 'B1', note: '口语里指在电脑上调出某个页面或记录。' },
        { term: 'works best for you', zh: '对你最合适', level: 'B1', note: '主语是时间或安排，不是人。' },
      ],
    },
    {
      id: 'ep-03',
      text: "Would Thursday afternoon work, or is that too short notice?",
      zh: '周四下午行吗，还是太赶了？',
      level: 'B2',
      scene: 'daily',
      note: 'short notice = 通知得太晚、时间太赶。这是固定搭配，不能说 short notification。',
      keywords: [
        { term: 'short notice', zh: '时间太赶，临时通知', level: 'B2', note: '常见搭配 at short notice / on short notice。' },
        { term: 'Would … work', match: 'Would Thursday afternoon work', zh: '……行得通吗', level: 'B1', note: '比 Can you 更委婉的提议方式。' },
      ],
    },
    {
      id: 'ep-04',
      text: "Thursday's a bit tight. Could we push it to Friday instead?",
      zh: '周四有点紧。能不能推到周五？',
      level: 'B2',
      scene: 'work',
      note: 'tight 指时间紧。push it to = 往后推。注意是 push to（推到某天），不是 push off。',
      keywords: [
        { term: 'a bit tight', zh: '有点紧（时间或预算）', level: 'B2' },
        { term: 'push it to', zh: '推迟到', level: 'B2', note: '口语里比 postpone 常见得多。' },
      ],
    },
    {
      id: 'ep-05',
      text: "No problem at all. I'll move you to Friday at two.",
      zh: '完全没问题。我把你改到周五两点。',
      level: 'A2',
      scene: 'work',
      note: '"move you to" 把人当作日程上的条目移动，英语里很自然。at two 的 at 常弱读到几乎听不见。',
      keywords: [
        { term: 'move you to', zh: '把你改到（某时间）', level: 'B1' },
        { term: 'at all', zh: '完全，一点也（加强语气）', level: 'A2', note: '用在否定或 no problem 后面加强。' },
      ],
    },
    {
      id: 'ep-06',
      text: "You should get a confirmation text in a couple of minutes.",
      zh: '你过几分钟应该会收到确认短信。',
      level: 'B1',
      scene: 'daily',
      note: 'should 在这里不是「应该做」，而是预测「应该会」。confirmation text = 确认短信。',
      keywords: [
        { term: 'should', zh: '应该会（预测）', level: 'B1', note: '表推测，不是义务。' },
        { term: 'confirmation text', zh: '确认短信', level: 'B1' },
      ],
    },
    {
      id: 'ep-07',
      text: "Sorry, could you say that again? You're breaking up a little.",
      zh: '抱歉，能再说一遍吗？你那边信号有点断。',
      level: 'B1',
      scene: 'daily',
      note: 'breaking up 在电话语境里指信号断续，不是「分手」。这句在听不清时非常实用。',
      keywords: [
        { term: 'breaking up', zh: '（信号）断断续续', level: 'B2', note: '电话专用义；日常语境里才是分手。' },
        { term: 'say that again', zh: '再说一遍', level: 'A2' },
      ],
    },
    {
      id: 'ep-08',
      text: "Let me put you on hold for just a second while I check.",
      zh: '我查一下，请稍等不要挂断。',
      level: 'B1',
      scene: 'work',
      note: 'put you on hold = 让你在线等待。注意不是 hold on（那是对方说的）。while I check 里 while 常弱读。',
      keywords: [
        { term: 'put you on hold', zh: '让你稍等（不挂断）', level: 'B1', note: '客服常用；对方说 hold on 是「等一下」。' },
        { term: 'for just a second', zh: '就一会儿', level: 'A2', note: '实际时间不一定短，是客套。' },
      ],
    },
    {
      id: 'ep-09',
      text: "Thanks for holding. It turns out the order never went through.",
      zh: '谢谢等待。结果发现订单根本没提交成功。',
      level: 'B2',
      scene: 'work',
      note: 'it turns out = 结果发现（之前不知道的事）。go through 在这里指交易或流程成功通过。',
      keywords: [
        { term: 'it turns out', match: 'It turns out', zh: '结果发现，原来', level: 'B2', note: '引出意外的事实。' },
        { term: 'go through', match: 'went through', zh: '（交易、申请）成功通过', level: 'B2', note: '多义短语动词，这里指完成。' },
      ],
    },
    {
      id: 'ep-10',
      text: "I'd rather not pay twice, so can we just cancel the first one?",
      zh: '我不想付两次钱，能不能把第一笔取消？',
      level: 'B2',
      scene: 'travel',
      note: "would rather not = 宁愿不。I'd 的缩约让 would 几乎只剩一个 d 的音，很容易漏听。",
      keywords: [
        { term: "I'd rather not", zh: '我宁愿不，我不太想', level: 'B2', note: '比 I don\'t want to 委婉。' },
        { term: 'just', zh: '干脆，就（弱化语气）', level: 'A2', note: '口语填充，让请求听起来更随意。' },
      ],
    },
    {
      id: 'ep-11',
      text: "Absolutely. I've gone ahead and refunded that for you.",
      zh: '当然。我已经直接帮你退款了。',
      level: 'B2',
      scene: 'work',
      note: 'go ahead and + 动词 = 直接做了（不再请示）。客服英语里极高频，表示「我这边已经处理」。',
      keywords: [
        { term: 'gone ahead and', zh: '已经直接（做了）', level: 'B2', note: '客服高频，强调主动处理完毕。' },
        { term: 'Absolutely', zh: '当然，没问题', level: 'B1', note: '比 yes 更积极的回应。' },
      ],
    },
    {
      id: 'ep-12',
      text: "Is there anything else I can help you with today?",
      zh: '今天还有其他需要帮忙的吗？',
      level: 'A2',
      scene: 'work',
      note: '客服结束通话的固定问句。help you with 里的 with 不能省，宾语是「事情」而不是人。',
      keywords: [
        { term: 'anything else', zh: '其他任何事', level: 'A2' },
        { term: 'help you with', zh: '在……方面帮你', level: 'A2', note: 'help someone with something 固定结构。' },
      ],
    },
  ],
};
