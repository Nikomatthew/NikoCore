import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {waitAndOpenPanel}=createRequire(import.meta.url)('./desktop-startup.cjs');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'niko-desktop-ready-'));fs.mkdirSync(path.join(root,'state'));let ticks=0,opened=0;
try{await waitAndOpenPanel(root,root,{attempts:15,delay:async()=>{if(++ticks===8)fs.writeFileSync(path.join(root,'state','panel.url'),'http://127.0.0.1:12345/');},fetcher:async()=>({ok:true}),openPanel:()=>{opened++;return {};}});assert.equal(opened,1);assert.equal(ticks,8);console.log('延迟后台就绪后仍启动WebView，非1500ms单次探测；测试通过。');}finally{fs.rmSync(root,{recursive:true,force:true});}
