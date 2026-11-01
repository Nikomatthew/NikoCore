import path from 'node:path';
import { spawn } from 'node:child_process';
import { scanTaskTools } from './task-tool-registry.mjs';

export async function executeTaskTool({home,approvals,name,args,workspace,taskID='',node=process.execPath,signal,expectedHash}) {
  const tool=scanTaskTools(path.join(home,'task-tools'),approvals).find(item=>item.name===name&&item.enabled&&!item.error);
  if(!tool||expectedHash&&tool.hash!==expectedHash)throw Error('工具未启用、代码已变化或与计划确认版本不一致');
  if(!args||typeof args!=='object'||Array.isArray(args))throw Error('参数需为对象');
  if((tool.inputSchema.required||[]).some(key=>!Object.hasOwn(args,key)))throw Error('缺少必填参数');
  const payload=JSON.stringify({arguments:args,workspace,taskID});
  if(Buffer.byteLength(payload)>256000)throw Error('工具输入过大');
  return new Promise((resolve,reject)=>{
    const env={SystemRoot:process.env.SystemRoot,PATH:process.env.PATH,TEMP:process.env.TEMP,TMP:process.env.TMP,NIKOLINK_HOME:home,NIKOLINK_TOOL_NODE:node,NIKOLINK_TOOL_SETTINGS:path.join(process.env.NIKOLINK_APP_ROOT||path.join(home,'data','opencode-adapter'),'state','settings.json')};
    const child=spawn(node,[path.join(home,'tools','task-tool-worker.mjs'),tool.entry],{cwd:tool.folder,env,signal,windowsHide:true,stdio:['pipe','pipe','pipe']});
    let stdout='',overflow=false,expired=false;
    const timer=setTimeout(()=>{expired=true;child.kill();},tool.timeoutSeconds*1000);
    child.stdout.on('data',chunk=>{stdout+=chunk;if(Buffer.byteLength(stdout)>1048576){overflow=true;child.kill();}});
    child.stderr.resume();
    child.once('error',()=>{clearTimeout(timer);reject(Error('工具进程启动失败或执行已取消'));});
    child.once('close',code=>{
      clearTimeout(timer);
      if(expired)return reject(Error('工具执行超时'));
      if(overflow||code!==0)return reject(Error(overflow?'工具输出过大':'工具执行失败，请检查输入和依赖'));
      try{resolve(JSON.parse(stdout));}catch{reject(Error('工具未返回有效JSON'));}
    });
    child.stdin.on('error',()=>{});child.stdin.end(payload);
  });
}
