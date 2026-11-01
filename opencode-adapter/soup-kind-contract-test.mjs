import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {checkGeneratedGame} from './game-generation-check.mjs';
import {GameEngine,validateGame} from './game-engine.mjs';
import {GameRooms} from './game-rooms.mjs';
import {GameRouter} from './game-router.mjs';
const fake={format:1,id:'turtle-soup-001',name:'海龟汤',type:'bot',enabled:true,initialCoins:0,players:[],commands:[{name:'/赚钱',description:'赚钱',cooldownSeconds:1,action:{type:'earn',min:1,max:1}}]};
test('实际报告的赚钱模板改名海龟汤不得通过生成检查，即使旧任务requirements缺少kind',()=>{
 assert.throws(()=>checkGeneratedGame(fake,{text:'海龟汤',requirements:{multiplayer:false,leaderboard:false,presence:false}}),/玩法包/);
 assert.throws(()=>checkGeneratedGame({...fake,name:'新汤'}, {text:'修好这个bug',baseline:fake}),/玩法包/);
});
test('旧残缺海龟汤开局明确拒绝，不改房间状态、不发送泛化游戏开始',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'niko-soup-contract-'));try{
  const engine=new GameEngine(root),rooms=new GameRooms(path.join(root,'rooms')),sent=[];engine.games.set(fake.id,validateGame(fake));
  const room=rooms.create(fake.id,'group:123456','111111');
  const store={value:{gamesEnabled:true,mode:'reply',ownerQQ:'111111',groupEnabled:true,groups:['123456'],privateQQ:[],seen:[],gameJudgeModel:'fixture/model'},save(){}};
  const router=new GameRouter(engine,store,async(target,text)=>sent.push(text),{rooms,judge:{}});
  await router.receive({post_type:'message',message_type:'group',group_id:123456,user_id:111111,self_id:999999,message_id:1,message:[{type:'at',data:{qq:'999999'}},{type:'text',data:{text:'/开始游戏'}}]});
  assert.equal(rooms.get(room.id).status,'waiting');assert.match(sent[0],/游戏规则不完整/);assert.ok(!sent.includes('游戏开始'));assert.deepEqual(rooms.get(room.id).ready,[]);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
