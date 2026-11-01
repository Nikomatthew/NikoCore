import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {EventEmitter} from 'node:events';
import {ManagedSnowLuma} from './managed-snowluma.mjs';
test('后台直接启动SnowLuma，无CMD，已存在不接管，停止仅处理自有子进程',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'niko-snow-'));try{fs.writeFileSync(path.join(dir,'node.exe'),'fixture');fs.writeFileSync(path.join(dir,'index.mjs'),'fixture');let calls=0,killed=false;const child=new EventEmitter();child.kill=()=>{killed=true;};const manager=new ManagedSnowLuma({inspect:()=> 'absent',launch:(exe,args,options)=>{calls++;assert.equal(exe,path.join(dir,'node.exe'));assert.equal(options.windowsHide,true);assert.deepEqual(args,[path.join(dir,'index.mjs')]);return child;}});assert.equal(manager.start(dir).started,true);manager.start(dir);assert.equal(calls,1);manager.stop();assert.equal(killed,true);const reused=new ManagedSnowLuma({inspect:()=> 'active',launch:()=>{throw Error('不应启动');}});assert.equal(reused.start(dir).owned,false);reused.stop();assert.equal(reused.start().started,false);}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
