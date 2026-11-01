import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {judgeStandalone,assertJudgeAllowed} from './standalone-judge.mjs';
import {archiveWebGamePackage,standaloneGameRecord} from './web-game-package.mjs';
test('独立裁判服务端读秘密答案，禁用与非成员不调用模型，结果只发判定',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'nikolink-judge-')),dir=path.join(root,'package');fs.mkdirSync(path.join(dir,'server'),{recursive:true});
 try{fs.writeFileSync(path.join(dir,'index.html'),'<html></html>');fs.writeFileSync(path.join(dir,'server/judge.json'),JSON.stringify({version:1,objectives:[{id:'puzzle',mode:'solution',prompt:'解谜',answer:'private-fixture-answer'}]}));fs.writeFileSync(path.join(dir,'game.web.json'),JSON.stringify({format:1,id:'demo',name:'Demo',type:'web',runtime:'standalone',dimension:'2d',entry:'index.html',files:['index.html','server/judge.json'],inputs:['text'],toolkit:['rooms','judge'],features:{},assets:[]}));const archive=archiveWebGamePackage(dir,path.join(root,'web-packages')),game={...standaloneGameRecord(archive),enabled:true},room={id:'123456',status:'playing',players:['a']};let calls=0;const service={engine:{root,find:()=>game},config:()=>({gamesEnabled:true}),runtime:{entry:()=>({runtime:{},rooms:()=>({'123456':room})})},sessionMemberAllowed:()=>true,judge:{evaluate:async(r,o,t)=>{calls++;assert.equal(o.answer,'private-fixture-answer');return {verdict:'solved'};}}};
 assert.deepEqual(await judgeStandalone(service,game,'a',{room:room.id,objective:'puzzle',text:'解答'}),{verdict:'solved'});game.judgeForbidden=true;assert.throws(()=>assertJudgeAllowed(game),/AI裁判功能未开启/);await assert.rejects(()=>judgeStandalone(service,game,'a',{room:room.id,objective:'puzzle',text:'解答'}),/未开启/);assert.equal(calls,1);game.judgeForbidden=false;await assert.rejects(()=>judgeStandalone(service,game,'outsider',{room:room.id,objective:'puzzle',text:'解答'}),/成员/);assert.equal(calls,1);
 service.judge.evaluate=async()=>{game.judgeForbidden=true;return {verdict:'solved'};};await assert.rejects(()=>judgeStandalone(service,game,'a',{room:room.id,objective:'puzzle',text:'解答'}),/未开启/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
