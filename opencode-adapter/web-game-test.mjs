import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {GameEngine,validateGame} from './game-engine.mjs';
import {WebGameAccounts} from './web-game-accounts.mjs';
import {WebGameServer} from './web-game-server.mjs';
test('网页独立端口登录、权限、服务端存档、请求去重与关闭游戏',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'nikolink-web-game-'));let server;
 try{const engine=new GameEngine(root,{random:()=>0}),accounts=new WebGameAccounts(path.join(root,'accounts'));const config={gamesEnabled:true};engine.games.set('demo',validateGame({format:1,id:'demo',type:'web',enabled:true,name:'网页测试',initialCoins:0,commands:[{name:'/赚钱',description:'打工',cooldownSeconds:1,action:{type:'earn',min:10,max:10}}]}));await accounts.create('player1','test-password-123',['demo']);await accounts.create('player2','test-password-123',[]);server=new WebGameServer(engine,accounts,()=>config);const base=await server.start();const post=(route,data,headers={})=>fetch(base+route,{method:'POST',headers:{Origin:base,'Content-Type':'application/json',...headers},body:JSON.stringify(data)});
 assert.equal((await fetch(base+'/api/games')).status,401);assert.equal((await post('/api/register',{})).status,401);const login=await post('/api/login',{username:'player1',password:'test-password-123'});assert.equal(login.status,200);const cookie=login.headers.get('set-cookie').split(';')[0],csrf=(await login.json()).csrf,headers={Cookie:cookie,'X-CSRF-Token':csrf};const action={game:'demo',command:'/赚钱',requestID:'test-request-1'};assert.equal((await post('/api/action',action,{Cookie:cookie})).status,403);assert.match((await(await post('/api/action',action,headers)).json()).result,/余额10/);assert.match((await(await post('/api/action',action,headers)).json()).result,/余额10/);assert.equal(Object.values(engine.players)[0].saves.demo.coins,10);engine.games.get('demo').enabled=false;assert.equal((await post('/api/action',{...action,requestID:'test-request-2'},headers)).status,403);assert.ok(!fs.readFileSync(accounts.file,'utf8').includes('test-password-123'));await server.stop();assert.equal(accounts.get(cookie.slice('niko_game='.length)),null);
 }finally{await server?.stop();fs.rmSync(root,{recursive:true,force:true});}
});
