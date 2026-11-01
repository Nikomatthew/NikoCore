import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {GameEngine} from './game-engine.mjs';
import {GameRooms} from './game-rooms.mjs';
import {GameRouter} from './game-router.mjs';
import {blocksOrdinaryChat} from './game-chat-gate.mjs';
test('Bot房内玩家普通消息不进入聊天，房外不受影响，退出恢复',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'niko-chat-gate-'));try{const engine=new GameEngine(dir),rooms=new GameRooms(path.join(dir,'rooms'));const room=rooms.create('demo','group:123456','111111');const store={value:{ownerQQ:'111111',gamesEnabled:true,mode:'reply',groups:['123456'],groupEnabled:true,privateQQ:[],seen:[]},save(){}};const router=new GameRouter(engine,store,async()=>{},{rooms});const event=(user,text)=>({post_type:'message',message_type:'group',group_id:123456,user_id:user,self_id:999999,message_id:1,message:[{type:'at',data:{qq:'999999'}},{type:'text',data:{text}}]});assert.equal(await router.receive(event(111111,'你好')),true);assert.equal(await router.receive(event(222222,'你好')),false);assert.equal(await router.receive(event(111111,'/任务 检查文件')),false);assert.equal(blocksOrdinaryChat(rooms.rooms,'111111'),true);rooms.change(room.id,'111111',room.version,'close-test',r=>{r.status='closed';});assert.equal(await router.receive(event(111111,'你好')),false);}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
