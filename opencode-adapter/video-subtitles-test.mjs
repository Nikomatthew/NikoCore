import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSubtitleText,embeddedSubtitles} from './video-subtitles.mjs';
test('字幕解析保留时间戳并裁剪到分析范围，不执行字幕内容',()=>{
 const text='1\n00:00:01,000 --> 00:00:04,500\n<b>第一句</b>\n\n2\n00:00:05,000 --> 00:00:08,000\n第二句\n\n3\n00:00:10,000 --> 00:00:12,000\n不应出现';
 const result=parseSubtitleText(text,6);assert.equal(result.source,'embedded-subtitle');assert.deepEqual(result.segments,[{start:1,end:4.5,text:'第一句'},{start:5,end:6,text:'第二句'}]);assert.equal(parseSubtitleText('invalid',5).segments.length,0);
});
test('无内嵌字幕返回null用于转写回退，取消不可吞掉',async()=>{
 assert.equal(await embeddedSubtitles('fixture','input',10,undefined,async()=>{throw Error('no subtitle');}),null);
 const signal=AbortSignal.abort(Error('cancelled'));await assert.rejects(()=>embeddedSubtitles('fixture','input',10,signal,async()=>{throw Error('cancelled');}),/cancelled/);
});
