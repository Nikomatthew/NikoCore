import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {prepareCloudflaredStartup} from '../scripts/cloudflared-startup.mjs';
import {cloudflaredSettings} from './cloudflared-settings.mjs';
import {EventEmitter} from 'node:events';
test('确认启动下载后立即返回，不等待网络，使用独立无窗口后台worker',async()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'niko-cloud-background-')),root=path.join(home,'data','opencode-adapter');try{let launched=false;const result=await prepareCloudflaredStartup(home,root,{ask:()=>true,launch:(exe,args,options)=>{launched=true;assert.ok(args[0].endsWith('cloudflared-download-worker.mjs'));assert.equal(options.detached,true);assert.equal(options.windowsHide,true);const c=new EventEmitter();c.unref=()=>{};return c;}});assert.equal(launched,true);assert.equal(result.background,true);}finally{fs.rmSync(home,{recursive:true,force:true});}
});
test('启动缺失询问，否不下载且保留每次询问，检测后强制关闭询问',async()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'niko-cloud-startup-')),root=path.join(home,'data','opencode-adapter');fs.mkdirSync(path.join(root,'state'),{recursive:true});const file=path.join(root,'state','settings.json');let asked=0,downloads=0;
 try{fs.writeFileSync(file,JSON.stringify({cloudflaredAskOnStart:true}));await prepareCloudflaredStartup(home,root,{ask:()=>{asked++;return false;},download:()=>{downloads++;}});await prepareCloudflaredStartup(home,root,{ask:()=>{asked++;return false;}});assert.equal(asked,2);assert.equal(downloads,0);assert.equal(JSON.parse(fs.readFileSync(file)).cloudflaredAskOnStart,true);
 fs.mkdirSync(path.join(home,'runtime','cloudflared'),{recursive:true});fs.writeFileSync(path.join(home,'runtime','cloudflared','cloudflared.exe'),'fixture');await prepareCloudflaredStartup(home,root,{ask:()=>{throw Error('不应询问');}});assert.equal(JSON.parse(fs.readFileSync(file)).cloudflaredAskOnStart,false);assert.equal(cloudflaredSettings({cloudflaredAskOnStart:true},{},home).cloudflaredAskOnStart,false);
 }finally{fs.rmSync(home,{recursive:true,force:true});}
});
test('禁用或自备穿透不询问，确认下载调用独立下载流程',async()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'niko-cloud-startup2-')),root=path.join(home,'data','opencode-adapter');fs.mkdirSync(path.join(root,'state'),{recursive:true});const file=path.join(root,'state','settings.json');try{for(const config of [{cloudflaredAskOnStart:false},{gameNetworkMode:'custom'}]){fs.writeFileSync(file,JSON.stringify(config));assert.equal((await prepareCloudflaredStartup(home,root,{ask:()=>{throw Error('不应询问');}})).skipped,true);}fs.writeFileSync(file,'{}');let downloaded=false;await prepareCloudflaredStartup(home,root,{ask:()=>true,download:async()=>{downloaded=true;return {path:'fixture'};}});assert.equal(downloaded,true);}finally{fs.rmSync(home,{recursive:true,force:true});}
});
