import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{waitAndOpenPanel}=require('./desktop-startup.cjs'),{openPanel}=require('./desktop-panel.cjs');
const source=process.argv[2];if(!source)throw Error('请指定发行目录');
const home=fs.mkdtempSync(path.join(os.tmpdir(),'niko-webview-smoke-')),app=path.join(home,'data','opencode-adapter');
fs.copyFileSync(path.join(source,'NikoLink.exe'),path.join(home,'NikoLink.exe'));fs.cpSync(path.join(source,'runtime','panel'),path.join(home,'runtime','panel'),{recursive:true});
const child=spawn(path.join(home,'NikoLink.exe'),['--offline-check'],{windowsHide:true,env:{...process.env,NIKOLINK_APP_ROOT:app,NIKOLINK_PANEL_PORT:'0'},stdio:'ignore'});let panel;
try{
 panel=await waitAndOpenPanel(home,app,{openPanel:(h,url)=>openPanel(h,url,spawn,app)});
 const ready=path.join(home,'data','panel','panel-ready');let confirmed=false;
 for(let i=0;i<120;i++){if(fs.existsSync(ready)){const pid=Number(fs.readFileSync(ready,'utf8'));if(pid===panel.pid){confirmed=true;break;}}await new Promise(resolve=>setTimeout(resolve,250));}
 assert.ok(confirmed,'WebView未确认显示；独立测试目录：'+home);
 console.log(JSON.stringify({webviewVisible:true,panelPID:panel.pid,backendPID:child.pid,temporaryHome:home,productionDataTouched:false}));
}finally{
 if(panel&&panel.exitCode===null){const ended=new Promise(resolve=>panel.once('exit',resolve));panel.kill();await ended;}
 if(child.exitCode===null){const ended=new Promise(resolve=>child.once('exit',resolve));child.kill();await ended;}
}
