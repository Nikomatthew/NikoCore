import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {FileLog} from './file-log.mjs';
test('日志脱敏、三天清理且不清理无关文件，不落盘推理',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nikolink-log-'));try{let now=Date.now();const log=new FileLog(dir,{now:()=>now});log.write('error','test','token=secret-value',['secret-value']);log.write('reasoning','test','private-reasoning');const name=fs.readdirSync(dir)[0],text=fs.readFileSync(path.join(dir,name),'utf8');assert.ok(!text.includes('secret-value'));assert.ok(!text.includes('private-reasoning'));fs.writeFileSync(path.join(dir,'keep.txt'),'keep');now+=3*86400000+1000;log.prune();assert.deepEqual(fs.readdirSync(dir),['keep.txt']);}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
