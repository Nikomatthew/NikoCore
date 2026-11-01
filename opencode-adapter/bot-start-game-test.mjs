import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {GameEngine,validateGame} from './game-engine.mjs';
import {GameRooms} from './game-rooms.mjs';
import {GameRouter} from './game-router.mjs';
test('六位Bot房间、配置人数、房主开始游戏无需房号，海龟汤单人开局',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'niko-bot-start-'));try{const engine=new GameEngine(dir),rooms=new GameRooms(path.join(dir,'rooms')),value={ownerQQ:'111111',mode:'reply',gamesEnabled:true,gameJudgeModel:'fixture/model',gameMaxPlayers:20,groupEnabled:true,groups:['123456'],privateQQ:[],seen:[]},sent=[];engine.games.set('soup',validateGame({format:1,id:'soup',name:'汤',type:'bot',kind:'turtle-soup',enabled:true,initialCoins:0,players:[],puzzle:{surface:'谜面',answer:'秘密答案'},commands:[{name:'/状态',description:'状态',cooldownSeconds:1,action:{type:'status'}}]}));const router=new GameRouter(engine,{value,save(){}},async(target,text)=>sent.push({target,text}),{rooms,judge:{}}),event=(id,text,user=111111)=>({post_type:'message',message_type:'group',group_id:123456,user_id:user,self_id:999999,message_id:id,message:[{type:'at',data:{qq:'999999'}},{type:'text',data:{text}}]});await router.receive(event(1,'/游戏创建 '+engine.numbers.get('soup')));const room=Object.values(rooms.rooms)[0];assert.match(room.id,/^\d{6}$/);assert.equal(room.maxPlayers,20);await router.receive(event(2,'/开始游戏',222222));assert.equal(rooms.get(room.id).status,'waiting');await router.receive(event(3,'/开始游戏'));assert.equal(rooms.get(room.id).status,'playing');assert.match(sent.at(-1).text,/机器人担任裁判/);assert.ok(!sent.some(s=>s.text.includes('秘密答案')));assert.equal(await router.receive(event(4,'你好')),true);assert.equal(await router.receive(event(5,'你好',222222)),false);}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
