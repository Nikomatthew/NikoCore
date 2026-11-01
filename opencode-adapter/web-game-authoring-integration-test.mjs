import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {OwnerTasks} from './owner-tasks.mjs';
import {GameEngine} from './game-engine.mjs';
import {importGameTask} from './game-authoring.mjs';
import {WebGameAccounts} from './web-game-accounts.mjs';
import {WebGameServer} from './web-game-server.mjs';
test('网页生成任务→产物校验→审核发布→账号授权→创建真实游戏房间',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'niko-web-author-e2e-'));let server;const tasks=new OwnerTasks(root,{value:{ownerQQ:'123456',mode:'reply',model:'fixture/model',taskReplyAI:false}},async()=>{});let prompt='';
 tasks.host={ready:true,workspace:path.join(root,'workspace'),async call(route,body){if(route==='/api/session')return {data:{id:'fixture-session'}};if(route.endsWith('/prompt'))prompt=body.text;return {data:[]};},stop(){}};tasks.startMonitor=()=>{};
  try{const task=tasks.submit({text:'生成网页五子棋',taskType:'game-authoring',gameType:'web',owner:'123456',group:false,target:'123456'});await tasks.approve(task.id);assert.match(prompt,/game.web.json/);assert.match(prompt,/不要强制使用commands/);assert.equal(task.delivery,'console');
 const output={format:1,id:'generated-chess',type:'web',kind:'gomoku',name:'生成五子棋',initialCoins:0,commands:[{name:'/状态',description:'查看',cooldownSeconds:1,action:{type:'status'}}],webUI:{format:1,layout:'cards',title:'生成棋盘',description:'两人游玩',accent:'#8eb4f0',buttons:[]}};fs.writeFileSync(path.join(task.resultDir,'game.json'),JSON.stringify(output));task.status='succeeded';const engine=new GameEngine(root),draft=importGameTask(engine,task,'123456',tasks.host.workspace);engine.publish(draft);assert.equal(engine.find(output.id).enabled,false);engine.configure(output.id,{enabled:true,players:[]});
 const accounts=new WebGameAccounts(path.join(root,'accounts'));await accounts.create('player1','test-password-123',[output.id]);server=new WebGameServer(engine,accounts,()=>({gamesEnabled:true}));const base=await server.start();const post=(route,input,headers={})=>fetch(base+route,{method:'POST',headers:{Origin:base,'Content-Type':'application/json',...headers},body:JSON.stringify(input)});const login=await post('/api/login',{username:'player1',password:'test-password-123'}),headers={Cookie:login.headers.get('set-cookie').split(';')[0],'X-CSRF-Token':(await login.json()).csrf};const response=await post('/api/room',{game:output.id,operation:'create'},headers);assert.equal(response.status,200);assert.equal((await response.json()).room.game,output.id);
 }finally{clearTimeout(tasks.timer);clearInterval(tasks.approvalTimer);await server?.stop();fs.rmSync(root,{recursive:true,force:true});}
});
