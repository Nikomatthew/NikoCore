import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {GameEngine,validateGame} from './game-engine.mjs';
import {WebGameAccounts} from './web-game-accounts.mjs';
import {WebGameServer} from './web-game-server.mjs';
test('两网页账号经登录授权创建加入房间，不能越权落子，棋局独立持久化',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'niko-web-chess-'));let server;
 try{const engine=new GameEngine(root),accounts=new WebGameAccounts(path.join(root,'accounts'));engine.games.set('chess',validateGame({format:1,id:'chess',name:'五子棋',type:'web',kind:'gomoku',enabled:true,initialCoins:0,commands:[{name:'/状态',description:'状态',cooldownSeconds:1,action:{type:'status'}}]}));for(const user of ['player-a','player-b','outsider'])await accounts.create(user,'test-password-123',user==='outsider'?[]:['chess']);server=new WebGameServer(engine,accounts,()=>({gamesEnabled:true}));const base=await server.start();
 const post=(route,input,headers={})=>fetch(base+route,{method:'POST',headers:{Origin:base,'Content-Type':'application/json',...headers},body:JSON.stringify(input)});
 const login=async username=>{const response=await post('/api/login',{username,password:'test-password-123'});return {Cookie:response.headers.get('set-cookie').split(';')[0],'X-CSRF-Token':(await response.json()).csrf};};const a=await login('player-a'),b=await login('player-b'),other=await login('outsider');
 let result=await post('/api/room',{game:'chess',operation:'create'},a),room=(await result.json()).room;assert.ok(room.id);assert.equal((await post('/api/room',{game:'chess',operation:'read',room:room.id},other)).status,403);
  result=await post('/api/room',{game:'chess',operation:'join',room:room.id,requestID:'join-request'},b);room=(await result.json()).room;assert.equal(room.players.length,2);
  assert.equal((await(await post('/api/rooms',{game:'chess'},a)).json()).rooms[0].id,room.id);assert.equal((await post('/api/rooms',{game:'chess'},other)).status,403);
 assert.equal((await post('/api/room',{game:'chess',operation:'move',room:room.id,version:room.version,x:0,y:0,requestID:'wrong-turn'},b)).status,400);
 room=(await(await post('/api/room',{game:'chess',operation:'move',room:room.id,version:room.version,x:0,y:0,requestID:'valid-move'},a)).json()).room;assert.equal(room.state.board[0],1);
 assert.equal((await post('/api/room',{game:'chess',operation:'move',room:room.id,version:room.version,x:0,y:0,requestID:'occupied-move'},b)).status,400);
  room=(await(await post('/api/room',{game:'chess',operation:'leave',room:room.id,version:room.version,requestID:'leave-valid'},b)).json()).room;assert.equal(room.status,'finished');
  const records=await(await post('/api/records',{game:'chess'},a)).json();assert.equal(records.records.wins,1);await post('/api/room',{game:'chess',operation:'read',room:room.id},a);assert.equal((await(await post('/api/records',{game:'chess'},a)).json()).records.wins,1);
  engine.games.get('chess').enabled=false;assert.equal((await post('/api/room',{game:'chess',operation:'read',room:room.id},a)).status,403);
 }finally{await server?.stop();fs.rmSync(root,{recursive:true,force:true});}
});
