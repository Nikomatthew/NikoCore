import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import WebSocket from 'ws';
import {GameEngine,validateGame} from './game-engine.mjs';
import {WebGameAccounts} from './web-game-accounts.mjs';
import {WebGameServer} from './web-game-server.mjs';
function open(url,headers){return new Promise((resolve,reject)=>{const ws=new WebSocket(url,{headers});ws.once('open',()=>resolve(ws));ws.once('error',reject);});}
function frame(ws,input){return new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('FPS frame timeout')),3000);ws.once('message',data=>{clearTimeout(timeout);resolve(JSON.parse(data.toString()));});ws.send(JSON.stringify(input));});}
test('FPS双账号WebSocket登录/CSRF/房间授权与实时状态，停止关闭连接',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'niko-fps-http-'));let server;const sockets=[];
 try{const engine=new GameEngine(root),accounts=new WebGameAccounts(path.join(root,'accounts'));engine.games.set('arena',validateGame({format:1,id:'arena',type:'web',kind:'fps',enabled:true,name:'竞技',initialCoins:0,commands:[{name:'/状态',description:'状态',cooldownSeconds:1,action:{type:'status'}}]}));for(const user of ['player-a','player-b','outsider'])await accounts.create(user,'test-password-123',user==='outsider'?[]:['arena']);server=new WebGameServer(engine,accounts,()=>({gamesEnabled:true}));const base=await server.start(),wsURL=base.replace('http:','ws:')+'/fps-socket';
 const post=(route,data,headers={})=>fetch(base+route,{method:'POST',headers:{Origin:base,'Content-Type':'application/json',...headers},body:JSON.stringify(data)});const login=async username=>{const r=await post('/api/login',{username,password:'test-password-123'});return {Cookie:r.headers.get('set-cookie').split(';')[0],'X-CSRF-Token':(await r.json()).csrf};};const a=await login('player-a'),b=await login('player-b'),other=await login('outsider');let room=(await(await post('/api/room',{game:'arena',operation:'create'},a)).json()).room;room=(await(await post('/api/room',{game:'arena',operation:'join',room:room.id},b)).json()).room;
 await assert.rejects(()=>open(wsURL,{Origin:'http://evil.example',Cookie:a.Cookie}));await assert.rejects(()=>open(wsURL,{Origin:base}));
 const wa=await open(wsURL,{Origin:base,Cookie:a.Cookie}),wb=await open(wsURL,{Origin:base,Cookie:b.Cookie});sockets.push(wa,wb);const input={game:'arena',room:room.id,seq:1,angle:0,forward:0,strafe:0,fire:false};const first=await frame(wa,{...input,csrf:a['X-CSRF-Token']});assert.equal(first.room.units.length,2);const second=await frame(wb,{...input,csrf:b['X-CSRF-Token']});assert.equal(second.room.self,room.players[1]);
 const wo=await open(wsURL,{Origin:base,Cookie:other.Cookie});sockets.push(wo);assert.ok((await frame(wo,{...input,csrf:other['X-CSRF-Token']})).error);
 const bad=await open(wsURL,{Origin:base,Cookie:a.Cookie});sockets.push(bad);assert.ok((await frame(bad,{...input,csrf:'bad'})).error);
 await server.stop();assert.equal(server.server,null);
 }finally{for(const ws of sockets)ws.terminate();await server?.stop();fs.rmSync(root,{recursive:true,force:true});}
});
