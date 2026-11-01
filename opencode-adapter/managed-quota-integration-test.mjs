import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {GameEngine,validateGame} from './game-engine.mjs';
import {WebGameManager} from './test-network-manager.mjs';
import {WebGameAccounts} from './web-game-accounts.mjs';
test('真实worker创建房间经全局配额IPC，响应不串号且停止释放配额',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'niko-managed-quota-'));let manager;try{
 const engine=new GameEngine(root),game=validateGame({format:1,id:'chess',type:'web',kind:'gomoku',name:'棋',enabled:true,initialCoins:0,commands:[{name:'/状态',description:'状态',cooldownSeconds:1,action:{type:'status'}}]});engine.games.set(game.id,game);const value={gamesEnabled:true,ownerQQ:'123456',gameMaxRunning:1,gameMaxRooms:1,gameNetworkMode:'custom',gamePublicURL:'https://game.example.com',webGameLoginMode:'password'},file=path.join(root,'settings.json');fs.writeFileSync(file,JSON.stringify(value));const accounts=new WebGameAccounts(path.join(root,'accounts'));await accounts.create('player','test-password-123',['chess']);manager=new WebGameManager({engine,store:{value,file},home:root,judge:{},accountDirectory:path.join(root,'accounts')});const started=await manager.create(game,'123456','private:123456');const post=(route,data,headers={})=>fetch(started.address+route,{method:'POST',headers:{Origin:started.address,'Content-Type':'application/json',...headers},body:JSON.stringify(data)});const login=await post('/api/login',{username:'player',password:'test-password-123'}),headers={Cookie:login.headers.get('set-cookie').split(';')[0],'X-CSRF-Token':(await login.json()).csrf};const response=await post('/api/room',{game:'chess',operation:'create'},headers);assert.equal(response.status,200);const room=(await response.json()).room;assert.ok(room.id);assert.equal(manager.quota.counts().count,1);const status=await manager.status();assert.equal(status[0].rooms[0].id,room.id);await manager.stop(game,'123456',room.id);assert.equal(manager.quota.counts().count,0);
 }finally{manager?.stopAll();fs.rmSync(root,{recursive:true,force:true});}
});
