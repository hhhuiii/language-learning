#!/usr/bin/env node
/** 列出 Edge TTS 可用的日语和英语语音，确认挑哪一个再批量生成 */

import { MsEdgeTTS } from 'msedge-tts';

const tts = new MsEdgeTTS();
const voices = await tts.getVoices();

for (const want of ['ja-JP', 'en-US']) {
  const list = voices.filter((v) => v.Locale === want);
  console.log(`\n=== ${want} (${list.length}) ===`);
  for (const v of list) {
    const name = v.ShortName.replace(`${want}-`, '');
    const styles = v.VoiceTag?.VoicePersonalities?.join('/') ?? '';
    console.log(`  ${name.padEnd(28)} ${v.Gender.padEnd(7)} ${styles}`);
  }
}
