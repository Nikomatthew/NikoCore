import { executeTaskTool } from './task-tool-runner.mjs';
import {ToolResultPages} from './tool-result-pages.mjs';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { spawn } from 'node:child_process';
import { scanTaskTools } from './task-tool-registry.mjs';

export async function runTaskToolMCP() {
  const home=process.env.NIKOLINK_HOME;
  const settingsFile=process.env.NIKOLINK_TOOL_SETTINGS;
  const workspace=process.env.NIKOLINK_TOOL_WORKSPACE;
  if(!home||!settingsFile||!workspace)throw Error('任务工具服务缺少启动参数');
  const directory=path.join(home,'task-tools');
  const workers=new Set();
  const pages=new ToolResultPages();
  const approved=()=>JSON.parse(fs.readFileSync(settingsFile,'utf8')).taskToolApprovals||{};
  const send=value=>process.stdout.write(JSON.stringify(value)+'\n');
  async function handle(message) {
    if(message.id===undefined)return;
    try {
      let result;
      if(message.method==='initialize')result={protocolVersion:message.params?.protocolVersion||'2024-11-05',capabilities:{tools:{}},serverInfo:{name:'nikolink-task-tools',version:'1.0.0'}};
      else if(message.method==='ping')result={};
      else if(message.method==='tools/list')result={tools:[...scanTaskTools(directory,approved()).filter(t=>t.enabled&&!t.error).map(t=>({name:t.name,description:t.description,inputSchema:t.inputSchema})),{name:'nikolink_result_page',description:'读取本会话工具结果的详细分页，只读，不执行原工具。',inputSchema:{type:'object',properties:{reference:{type:'string'},offset:{type:'integer'},limit:{type:'integer'}},required:['reference'],additionalProperties:false}}]};
      else if(message.method==='tools/call'){
        if(message.params?.name==='nikolink_result_page'){result=pages.page(message.params.arguments||{});send({jsonrpc:'2.0',id:message.id,result});return;}
        const tool=scanTaskTools(directory,approved()).find(t=>t.name===message.params?.name&&t.enabled&&!t.error);
        if(!tool)throw Error('工具未启用或代码已变化，需要重新确认');
        if(workers.size>=2)throw Error('任务工具并发已满');
        const args=message.params?.arguments||{};
        if(!args||typeof args!=='object'||Array.isArray(args))throw Error('参数需为对象');
        const required=tool.inputSchema.required||[];
        if(required.some(key=>!Object.hasOwn(args,key)))throw Error('缺少必填参数');
        const output=await executeTaskTool({home,approvals:approved(),name:tool.name,args,workspace,node:process.env.NIKOLINK_TOOL_NODE||path.join(home,'runtime','node','node.exe')});
        result=pages.present(output);
      }else {send({jsonrpc:'2.0',id:message.id,error:{code:-32601,message:'未知方法'}});return;}
      send({jsonrpc:'2.0',id:message.id,result});
    }catch(error){if(message.method==='tools/call')send({jsonrpc:'2.0',id:message.id,result:{isError:true,content:[{type:'text',text:String(error.message).slice(0,2000)}]}});else send({jsonrpc:'2.0',id:message.id,error:{code:-32603,message:String(error.message)}});}
  }
  const input=readline.createInterface({input:process.stdin,crlfDelay:Infinity});
  input.on('line',line=>{if(Buffer.byteLength(line)>256000)return;try{handle(JSON.parse(line));}catch{}});
  input.on('close',()=>{for(const child of workers)child.kill();});
}
