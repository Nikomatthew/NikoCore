import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {GameEngine,validateGame} from './game-engine.mjs';
import {WebGameAccounts} from './web-game-accounts.mjs';
import {WebGameServer} from './web-game-server.mjs';
test('网页三账号卧底HTTP流程隔离秘密与权限，投票完成后持久化',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'niko-web-spy-http-'));let server;
 try{
  const engine=new GameEngine(root),accounts=new WebGameAccounts(path.join(root,'accounts'));
  engine.games.set('spy',validateGame({format:1,id:'spy',name:'卧底',type:'web',kind:'undercover',enabled:true,initialCoins:0,wordPairs:[['苹果','梨子']],commands:[{name:'/状态',description:'状态',cooldownSeconds:1,action:{type:'status'}}]}));
  for(const username of ['player-a','player-b','player-c','outsider'])await accounts.create(username,'test-password-123',username==='outsider'?[]:['spy']);
  server=new WebGameServer(engine,accounts,()=>({gamesEnabled:true}));const base=await server.start();
  const post=(route,input,headers={})=>fetch(base+route,{method:'POST',headers:{Origin:base,'Content-Type':'application/json',...headers},body:JSON.stringify(input)});
  const login=async username=>{const response=await post('/api/login',{username,password:'test-password-123'});return {Cookie:response.headers.get('set-cookie').split(';')[0],'X-CSRF-Token':(await response.json()).csrf};};
  const users=await Promise.all(['player-a','player-b','player-c','outsider'].map(login));let room;
  const act=async(index,operation,extra={})=>{const response=await post('/api/room',{game:'spy',operation,room:room?.id,version:room?.version,requestID:'request-'+crypto.randomUUID(),...extra},users[index]);const data=await response.json();assert.equal(response.status,200,JSON.stringify(data));room=data.room;return room;};
  await act(0,'create');await act(1,'join');await act(2,'join');
  const unauthorized=await post('/api/room',{game:'spy',operation:'read',room:room.id},users[3]);assert.equal(unauthorized.status,403);
  for(let i=0;i<3;i++)await act(i,'ready');await act(0,'start');
  for(let i=0;i<3;i++){await act(i,'read');assert.ok(['苹果','梨子'].includes(room.privateWord));assert.ok(!('words'in room));assert.ok(!('spy'in room));assert.ok(!('answer'in room));await act(i,'confirm');}
  assert.equal(room.status,'playing');for(let i=0;i<3;i++)await act(i,'describe',{text:'一种水果'});
  for(const [i,seat]of [[0,2],[1,1],[2,1]])await act(i,'vote',{seat});
  const stored=server.socialRooms.rooms.get(room.id);assert.ok(stored.version>10);assert.ok(['playing','finished'].includes(room.status));assert.equal(room.privateWord,stored.state.words[room.self]);
  engine.games.get('spy').enabled=false;assert.equal((await post('/api/room',{game:'spy',operation:'read',room:room.id},users[0])).status,403);
 }finally{await server?.stop();fs.rmSync(root,{recursive:true,force:true});}
});
