import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const root=path.resolve(process.argv[2]||'');if(!process.argv[2])throw Error('请指定发行目录');
const records=[];
function walk(directory){for(const entry of fs.readdirSync(directory,{withFileTypes:true})){assert.ok(!entry.isSymbolicLink(),'禁止链接');const file=path.join(directory,entry.name),relative=path.relative(root,file).replaceAll('\\','/');if(entry.isDirectory()){assert.ok(!['data','state','backups','test-instances','.venv','.git'].includes(entry.name),'不应分发数据目录：'+relative);walk(file);}else{assert.ok(!/\.(?:sqlite|db|log|pid|mp4|wav)$/i.test(entry.name),'不应分发运行数据：'+relative);assert.ok(!/^(?:settings|mimo-tts-secret|auth|accounts)\.json$/i.test(entry.name),'不应分发账号配置：'+relative);records.push({path:relative,size:fs.statSync(file).size});}}}
walk(root);for(const name of ['NikoLink.exe','runtime/panel/NikoLink.Panel.exe','runtime/game-worker/script-worker.cjs','runtime/game-vendor/manifest.json','runtime/nikolink-install.json','LICENSES.md'])assert.ok(fs.existsSync(path.join(root,name)),name);
assert.ok(!fs.existsSync(path.join(root,'runtime/game-worker/node.exe')),'发行包不附带辅助Node');
assert.ok(!fs.existsSync(path.join(root,'runtime/node/node.exe')),'Node由首次启动安装');
assert.ok(!fs.existsSync(path.join(root,'licenses')),'根目录许可证已合并');
console.log(JSON.stringify({directory:root,files:records.length,bytes:records.reduce((sum,item)=>sum+item.size,0),exeSHA256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'NikoLink.exe'))).digest('hex'),personalDataPathsAbsent:true,notice:'路径/文件清单检查，不等于完整秘密扫描或许可证法律审计'},null,2));
