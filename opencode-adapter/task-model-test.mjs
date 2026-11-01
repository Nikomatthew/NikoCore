import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { taskModel, modelSelection, TASK_STEPS } from './task-model.mjs';
import { validate, defaults } from './core.mjs';
import { OwnerTasks } from './owner-tasks.mjs';

test('任务模型独立选择并支持空白继承，不改变聊天模型', () => {
  const c=validate({taskModel:'gpt/task#high'},{...defaults,model:'deepseek/chat'});
  assert.equal(c.model,'deepseek/chat');assert.equal(taskModel(c),'gpt/task#high');
  assert.deepEqual(modelSelection(taskModel(c)),{providerID:'gpt',id:'task',variant:'high'});
  assert.equal(taskModel({...c,taskModel:''}),'deepseek/chat');
  assert.throws(()=>validate({taskModel:'bad model'},c));assert.equal(TASK_STEPS,180);
});

test('停止任务增加步数不启动任务，不改变交付权限',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'nikolink-step-'));
 const store={value:{ownerQQ:'123456',mode:'reply'},save(){}};
 const tasks=new OwnerTasks(root,store);
 tasks.items=[{id:'task',status:'interrupted',owner:'123456',delivery:'console'}];
 const result=await tasks.increaseSteps('task',60);
 assert.equal(result.steps,240);assert.equal(tasks.items[0].status,'interrupted');assert.equal(tasks.items[0].delivery,'console');assert.equal(tasks.active,null);
 await assert.rejects(tasks.increaseSteps('task',181));
 tasks.stop();
});

test('运行任务增加步数写入Agent配置且不自动提交提示或重置时限',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'nikolink-step-live-'));
 const tasks=new OwnerTasks(root,{value:{ownerQQ:'123456',mode:'reply'}});
 const task={id:'task',status:'running',owner:'123456',runExpiresAt:12345};tasks.items=[task];tasks.active=task;
 const dir=path.join(tasks.host.root,'state','isolated','config','opencode');fs.mkdirSync(dir,{recursive:true});const file=path.join(dir,'opencode.json');
 fs.writeFileSync(file,JSON.stringify({agents:{'owner-task':{steps:180,permissions:[{action:'*',effect:'ask'}]}}}));
 await tasks.increaseSteps('task',60);
 const c=JSON.parse(fs.readFileSync(file));assert.equal(c.agents['owner-task'].steps,240);assert.equal(c.agents['owner-task'].permissions[0].effect,'ask');assert.equal(task.runExpiresAt,12345);
 tasks.stop();
});
