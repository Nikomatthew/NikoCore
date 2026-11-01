import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {scriptWorkerEntry,GameScriptService} from './game-script-service.mjs';
test('源码执行不选安装目录中的旧构建worker',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'nikolink-worker-routing-')),home=process.env.NIKOLINK_HOME,mode=process.env.NIKOLINK_PACKAGED_WORKER;
 try{fs.mkdirSync(path.join(root,'runtime/game-worker'),{recursive:true});fs.writeFileSync(path.join(root,'runtime/game-worker/script-worker.cjs'),'invalid old build');process.env.NIKOLINK_HOME=root;process.env.NIKOLINK_PACKAGED_WORKER='0';assert.ok(scriptWorkerEntry() instanceof URL);process.env.NIKOLINK_PACKAGED_WORKER='1';assert.equal(scriptWorkerEntry(),path.join(root,'runtime/game-worker/script-worker.cjs'));}
 finally{if(home===undefined)delete process.env.NIKOLINK_HOME;else process.env.NIKOLINK_HOME=home;if(mode===undefined)delete process.env.NIKOLINK_PACKAGED_WORKER;else process.env.NIKOLINK_PACKAGED_WORKER=mode;fs.rmSync(root,{recursive:true,force:true});}
});
test('后端初始化语法错误报告类别而不是猜测时间不足',async()=>{
 await assert.rejects(()=>GameScriptService.create('function update( { invalid'),/初始化失败（语法错误）/);
});
