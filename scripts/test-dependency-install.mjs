import {createRequire} from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const {installDependencies}=createRequire(import.meta.url)('./dependency-install.cjs');
const home=fs.mkdtempSync(path.join(os.tmpdir(),'niko-install-progress-'));
try{let options,code;installDependencies(home,(exe,args,opts)=>{options=opts;code=Buffer.from(args.at(-1),'base64').toString('utf16le');});assert.match(code,/-WindowStyle Normal/);assert.match(code,/-Wait/);assert.equal(options.windowsHide,true);const visible=Buffer.from(options.env.NIKOLINK_INSTALL_ENCODED,'base64').toString('utf16le');assert.match(visible,/Start-Transcript/);assert.equal(options.env.NIKOLINK_INSTALL_SCRIPT,path.join(home,'tools','install.ps1'));console.log('安装窗口可见/主进程隐藏/等待结果/日志保存检查通过。');}finally{fs.rmSync(home,{recursive:true,force:true});}
