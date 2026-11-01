import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {OwnerTasks} from './owner-tasks.mjs';
test('游戏任务实际完成链路拒绝多人需求的单人产物，不标记成功',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'niko-task-contract-'));try{const task={id:'12345678-1234-1234-1234-123456789abc',owner:'123456',text:'制作多人小游戏，有在线人数和排行榜',taskType:'game-authoring',gameType:'web',resultKind:'text',status:'running',sessionID:'fixture',replyAI:true,stepsNoticeAttempted:true};const tasks=new OwnerTasks(root,{value:{ownerQQ:'123456',mode:'reply'}},async()=>{});task.resultDir=path.join(tasks.root,'state','isolated','workspace',task.id);fs.mkdirSync(task.resultDir,{recursive:true});fs.writeFileSync(path.join(task.resultDir,'game.json'),JSON.stringify({id:'incomplete',kind:'flow'}));tasks.items=[task];tasks.active=task;let archived=0;tasks.onGameCompleted=()=>archived++;tasks.host={ready:true,viewSecrets:[],stop(){},async call(route){return {data:route.endsWith('/permission')?[]:[{id:'idle',type:'idle',outcome:'succeeded',content:[]}]};}};await tasks.refreshView();assert.equal(task.status,'failed');assert.match(task.deliveryError,/多人房间/);assert.match(task.deliveryError,/排行榜/);assert.equal(archived,1);}finally{fs.rmSync(root,{recursive:true,force:true});}
});
