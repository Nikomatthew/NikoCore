import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {WebSocialRooms} from './web-social-rooms.mjs';
test('开局前重查全部成员，撤权者不能读取或参与秘密游戏',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'niko-room-auth-'));try{const allowed=new Set(['a','b','c']),service=new WebSocialRooms(dir,{authorized:(game,user)=>allowed.has(user)}),game={id:'spy',kind:'undercover',wordPairs:[['苹果','梨子']]};let room=await service.act(game,'a',{operation:'create'});for(const user of ['b','c'])room=await service.act(game,user,{operation:'join',room:room.id,requestID:'join-'+user+'-0001'});for(const user of ['a','b','c'])room=await service.act(game,user,{operation:'ready',room:room.id,version:room.version,requestID:'ready-'+user+'-001'});allowed.delete('b');await assert.rejects(()=>service.act(game,'a',{operation:'start',room:room.id,version:room.version,requestID:'start-0001'}),/成员已失去/);await assert.rejects(()=>service.act(game,'b',{operation:'read',room:room.id}),/授权已失效/);assert.equal(service.rooms.get(room.id).status,'waiting');}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('AI判题期间撤权不记录结果，网页不给客户端汤底',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'niko-room-judge-auth-'));try{let allowed=true;const service=new WebSocialRooms(dir,{authorized:()=>allowed,judge:{async decide(){allowed=false;return 'yes';}}}),game={id:'soup',kind:'turtle-soup',puzzle:{surface:'谜面',answer:'秘密'}};let r=await service.act(game,'a',{operation:'create'});r=await service.act(game,'b',{operation:'join',room:r.id,requestID:'join-0001'});for(const user of ['a','b'])r=await service.act(game,user,{operation:'ready',room:r.id,version:r.version,requestID:'ready-'+user+'-001'});r=await service.act(game,'a',{operation:'start',room:r.id,version:r.version,requestID:'start-0001'});await assert.rejects(()=>service.act(game,'b',{operation:'question',text:'问题',room:r.id,version:r.version,requestID:'question-001'}),/授权改变/);assert.equal(service.rooms.get(r.id).state.questions.length,0);assert.ok(!JSON.stringify(r).includes('秘密'));}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
