import test from 'node:test';
import assert from 'node:assert/strict';
import {transcriptEvidence} from './media-evidence.mjs';
test('长转写预算分布覆盖首尾，不只截取前半段',()=>{
 const segments=Array.from({length:600},(_,i)=>({start:i*3,end:i*3+3,text:'片段'+i}));
 const result=transcriptEvidence({text:'片头'+ '中'.repeat(30000)+'片尾',segments});
 assert.equal(result.transcriptTruncated,true);assert.match(result.transcript,/片头/);assert.match(result.transcript,/片尾/);assert.ok(result.transcript.length<=24000);assert.equal(result.segments.length,150);assert.equal(result.segments.at(-1).end,1800);assert.equal(result.segmentsOmitted,450);assert.deepEqual(result.speechRange,[0,1800]);
});
test('短音频本地转写完整传递，空音轨不虚构',()=>{assert.equal(transcriptEvidence({text:'你好',segments:[]}).transcript,'你好');assert.equal(transcriptEvidence({text:'',segments:[]}).speechRange,null);});
