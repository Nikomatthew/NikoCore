import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ScheduledTools } from './scheduled-tools.mjs';
import { scanTaskTools } from './task-tool-registry.mjs';
import { executeTaskTool } from './task-tool-runner.mjs';

function fixture(){
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'nikolink-schedule-'));
 const folder=path.join(home,'task-tools','echo');fs.mkdirSync(folder,{recursive:true});
 fs.writeFileSync(path.join(folder,'tool.json'),JSON.stringify({name:'echo',description:'test',entry:'index.mjs',inputSchema:{type:'object',required:['value']}}));
 fs.writeFileSync(path.join(folder,'index.mjs'),'export async function run(args){return args;}');
 const hash=scanTaskTools(path.join(home,'task-tools'))[0].hash;
 const store={value:{ownerQQ:'123456',mode:'reply',taskToolApprovals:{echo:hash},groupEnabled:true,groups:['234567']}};
 let now=100000;const calls=[],sent=[];
 const options={now:()=>now,execute:async input=>{calls.push(input);fs.writeFileSync(path.join(input.workspace,'answer.md'),'hello');return {file:'answer.md'};},deliver:async(...args)=>sent.push(args)};
 const service=new ScheduledTools(home,store,options);
 return {home,folder,store,service,calls,sent,options,setNow:value=>now=value};
}

test('定时工具在到期后执行一次，不调用AI，按创建目标投递',async()=>{
 const f=fixture();const p=f.service.create({at:new Date(101000).toISOString(),tool:'echo',args:{value:'x'},delivery:'group',group:'234567'});
 await f.service.tick();assert.equal(f.calls.length,0);f.setNow(101001);await f.service.tick();await f.service.tick();
 assert.equal(f.calls.length,1);assert.equal(p.status,'completed');assert.equal(f.sent.length,1);assert.deepEqual(f.sent[0][0],{group:true,target:'234567'});assert.equal(p.deliveryState,'sent');
});

test('计划重启错过不补发，变更主人或禁用工具不执行，取消保留记录',async()=>{
 const f=fixture();const p=f.service.create({at:new Date(101000).toISOString(),tool:'echo',args:{value:'x'}});
 f.setNow(102000);const restored=new ScheduledTools(f.home,f.store,f.options);assert.equal(restored.items[0].status,'missed');await restored.tick();assert.equal(f.calls.length,0);
 f.setNow(100000);const cancelled=f.service.create({at:new Date(103000).toISOString(),tool:'echo',args:{value:'x'}});f.service.cancel(cancelled.id);assert.equal(cancelled.status,'cancelled');
 f.store.value.ownerQQ='345678';f.setNow(101001);await f.service.tick();assert.equal(p.status,'blocked');assert.equal(f.calls.length,0);
});

test('工具文件变化使计划失败且不重试，不允许未授权投递群',async()=>{
 const f=fixture();assert.throws(()=>f.service.create({at:new Date(101000).toISOString(),tool:'echo',args:{value:'x'},delivery:'group',group:'999999'}));
 const p=f.service.create({at:new Date(101000).toISOString(),tool:'echo',args:{value:'x'}});
 f.service.execute=executeTaskTool;fs.appendFileSync(path.join(f.folder,'index.mjs'),'\n');f.setNow(101001);await f.service.tick();assert.equal(p.status,'failed');await f.service.tick();assert.equal(f.sent.length,0);
});
