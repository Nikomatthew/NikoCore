import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { scanTaskTools, setToolApproval } from './task-tool-registry.mjs';

function fixture(){const home=fs.mkdtempSync(path.join(os.tmpdir(),'nikolink-plugin-'));const directory=path.join(home,'task-tools');const folder=path.join(directory,'echo');fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(path.join(folder,'tool.json'),JSON.stringify({name:'echo',description:'test',entry:'index.mjs',inputSchema:{type:'object',required:['value']}}));fs.writeFileSync(path.join(folder,'index.mjs'),'export async function run(args){return {echo:args.value};}');return {home,directory,folder};}

test('工具默认禁用，按内容批准，改动文件自动失效，越界入口拒绝',()=>{
const {directory,folder}=fixture();const tool=scanTaskTools(directory)[0];assert.equal(tool.enabled,false);const approval=setToolApproval(directory,{},'echo',tool.hash,true);assert.equal(scanTaskTools(directory,approval)[0].enabled,true);fs.appendFileSync(path.join(folder,'index.mjs'),'\n');assert.equal(scanTaskTools(directory,approval)[0].enabled,false);assert.throws(()=>setToolApproval(directory,approval,'echo',tool.hash,true));const m=JSON.parse(fs.readFileSync(path.join(folder,'tool.json')));m.entry='../evil.mjs';fs.writeFileSync(path.join(folder,'tool.json'),JSON.stringify(m));assert.ok(scanTaskTools(directory)[0].error);
});

test('stdio MCP仅列出批准工具并可运行，配置禁用后不再调用',async()=>{
const {home,directory}=fixture();fs.mkdirSync(path.join(home,'tools'));fs.copyFileSync(new URL('../tools/task-tool-worker.mjs',import.meta.url),path.join(home,'tools/task-tool-worker.mjs'));
const settings=path.join(home,'settings.json');const tool=scanTaskTools(directory)[0];fs.writeFileSync(settings,JSON.stringify({taskToolApprovals:{echo:tool.hash}}));
const child=spawn(process.execPath,[new URL('../scripts/task-tools-entry.mjs',import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1')],{env:{...process.env,NIKOLINK_HOME:home,NIKOLINK_TOOL_SETTINGS:settings,NIKOLINK_TOOL_WORKSPACE:home,NIKOLINK_TOOL_NODE:process.execPath},stdio:['pipe','pipe','pipe']});
let buffer='',serial=0;const waiting=new Map();child.stderr.resume();child.stdout.on('data',chunk=>{buffer+=chunk;let i;while((i=buffer.indexOf('\n'))>=0){const value=JSON.parse(buffer.slice(0,i));buffer=buffer.slice(i+1);waiting.get(value.id)?.(value);waiting.delete(value.id);}});
function call(method,params={}){const id=++serial;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('MCP测试超时')),5000);waiting.set(id,value=>{clearTimeout(timer);resolve(value)});child.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n');});}
try{assert.equal((await call('initialize')).result.serverInfo.name,'nikolink-task-tools');assert.deepEqual((await call('tools/list')).result.tools.map(t=>t.name),['echo','nikolink_result_page']);const result=await call('tools/call',{name:'echo',arguments:{value:'hello'}});assert.deepEqual(JSON.parse(result.result.content[0].text),{echo:'hello'});fs.writeFileSync(settings,JSON.stringify({taskToolApprovals:{}}));assert.equal((await call('tools/call',{name:'echo',arguments:{value:'x'}})).result.isError,true);}finally{child.kill();}
});
