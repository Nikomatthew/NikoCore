import test from 'node:test';
import assert from 'node:assert/strict';
import {mediaSettings,mediaCoverage} from './media-settings.mjs';
import {pickFrameTimes} from './video-storyboard.mjs';
test('视听设置校验与覆盖限制，不把截断说成完整',()=>{
 assert.equal(mediaSettings().videoMaxMiB,200);assert.throws(()=>mediaSettings({videoFrameCount:99}));assert.throws(()=>mediaSettings({videoFrameStrategy:'bad'}));
  assert.equal(mediaSettings().videoAnalyzeSeconds,1800);assert.equal(mediaSettings().videoTranscriptMode,'asr');assert.equal(mediaCoverage({duration:900},'video',{}),900);assert.equal(mediaCoverage({duration:1800},'video',{}),1800);assert.throws(()=>mediaCoverage({duration:900},'video',{videoAnalyzeSeconds:300,mediaOverflow:'reject'}));assert.throws(()=>mediaCoverage({duration:9000},'video',{}));
 const times=pickFrameTimes(900,[],16,600);assert.equal(times.length,16);assert.ok(times.at(-1)>300&&times.at(-1)<600);
});
