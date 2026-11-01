import test from 'node:test';
import assert from 'node:assert/strict';
import {AutoVoice} from './auto-voice.mjs';
test('自主语音开关、概率、冷却和生成失败回退',async()=>{
 const store={value:{ttsEnabled:true,ttsAutoReply:false,ttsAutoProbability:1,revision:1}},tts={configured:()=>true,synthesize:async()=>Buffer.from('audio')};let sent=0;
 const voice=new AutoVoice(tts,store,{send:async()=>{sent++;return {message_id:1};},random:()=>0,now:()=>100000});
 assert.equal((await voice.deliver({},'你好',()=>true)).sent,false);store.value.ttsAutoReply=true;
 assert.equal((await voice.deliver({},'你好',()=>true)).sent,true);assert.equal((await voice.deliver({},'你好',()=>true)).sent,false);assert.equal(sent,1);
 voice.last=0;tts.synthesize=async()=>{throw Error('provider failed');};assert.equal((await voice.deliver({},'你好',()=>true)).generationFailed,true);
});
test('自主语音AI失败回文字，配置变化取消，投递不确定禁止重复',async()=>{
 const store={value:{ttsEnabled:true,ttsAutoReply:true,ttsAutoMode:'smart',revision:1}},tts={configured:()=>true,synthesize:async()=>Buffer.from('audio')};
 const voice=new AutoVoice(tts,store,{judge:async()=>{throw Error();},send:async()=>{},now:()=>100000});assert.equal((await voice.deliver({},'你好',()=>true)).sent,false);
 voice.judge=async()=>true;tts.synthesize=async()=>{store.value.revision++;return Buffer.from('audio');};assert.equal((await voice.deliver({},'你好',()=>true)).cancelled,true);
 voice.last=0;tts.synthesize=async()=>Buffer.from('audio');voice.send=async()=>{throw Error();};await assert.rejects(()=>voice.deliver({},'你好',()=>true),/投递未确认/);
});
