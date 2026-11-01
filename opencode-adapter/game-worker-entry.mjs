import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {isSea} from 'node:sea';
import {fileURLToPath} from 'node:url';
export function gameWorkerEntry(home,{packaged=isSea()}={}){
 if(!packaged)return {executable:process.execPath,entry:fileURLToPath(new URL('./web-game-worker.mjs',import.meta.url))};
 const directory=path.join(home,'runtime','game-worker'),manifest=JSON.parse(fs.readFileSync(path.join(directory,'manifest.json'),'utf8'));
  for(const name of ['worker.cjs','script-worker.cjs']){const file=path.join(directory,name),stat=fs.lstatSync(file);if(!stat.isFile()||stat.isSymbolicLink()||!manifest.files?.[name]||crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==manifest.files[name])throw Error('游戏运行时缺失或校验失败，请修复安装');}
  const executable=path.join(home,'runtime','node','node.exe');if(!fs.existsSync(executable))throw Error('缺少Node运行环境，请重新打开NikoLink并同意安装依赖');
  return {executable,entry:path.join(directory,'worker.cjs')};
}
