import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {GameEngine,validateGame} from './game-engine.mjs';
import {GameRooms} from './game-rooms.mjs';
import {BotGameLifecycle} from './bot-game-lifecycle.mjs';
import {GameNumbers} from './game-numbers.mjs';
test('六位编号冲突重试，重新启动保持不变',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'niko-numbers-'));try{let i=0;const values=[231456,231456,938104],numbers=new GameNumbers(dir,{randomInt:()=>values[i++]});assert.equal(numbers.get('first'),'231456');assert.equal(numbers.get('second'),'938104');assert.equal(new GameNumbers(dir).get('first'),'231456');assert.equal(numbers.resolve('938104'),'second');}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('名单空允许加入、黑名单拒绝、一个玩家一个房、普通房主不能停别人房间',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'niko-lifecycle-'));try{const engine=new GameEngine(dir),rooms=new GameRooms(path.join(dir,'rooms')),value={ownerQQ:'999999',gameCreators:[],gameMaxRooms:4,gameMaxRunning:2},sent=[];for(const id of ['one','two'])engine.games.set(id,validateGame({format:1,id,name:id,type:'bot',enabled:true,initialCoins:0,players:[],blockedPlayers:['333333'],commands:[{name:'/状态',description:'状态',cooldownSeconds:1,action:{type:'status'}}]}));const lifecycle=new BotGameLifecycle(engine,rooms,{value},async(target,text)=>sent.push(text)),scope='group:123456',target={group:true,target:'123456'},number=engine.numbers.get('one');await lifecycle.handle('/游戏创建 '+number,scope,'111111',target,'create-0001');const first=Object.values(rooms.rooms)[0];assert.equal(first.owner,'111111');await lifecycle.handle(`/游戏加入 ${number} ${first.id}`,scope,'333333',target,'join-banned');assert.match(sent.at(-1),/没有加入/);await lifecycle.handle(`/游戏加入 ${number} ${first.id}`,scope,'222222',target,'join-allowed');assert.equal(lifecycle.membership('222222').id,first.id);await lifecycle.handle('/游戏创建 '+engine.numbers.get('two'),scope,'222222',target,'create-again');assert.match(sent.at(-1),/先退出/);await lifecycle.handle('/游戏退出',scope,'222222',target,'exit-player');await lifecycle.handle('/游戏创建 '+number,scope,'222222',target,'create-0002');assert.equal(Object.values(rooms.rooms).length,2);await lifecycle.handle('/游戏停止 '+number,scope,'111111',target,'stop-denied');assert.match(sent.at(-1),/只能关闭/);assert.equal(rooms.get(first.id).status,'waiting');await lifecycle.handle('/游戏停止 '+number,scope,'999999',target,'stop-owner');assert.ok(Object.values(rooms.rooms).every(r=>r.status==='closed'));await lifecycle.handle('/游戏列表',scope,'111111',target,'list-0001');assert.match(sent.at(-1),/游戏名 - 游戏编号/);assert.match(sent.at(-1),/\d{6}/);}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
