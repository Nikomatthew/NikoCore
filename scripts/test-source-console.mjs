import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
const home=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'nikolink-source-console-'));
const child=spawn(process.execPath,[path.join(home,'opencode-adapter/server.mjs')],{env:{...process.env,NIKOLINK_HOME:home,NIKOLINK_APP_ROOT:root,NIKOLINK_PANEL_PORT:'0',NIKOLINK_OFFLINE_CHECK:'1'},stdio:['ignore','pipe','pipe']});
child.stdout.resume();child.stderr.resume();let base;
try{
 for(let n=0;n<60;n++){try{base=fs.readFileSync(path.join(root,'state/panel.url'),'utf8').trim();if((await fetch(base+'api/auth/status')).ok)break;}catch{}await delay(100);}
 assert.ok(base,'控制台启动失败');
 const get=pathname=>fetch(base+pathname);
 const post=(pathname,body,token)=>fetch(base+pathname,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});
 for(const pathname of ['api/state','api/output','api/browser-image'])assert.equal((await get(pathname)).status,401);
 assert.equal((await post('api/task-tools-toggle',{confirm:true})).status,401);
 const html=await(await get('')).text();assert.ok(html.includes('/panel-login.js'));assert.ok(!html.includes('<script src="/console.js"'));
 assert.equal((await get('panel-login.js')).status,200);
 const css=await(await get('console.css')).text();assert.ok(css.includes('#101725'));assert.ok(css.includes('#f3f3ef'));assert.ok(css.includes('prefers-reduced-motion'));
 assert.equal((await get('dashboard.js')).status,200);assert.equal((await get('dashboard.css')).status,200);
  assert.equal((await post('api/task-create',{text:'fixture',confirm:true})).status,401);
  assert.equal((await post('api/backend-stop',{confirm:true})).status,401);
  assert.equal((await post('api/game-player-records',{})).status,401);
 assert.equal((await post('api/official-login',{instance:'chat',action:'login',confirm:true})).status,401);
 assert.equal((await post('api/provider-config-import',{text:'{}',confirm:true})).status,401);
 assert.equal((await post('api/auto-accounts',{instance:'chat',confirm:true})).status,401);
 assert.equal((await post('api/auth/setup',{password:'1234',confirmation:'1234'})).status,400);
 const result=await(await post('api/auth/setup',{password:'test-password',confirmation:'test-password'})).json();assert.ok(result.token);
  assert.equal((await fetch(base+'api/state',{headers:{Authorization:'Bearer '+result.token}})).status,200);
  assert.equal((await post('api/backend-stop',{confirm:false},result.token)).status,400);
  const records=await post('api/game-player-records',{},result.token);assert.equal(records.status,200);const playerRecords=await records.json();assert.deepEqual(playerRecords.bot,{});assert.deepEqual(playerRecords.rooms,{bot:[],web:[]});
 assert.equal((await post('api/auth/setup',{password:'other-password',confirmation:'other-password'})).status,400);
 await post('api/auth/logout',{token:result.token});assert.equal((await fetch(base+'api/state',{headers:{Authorization:'Bearer '+result.token}})).status,401);
 assert.ok(!fs.readFileSync(path.join(root,'state/panel-auth.json'),'utf8').includes('test-password'));
 const cross=await fetch(base+'api/auth/status',{headers:{Origin:'https://invalid.example'}});assert.equal(cross.status,403);
 console.log('Source控制台HTTP验证通过：首次设置、登录、注销、敏感API鉴权、跨站拒绝；未连接QQ或模型。');
}finally{child.kill();}
