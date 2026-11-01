import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import {GameEngine,validateGame} from './game-engine.mjs';
import {WebGameManager} from './web-game-manager.mjs';
test('自备映射端口实际监听并在停服后释放映射',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'nikolink-fixed-route-')),probe=net.createServer();await new Promise(resolve=>probe.listen(0,'127.0.0.1',resolve));const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));let manager;
 try{const engine=new GameEngine(root),game=validateGame({format:1,id:'demo',name:'Demo',type:'web',kind:'gomoku',enabled:true,initialCoins:0,commands:[{name:'/状态',description:'状态',cooldownSeconds:1,action:{type:'status'}}]});engine.games.set(game.id,game);const value={gamesEnabled:true,ownerQQ:'111111',gameCreators:[],gameMaxRunning:2,gameNetworkMode:'custom',gamePortMappings:port+' https://route.example.com',webGameLoginMode:'qq'},file=path.join(root,'settings.json');fs.writeFileSync(file,JSON.stringify(value));manager=new WebGameManager({engine,store:{value,file},home:root,judge:{},accountDirectory:path.join(root,'accounts')});const result=await manager.create(game,'111111','private:111111');assert.equal(new URL(result.address).port,String(port));assert.equal(result.url,'https://route.example.com');assert.equal((await fetch(result.address)).status,200);await manager.stop(game,'111111');assert.equal(manager.routeClaims.size,0);await assert.rejects(()=>fetch(result.address));}finally{manager?.stopAll();fs.rmSync(root,{recursive:true,force:true});}
});
