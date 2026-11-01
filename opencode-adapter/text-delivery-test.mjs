import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {OwnerTasks,conciseResult} from './owner-tasks.mjs';

test('562字文字结果经过真实完成链路交付，而非误报QQ失败',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'nikolink-text-'));
 const calls=[];const config={ownerQQ:'123456',mode:'reply',groupEnabled:true,groups:['654321'],taskReplyAI:false};
 const tasks=new OwnerTasks(root,{value:config},async(...args)=>calls.push(args));
 const task={id:'fixture',owner:'123456',group:true,target:'654321',text:'整理新闻发在群里',status:'running',sessionID:'fixture-session',replyAI:true,textDelivery:true,delivery:'source-group',resultKind:'text',stepsNoticeAttempted:true};
 task.resultDir=path.join(tasks.root,'state','isolated','workspace',task.id);fs.mkdirSync(task.resultDir,{recursive:true});fs.writeFileSync(path.join(task.resultDir,'result.txt'),'有效内容。'.repeat(112)+'结束');tasks.items=[task];tasks.active=task;
 tasks.host={ready:true,viewSecrets:[],stop(){},async call(route){return {data:route.endsWith('/permission')?[]:[{id:'idle',type:'idle',outcome:'succeeded',content:[]}]};}};
 try{await tasks.refreshView();assert.equal(task.deliveryAttempts?.text,'sent');assert.equal(calls.filter(c=>c[0].group).length,1);assert.equal(task.progress.stage,'已完成，文字已发送');}finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('关闭结束闲聊不应关闭明确要求发群的文字任务结果',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'nikolink-text-'));
 const tasks=new OwnerTasks(root,{value:{ownerQQ:'123456',mode:'reply',groupEnabled:true,groups:['654321'],taskReplyAI:false,model:'fixture/model'}},async()=>{});
 tasks.host={ready:true,workspace:path.join(root,'workspace'),call:async(route)=>({data:route==='/api/session'?{id:'fixture'}:[]}),stop(){}};
 tasks.startMonitor=()=>{};
 try{const task=tasks.submit({owner:'123456',group:true,target:'654321',text:'帮我看看今天新闻有什么 发在群里'});await tasks.approve(task.id);assert.equal(task.textDelivery,true);assert.match(task.resultOnlyInstruction,/result.txt只写/);}finally{clearTimeout(tasks.timer);clearInterval(tasks.approvalTimer);fs.rmSync(root,{recursive:true,force:true});}
});
