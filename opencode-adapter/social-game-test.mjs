import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {GameRooms} from './game-rooms.mjs';
import {SocialGameSession} from './social-game-session.mjs';
test('AI主持海龟汤不向房主发送汤底，直接进入公开提问阶段',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'niko-ai-soup-'));try{const rooms=new GameRooms(dir),sent=[],game={kind:'turtle-soup',players:['111111','222222'],puzzle:{surface:'汤面',answer:'秘密答案'}};let room=rooms.create('soup','group:123456','111111');room=rooms.join(room.id,'222222',room.version,'join-player');for(const id of game.players)room=rooms.ready(room.id,id,room.version,'ready-'+id);const session=new SocialGameSession(rooms,async(...args)=>sent.push(args),{aiHost:()=>true});const text=await session.start(room,game,'111111','start-ai-soup');assert.equal(sent.length,0);assert.ok(!text.includes('秘密答案'));assert.match(text,/机器人担任裁判/);assert.equal(rooms.get(room.id).status,'playing');assert.equal(rooms.get(room.id).state.aiHost,true);}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('卧底私发词语、全员确认、顺序描述与投票结算',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'niko-social-'));try{const rooms=new GameRooms(dir),sent=[],game={kind:'undercover',wordPairs:[['苹果','梨子']],players:['111111','222222','333333']};let r=rooms.create('demo','group:123456','111111');for(const id of game.players.slice(1))r=rooms.join(r.id,id,r.version,'join-'+id);for(const id of game.players)r=rooms.ready(r.id,id,r.version,'ready-'+id);const session=new SocialGameSession(rooms,async(target,text)=>sent.push({target,text}),{randomInt:()=>0});await session.start(r,game,'111111','request-start');assert.equal(sent.length,3);assert.ok(sent.every(x=>!x.target.group));assert.ok(!sent[1].text.includes('梨子'));r=rooms.get(r.id);assert.equal(r.status,'dealing');for(const id of game.players){session.act(r,id,'/确认身份',[],'confirm-'+id);r=rooms.get(r.id);}assert.equal(r.status,'playing');assert.throws(()=>session.act(r,'222222','/描述',['水果'],'wrong-turn'));for(const id of game.players){session.act(r,id,'/描述',['一种水果'],'describe-'+id);r=rooms.get(r.id);}for(const [id,seat]of [['111111','2'],['222222','1'],['333333','1']]){session.act(r,id,'/投票',[seat],'vote-'+id);r=rooms.get(r.id);}assert.equal(r.status,'finished');}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('角色投递失败保留不确定状态，不允许确认开局',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'niko-soup-'));try{const rooms=new GameRooms(dir),game={kind:'turtle-soup',players:['111111','222222'],puzzle:{surface:'他为什么关门？',answer:'风太大。'}};let r=rooms.create('soup','group:123456','111111');r=rooms.join(r.id,'222222',r.version,'join-player');for(const id of game.players)r=rooms.ready(r.id,id,r.version,'ready-'+id);const session=new SocialGameSession(rooms,async()=>{throw Error('QQ failed');});await session.start(r,game,'111111','start-failed');r=rooms.get(r.id);assert.equal(r.status,'dealing');assert.equal(r.state.delivery['111111'],'uncertain');assert.throws(()=>session.act(r,'111111','/确认身份',[],'confirm-failed'));}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
