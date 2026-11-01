import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
const root=process.argv[2];if(!root)throw Error('请传入独立发行包目录');
const temp=fs.mkdtempSync(path.join(process.env.LOCALAPPDATA,'Temp','opencode','nikolink-exe-smoke-'));
const executable=path.join(temp,'NikoLink.exe');fs.copyFileSync(path.join(root,'NikoLink.exe'),executable);
const child=spawn(executable,['--offline-check'],{env:{...process.env,NIKOLINK_APP_ROOT:path.join(temp,'data','opencode-adapter'),NIKOLINK_PANEL_PORT:'0'},stdio:'ignore'});
let exited=false;child.once('exit',()=>{exited=true;});
try{
 let base,ready=false;
 for(let n=0;n<100;n++){if(exited)throw Error('EXE提前退出');try{base=fs.readFileSync(path.join(temp,'data/opencode-adapter/state/panel.url'),'utf8').trim();if((await fetch(base)).ok){ready=true;break;}}catch{}await delay(100);}
 assert.ok(ready,'控制台未启动');
 const html=await(await fetch(base)).text();assert.ok(html.includes('Niko_matthew'));assert.ok(html.includes('打开官方登录窗口'));assert.ok(!html.includes('id="modelApiKey"'));assert.ok(!html.includes('providerConfigFile'));
 for(const resource of ['console.css','dashboard.css','console.js','dashboard.js','panel-login.js','isolated-login.js'])assert.equal((await fetch(base+resource)).status,200,resource);
 const post=(url,body,token)=>fetch(base+url,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});
 assert.equal((await fetch(base+'api/state')).status,401);
 assert.equal((await(await fetch(base+'api/auth/status')).json()).configured,false);
 const response=await post('api/auth/setup',{password:'smoke-fixture-only',confirmation:'smoke-fixture-only'});assert.equal(response.status,200);const {token}=await response.json();
 const state=await(await fetch(base+'api/state',{headers:{Authorization:'Bearer '+token}})).json();
 assert.equal(state.config.ownerQQ,'');assert.equal(state.config.persona,'');assert.equal(state.config.samples.length,0);assert.equal(state.status.ready,false);assert.equal(state.status.qq,'未连接');
 assert.equal((await post('api/auto-accounts',{instance:'chat',confirm:true})).status,401);
 assert.equal((await post('api/model-connect',{},token)).status,410);
 await post('api/auth/logout',{token});assert.equal((await fetch(base+'api/state',{headers:{Authorization:'Bearer '+token}})).status,401);
 console.log('离线EXE验证通过：静态资源、首次密码设置、鉴权、空白数据、注销；未连接QQ或模型，发布目录未写入测试数据。');
}finally{if(!exited){const stopped=new Promise(resolve=>child.once('exit',resolve));child.kill();await stopped;}fs.rmSync(temp,{recursive:true,force:true});}
