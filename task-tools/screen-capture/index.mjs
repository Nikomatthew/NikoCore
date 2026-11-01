import path from 'node:path';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
export async function run(args,context){
 const home=process.env.NIKOLINK_HOME;
 const exe=path.join(home,'NikoLink.exe');
 const command=fs.existsSync(exe)?exe:(process.env.NIKOLINK_TOOL_NODE||process.execPath);
 const argv=fs.existsSync(exe)?['--builtin-tool']:[path.join(home,'scripts','builtin-tool-entry.mjs')];
 return new Promise((resolve,reject)=>{const child=spawn(command,argv,{env:{...process.env,NIKOLINK_HOME:home},windowsHide:true,stdio:['pipe','pipe','pipe']});let output='';child.stdout.on('data',chunk=>{output+=chunk;if(Buffer.byteLength(output)>1048576)child.kill();});child.stderr.resume();child.once('error',()=>reject(Error('工具入口启动失败')));child.once('close',code=>{if(code!==0)return reject(Error('内置工具执行失败'));try{resolve(JSON.parse(output))}catch{reject(Error('工具结果无效'))}});child.stdin.on('error',()=>{});child.stdin.end(JSON.stringify({name:"screen-capture",args,context}));});
}
