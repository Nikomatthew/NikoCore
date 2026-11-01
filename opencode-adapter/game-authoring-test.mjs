import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {OwnerTasks} from './owner-tasks.mjs';
import {GameEngine} from './game-engine.mjs';
import {importGameTask} from './game-authoring.mjs';
test('游戏生成复用任务审批与提示，产物校验导入后默认关闭发布',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'nikolink-game-author-'));const store={value:{ownerQQ:'123456',mode:'reply',model:'fixture/model',groups:[],taskReplyAI:false}};const tasks=new OwnerTasks(root,store,async()=>{});let prompt='';
 tasks.host={ready:true,workspace:path.join(root,'workspace'),async call(route,body){if(route==='/api/session')return {data:{id:'fixture'}};if(route.endsWith('/prompt'))prompt=body.text;return {data:[]};},stop(){}};tasks.startMonitor=()=>{};
 try{const task=tasks.submit({text:'创建大亨',taskType:'game-authoring',owner:'123456',group:false,target:'123456'});await tasks.approve(task.id);assert.match(prompt,/game.json/);assert.equal(task.delivery,'console');assert.equal(task.textDelivery,false);const game={format:1,id:'demo',name:'大亨',initialCoins:0,commands:[{name:'/状态',description:'状态',cooldownSeconds:1,action:{type:'status'}}]};fs.writeFileSync(path.join(task.resultDir,'game.json'),JSON.stringify(game));assert.throws(()=>importGameTask(new GameEngine(root),task,'123456',tasks.host.workspace));task.status='succeeded';const engine=new GameEngine(root),draft=importGameTask(engine,task,'123456',tasks.host.workspace);engine.publish(draft);assert.equal(engine.find('demo').enabled,false);assert.deepEqual(engine.find('demo').players,[]);assert.throws(()=>importGameTask(engine,task,'999999',tasks.host.workspace));}finally{clearTimeout(tasks.timer);clearInterval(tasks.approvalTimer);fs.rmSync(root,{recursive:true,force:true});}
});
