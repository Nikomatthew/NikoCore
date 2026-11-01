import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {GameEngine,validateGame} from './game-engine.mjs';
import {WebGameManager} from './test-network-manager.mjs';
import {WebGameAccounts} from './web-game-accounts.mjs';
test('主人指定最后一个网页房间停止后进程及端口释放，不给无关QQ关闭权限',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'niko-managed-room-stop-'));let manager;try{
 const engine=new GameEngine(root),game=validateGame({format:1,id:'chess',name:'棋',type:'web',kind:'gomoku',enabled:true,initialCoins:0,commands:[{name:'/状态',description:'状态',cooldownSeconds:1,action:{type:'status'}}]});engine.games.set(game.id,game);const config={gamesEnabled:true,ownerQQ:'123456',gameCreators:[],gameMaxRunning:1,gameMaxRooms:1,gameNetworkMode:'custom',gamePublicURL:'https://game.example.com',webGameLoginMode:'password'},file=path.join(root,'settings.json');fs.writeFileSync(file,JSON.stringify(config));const accounts=new WebGameAccounts(path.join(root,'accounts'));await accounts.create('player','test-password-123',['chess']);manager=new WebGameManager({engine,store:{value:config,file},home:root,judge:{},accountDirectory:path.join(root,'accounts')});const started=await manager.create(game,'111111','group:654321');const post=(route,input,headers={})=>fetch(started.address+route,{method:'POST',headers:{Origin:started.address,'Content-Type':'application/json',...headers},body:JSON.stringify(input)});const login=await post('/api/login',{username:'player',password:'test-password-123'}),headers={Cookie:login.headers.get('set-cookie').split(';')[0],'X-CSRF-Token':(await login.json()).csrf};const room=(await(await post('/api/room',{game:'chess',operation:'create'},headers)).json()).room;await assert.rejects(()=>manager.stop(game,'111111',room.id),/自己创建/);assert.equal((await fetch(started.address)).status,200);await manager.stop(game,'123456',room.id);assert.equal(manager.list().length,0);await assert.rejects(()=>fetch(started.address));
 }finally{manager?.stopAll();fs.rmSync(root,{recursive:true,force:true});}
});
