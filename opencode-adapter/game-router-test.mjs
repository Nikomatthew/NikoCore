import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {GameEngine,validateGame} from './game-engine.mjs';
import {GameRooms} from './game-rooms.mjs';
import {GameRouter} from './game-router.mjs';
test('新建房指令和六位编号，入房才操作，房主退出关闭，旧入口停用',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'nikolink-game-router-'));
 try{const engine=new GameEngine(root);engine.games.set('test',validateGame({format:1,id:'test',name:'测试',enabled:true,players:[],initialCoins:0,commands:[{name:'/赚钱',description:'工作',cooldownSeconds:5,action:{type:'earn',min:1,max:1}}]}));const rooms=new GameRooms(path.join(root,'rooms')),value={gamesEnabled:true,mode:'reply',groupEnabled:true,groups:['123456'],ownerQQ:'111111',privateQQ:[],seen:[]},sent=[];const router=new GameRouter(engine,{value,save(){}},async(...args)=>sent.push(args),{rooms});const event=(id,text,user='111111')=>({post_type:'message',message_type:'group',group_id:123456,user_id:user,self_id:999999,message_id:id,message:[{type:'at',data:{qq:'999999'}},{type:'text',data:{text}}]});await router.receive(event(1,'/赚钱'));assert.equal(sent.length,0);const number=engine.numbers.get('test');await router.receive(event(2,'/游戏创建 '+number));assert.equal(sent[0][0].group,true);assert.match(sent[0][1],/房间号/);await router.receive(event(3,'/赚钱'));assert.match(sent[1][1],/余额1/);await router.receive(event(4,'/游戏退出'));assert.equal(engine.players['group:123456:111111'].active,null);assert.equal(Object.values(rooms.rooms)[0].status,'closed');await router.receive(event(5,'/游戏 test'));assert.match(sent.at(-1)[1],/请使用/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
