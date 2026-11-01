import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {GameEngine,validateGame} from './game-engine.mjs';
import {WebGameAccounts} from './web-game-accounts.mjs';
import {WebGameServer} from './web-game-server.mjs';
test('斗地主三账号HTTP开局隐藏底牌和他人手牌，授权及轮次由服务器检查',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'niko-card-http-'));let server;
 try{
  const engine=new GameEngine(root),accounts=new WebGameAccounts(path.join(root,'accounts'));
  engine.games.set('cards',validateGame({format:1,id:'cards',name:'斗地主',type:'web',kind:'doudizhu',enabled:true,initialCoins:0,commands:[{name:'/状态',description:'查看',cooldownSeconds:1,action:{type:'status'}}]}));
  for(const name of ['player-a','player-b','player-c','outsider'])await accounts.create(name,'test-password-123',name==='outsider'?[]:['cards']);
  server=new WebGameServer(engine,accounts,()=>({gamesEnabled:true}));const base=await server.start();
  const post=(route,data,headers={})=>fetch(base+route,{method:'POST',headers:{Origin:base,'Content-Type':'application/json',...headers},body:JSON.stringify(data)});
  const login=async username=>{const response=await post('/api/login',{username,password:'test-password-123'});return {Cookie:response.headers.get('set-cookie').split(';')[0],'X-CSRF-Token':(await response.json()).csrf};};
  const users=await Promise.all(['player-a','player-b','player-c','outsider'].map(login));let room;
  const request=(operation,extra={})=>({game:'cards',operation,room:room?.id,version:room?.version,requestID:crypto.randomUUID(),...extra});
  const act=async(index,operation,extra={})=>{const response=await post('/api/room',request(operation,extra),users[index]);const data=await response.json();assert.equal(response.status,200,JSON.stringify(data));room=data.room;return room;};
  await act(0,'create');await act(1,'join');await act(2,'join');for(const i of [0,1,2])await act(i,'ready');await act(0,'start');
  const hands=[];for(const i of [0,1,2]){await act(i,'read');assert.equal(room.state.hand.length,17);assert.equal(room.state.bottom.length,0);assert.ok(!('hands'in room.state));hands.push(room.state.hand);}
  assert.equal(new Set(hands.flat()).size,51);
  assert.equal((await post('/api/room',request('read'),users[3])).status,403);
  assert.equal((await post('/api/room',request('bid',{bid:3}),users[1])).status,400);
  await act(0,'bid',{bid:3});assert.equal(room.state.hand.length,20);assert.equal(room.state.bottom.length,3);
  const card=room.state.hand[0];await act(0,'play',{cards:[card]});
  assert.equal((await post('/api/room',request('play',{cards:[card]}),users[1])).status,400);
  await act(1,'leave');assert.equal(room.result.reason,'cancelled');
  const records=await(await post('/api/records',{game:'cards'},users[0])).json();assert.equal(records.records.wins,0);assert.equal(records.records.played,0);
 }finally{await server?.stop();fs.rmSync(root,{recursive:true,force:true});}
});
