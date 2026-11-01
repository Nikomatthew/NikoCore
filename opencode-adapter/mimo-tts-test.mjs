import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {MiMoTTS,ttsSettings} from './mimo-tts.mjs';
test('MiMo请求使用assistant文本，验证WAV并发送record',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'niko-tts-'));fs.mkdirSync(path.join(root,'state'));
 try{
  const wav=Buffer.alloc(48);wav.write('RIFF');wav.writeUInt32LE(40,4);wav.write('WAVE',8);wav.write('fmt ',12);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(16000,24);wav.writeUInt32LE(32000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(4,40);
  const calls=[],store={value:{ttsEnabled:true,ttsVoice:'冰糖',ownerQQ:'111111',mode:'reply',revision:1}};let payload;
  const tts=new MiMoTTS(root,store,async(a,b)=>calls.push({a,b}),{fetcher:async(url,options)=>{payload=JSON.parse(options.body);return new Response(JSON.stringify({choices:[{message:{audio:{data:wav.toString('base64')}}}]}));}});
  tts.setKey('test-secret-key');await tts.receive({post_type:'message',message_type:'private',user_id:111111,self_id:222222,message_id:1,message:[{type:'text',data:{text:'/语音 你好'}}]});
  assert.equal(payload.messages[0].role,'assistant');assert.equal(payload.messages[0].content,'你好');assert.equal(calls[0].b.message[0].type,'record');assert.equal(tts.configured(),true);assert.throws(()=>ttsSettings({ttsVoice:'invalid'}));
  wav.writeUInt32LE(99,40);await assert.rejects(()=>tts.synthesize('测试'),/不完整/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
