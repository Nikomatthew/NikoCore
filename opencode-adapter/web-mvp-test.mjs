import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {WebSocialRooms} from './web-social-rooms.mjs';
test('网页MVP仅房主可请求，评分基于结束房间，已保存评分不重复调用',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'niko-web-mvp-'));try{let calls=0;const service=new WebSocialRooms(dir,{judge:{async score(r){calls++;return {scores:r.members.map((player,i)=>({player,score:90-i})),mvp:[r.members[0]]};}}}),game={id:'spy',kind:'undercover',mvpEnabled:true};let r=service.rooms.create('spy','web:spy','a');r=service.rooms.join(r.id,'b',r.version,'join-0001');r=service.rooms.change(r.id,'a',r.version,'finish-0001',room=>{room.status='finished';room.result={winners:['a']};room.state={kind:'undercover',history:[{round:1,descriptions:{a:'描述'},votes:{}}]};});await assert.rejects(()=>service.act({...game,mvpEnabled:false},'a',{operation:'score',room:r.id,version:r.version,requestID:'score-disabled'}),/未声明/);assert.equal(calls,0);await assert.rejects(()=>service.act(game,'b',{operation:'score',room:r.id,version:r.version,requestID:'score-bad'}));const scored=await service.act(game,'a',{operation:'score',room:r.id,version:r.version,requestID:'score-good'});assert.deepEqual(scored.mvp.players,['a']);await service.act(game,'a',{operation:'score',room:r.id,version:scored.version,requestID:'score-again'});assert.equal(calls,1);}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
