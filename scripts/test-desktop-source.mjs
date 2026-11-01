import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {prepareCloudflaredStartup} from './cloudflared-startup.mjs';
const home=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const online=process.argv.includes('--online');
const instance=online?'v3-online-test':'v3-desktop-bot';
const testHome=path.join(home,'test-instances',instance);
const root=path.join(testHome,'data','opencode-adapter');
const state=path.join(root,'state');fs.mkdirSync(state,{recursive:true});
const externalShell=path.join(home,'dist','v3-desktop-shell-external-links','NikoLink.Panel.exe');
const themeShell=fs.existsSync(externalShell)?externalShell:path.join(home,'dist','v3-desktop-shell-theme-sync','NikoLink.Panel.exe');
const leftCaption=fs.existsSync(themeShell)?themeShell:path.join(home,'dist','v3-desktop-shell-managed-stop','NikoLink.Panel.exe');
const refined=fs.existsSync(leftCaption)?leftCaption:path.join(home,'dist','v3-desktop-shell-refresh-fix','NikoLink.Panel.exe');
const shell=fs.existsSync(refined)?refined:path.join(home,'dist','v3-desktop-shell-prototype','NikoLink.Panel.exe');
if(!fs.existsSync(shell))throw Error('先运行 node scripts/build-desktop-shell.mjs dist/v3-desktop-shell-prototype');
const registration=path.join(state,'test-instance.json');
const sourceRevision=String(fs.statSync(path.join(home,'opencode-adapter','server.mjs')).mtimeMs);
let address,child;
let stale=false;
if(fs.existsSync(registration)){try{const previous=JSON.parse(fs.readFileSync(registration,'utf8'));const response=await fetch(previous.address+'api/test-instance',{signal:AbortSignal.timeout(1000)});const info=await response.json();if(response.ok&&info.instance===instance&&info.pid===previous.pid){address=previous.address;stale=info.revision!==sourceRevision;}}catch{}}
if(stale){console.error('NIKOLINK_TEST_BACKEND_STALE');process.exit(42);}
if(online)await prepareCloudflaredStartup(home,root);
if(!address){
 const log=fs.openSync(path.join(testHome,'backend.log'),'a');
  child=spawn(process.execPath,[path.join(home,'opencode-adapter','server.mjs')],{env:{...process.env,NIKOLINK_HOME:home,NIKOLINK_APP_ROOT:root,NIKOLINK_PANEL_PORT:'0',NIKOLINK_OFFLINE_CHECK:online?'0':'1',NIKOLINK_TEST_INSTANCE:instance,NIKOLINK_TEST_REVISION:sourceRevision,NIKOLINK_WORKSPACE_ROOT:path.join(state,'owner-tasks','state','isolated','workspace')},cwd:home,windowsHide:true,detached:true,stdio:['ignore',log,log]});
 fs.closeSync(log);child.unref();
 for(let n=0;n<60;n++){await delay(250);try{const info=JSON.parse(fs.readFileSync(registration,'utf8'));if(info.pid!==child.pid)continue;const response=await fetch(info.address+'api/test-instance',{signal:AbortSignal.timeout(1000)});if(response.ok&&(await response.json()).instance===info.instance){address=info.address;break;}}catch{}}
 if(!address){child.kill();throw Error('独立测试后台未就绪，请检查test-instances/v3-desktop-bot/backend.log');}
}
const profile=path.join(testHome,'data','panel');
fs.mkdirSync(profile,{recursive:true});try{fs.unlinkSync(path.join(profile,'panel-stop'));}catch(error){if(error.code!=='ENOENT')throw error;}
let snowURL='';if(online){try{const settings=JSON.parse(fs.readFileSync(path.join(state,'settings.json'),'utf8'));if(settings.snowlumaDirectory){const config=JSON.parse(fs.readFileSync(path.join(settings.snowlumaDirectory,'config','runtime.json'),'utf8'));const port=Number(config.webuiPort);if(Number.isInteger(port)&&port>=1024&&port<=65535)snowURL=`http://127.0.0.1:${port}/`;}}catch{}}
const panel=spawn(shell,[address,profile,snowURL],{detached:true,windowsHide:false,stdio:'ignore'});let panelError;panel.on('error',error=>{panelError=error;});panel.unref();
let visible=false;for(let n=0;n<120;n++){if(panelError)throw Error('测试面板进程启动失败：'+panelError.message);try{const pid=Number(fs.readFileSync(path.join(profile,'panel-ready'),'utf8'));if(Number.isSafeInteger(pid)&&pid>0){process.kill(pid,0);visible=true;break;}}catch{}await delay(250);}
if(!visible)throw Error('面板未确认显示。请查看 test-instances/v3-desktop-bot/data/panel/log 日志；无需重复双击。');
console.log('独立测试面板：'+address);console.log('数据：'+root);console.log(online?'在线测试：请先配置独立SnowLuma路径和模型账号；会产生真实请求。':'离线模式：不会连接QQ、启动SnowLuma或调用OpenCode。');
