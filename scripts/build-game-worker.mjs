import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),output=process.argv[2];if(!output||fs.existsSync(output))throw Error('请指定不存在的辅助运行时目录');fs.mkdirSync(output,{recursive:true});
await build({entryPoints:[path.join(root,'opencode-adapter/web-game-worker.mjs')],outfile:path.join(output,'worker.cjs'),bundle:true,platform:'node',target:'node24',format:'cjs',external:['bufferutil','utf-8-validate'],define:{'import.meta.url':'"file:///nikolink-game-worker/worker.cjs"'}});
await build({entryPoints:[path.join(root,'opencode-adapter/game-script-worker.mjs')],outfile:path.join(output,'script-worker.cjs'),bundle:true,platform:'node',target:'node24',format:'cjs',external:['quickjs-emscripten']});
const copied=new Set(),require=createRequire(import.meta.url);
function copyDependency(name,resolver=require){
 if(copied.has(name))return;let directory=path.dirname(resolver.resolve(name));
 while(!fs.existsSync(path.join(directory,'package.json'))||JSON.parse(fs.readFileSync(path.join(directory,'package.json'),'utf8')).name!==name){const parent=path.dirname(directory);if(parent===directory)throw Error('未找到依赖包：'+name);directory=parent;}
 const manifest=JSON.parse(fs.readFileSync(path.join(directory,'package.json'),'utf8'));copied.add(name);fs.cpSync(directory,path.join(output,'node_modules',name),{recursive:true});
 for(const dependency of Object.keys(manifest.dependencies||{}))copyDependency(dependency,createRequire(path.join(directory,'package.json')));
}
copyDependency('quickjs-emscripten');
const files={};for(const name of ['worker.cjs','script-worker.cjs'])files[name]=crypto.createHash('sha256').update(fs.readFileSync(path.join(output,name))).digest('hex');fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify({files},null,2));console.log('Game helper runtime: '+path.resolve(output));
