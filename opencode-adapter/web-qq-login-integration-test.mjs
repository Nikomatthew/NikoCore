import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {GameEngine,validateGame} from './game-engine.mjs';
import {WebGameAccounts} from './web-game-accounts.mjs';
import {WebGameServer} from './web-game-server.mjs';
import {QQGameLogin} from './web-game-login.mjs';
test('QQ网页登录绑定浏览器cookie、一次确认，空白名单开放且改模式立即拒绝',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'niko-qq-web-'));let server;try{
 const engine=new GameEngine(root),config={gamesEnabled:true,webGameLoginMode:'qq',webGameQQAllowlist:[]},accounts=new WebGameAccounts(path.join(root,'accounts')),qqLogin=new QQGameLogin(()=>config);engine.games.set('demo',validateGame({format:1,id:'demo',name:'游戏',type:'web',enabled:true,initialCoins:0,commands:[{name:'/状态',description:'状态',cooldownSeconds:1,action:{type:'status'}}]}));server=new WebGameServer(engine,accounts,()=>config,{qqLogin});const base=await server.start();const post=(route,data={},headers={})=>fetch(base+route,{method:'POST',headers:{Origin:base,'Content-Type':'application/json',...headers},body:JSON.stringify(data)});
 const begin=await post('/api/qq-login/begin'),cookie=begin.headers.get('set-cookie').split(';')[0],attempt=await begin.json();qqLogin.verify('123456',attempt.code);assert.equal((await post('/api/qq-login/complete')).status,400);assert.equal((await(await post('/api/qq-login/poll',{}, {Cookie:cookie})).json()).ready,true);const complete=await post('/api/qq-login/complete',{}, {Cookie:cookie});assert.equal(complete.status,200);const sessionCookie=complete.headers.get('set-cookie').split(';')[0];assert.equal((await fetch(base+'/api/games',{headers:{Cookie:sessionCookie}})).status,200);assert.equal((await post('/api/qq-login/complete',{}, {Cookie:cookie})).status,400);assert.equal((await post('/api/login',{username:'player',password:'password123'})).status,400);config.webGameQQAllowlist=['999999'];assert.equal((await fetch(base+'/api/games',{headers:{Cookie:sessionCookie}})).status,401);
 }finally{await server?.stop();fs.rmSync(root,{recursive:true,force:true});}
});
