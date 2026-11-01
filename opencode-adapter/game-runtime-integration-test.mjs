import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {GameScriptService} from './game-script-service.mjs';
import {StandaloneWorlds} from './standalone-worlds.mjs';
import {archiveWebGamePackage,standaloneGameRecord} from './web-game-package.mjs';
test('受限后端独立线程可运行与终止',async()=>{
 const script=await GameScriptService.create('function update(state,input,dt){return {state:{count:(state.count||0)+1},player:input.player};}');
 try{assert.equal((await script.update({}, {player:'a'},.05)).state.count,1);}finally{script.close();}
});
test('独立游戏受限包连通房间共享状态，无权玩家不可访问',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'niko-script-integration-')),dir=path.join(root,'package');fs.mkdirSync(path.join(dir,'server'),{recursive:true});
 fs.writeFileSync(path.join(dir,'index.html'),'<html></html>');fs.writeFileSync(path.join(dir,'server','main.js'),'function update(state,input,dt){return {state:{count:(state.count||0)+1,last:input.player}};}');
 fs.writeFileSync(path.join(dir,'game.web.json'),JSON.stringify({format:1,id:'demo',name:'Demo',type:'web',runtime:'standalone',dimension:'2d',entry:'index.html',files:['index.html','server/main.js'],server:'server/main.js',backend:'quickjs-v1',inputs:['click'],toolkit:['rooms','world'],features:{},assets:[]}));
 const archive=archiveWebGamePackage(dir,path.join(root,'web-packages')),game={...standaloneGameRecord(archive),enabled:true},room={id:'123456',game:'demo',status:'playing',players:['a','b']};
 const service={engine:{root,find:()=>game},runtime:{entry:()=>({runtime:{},rooms:()=>({'123456':room})})},sessionMemberAllowed:()=>true,config:()=>({gamesEnabled:true})};const worlds=new StandaloneWorlds(service);
 try{assert.equal((await worlds.custom(game,'a',{operation:'action',room:room.id,action:{}})).state.count,1);assert.equal((await worlds.custom(game,'b',{operation:'action',room:room.id,action:{}})).state.count,2);await assert.rejects(()=>worlds.custom(game,'x',{operation:'action',room:room.id,action:{}}),/成员/);}finally{worlds.close();fs.rmSync(root,{recursive:true,force:true});}
});
