import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {GameEngine,validateGame} from './game-engine.mjs';
import {GameRooms} from './game-rooms.mjs';
import {GameRouter} from './game-router.mjs';
test('群内自然提问只路由给本局AI裁判，不泄露汤底，授权变化丢弃判定',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'niko-router-ai-'));try{const engine=new GameEngine(dir),rooms=new GameRooms(path.join(dir,'rooms')),game=validateGame({format:1,id:'soup',type:'bot',name:'汤',kind:'turtle-soup',initialCoins:0,enabled:true,players:['111111','222222'],puzzle:{surface:'汤面',answer:'保密汤底'},commands:[{name:'/状态',description:'查看',cooldownSeconds:1,action:{type:'status'}}]});engine.games.set(game.id,game);let room=rooms.create('soup','group:123456','111111');room=rooms.join(room.id,'222222',room.version,'join-player');room=rooms.change(room.id,'111111',room.version,'start-state',r=>{r.status='playing';r.state={kind:'turtle-soup',aiHost:true,surface:'汤面',answer:'保密汤底',questions:[]};});const value={gamesEnabled:true,gameJudgeModel:'free/model',mode:'reply',ownerQQ:'111111',groupEnabled:true,groups:['123456'],privateQQ:[],seen:[]},sent=[];let invalidate=false;const judge={async decide(snapshot,question){assert.equal(snapshot.state.answer,'保密汤底');assert.equal(question,'下雨了吗');if(invalidate)value.gamesEnabled=false;return 'yes';}};const router=new GameRouter(engine,{value,save(){}},async(target,text)=>sent.push({target,text}),{rooms,judge});const event=id=>({post_type:'message',message_type:'group',group_id:123456,user_id:222222,self_id:999999,message_id:id,message:[{type:'at',data:{qq:'999999'}},{type:'text',data:{text:'下雨了吗'}}]});assert.equal(await router.receive(event(1)),true);assert.equal(sent[0].text,'是');assert.equal(rooms.get(room.id).state.questions.length,1);invalidate=true;await router.receive(event(2));assert.equal(rooms.get(room.id).state.questions.length,1);assert.ok(sent.every(x=>!x.text.includes('保密汤底')));}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
