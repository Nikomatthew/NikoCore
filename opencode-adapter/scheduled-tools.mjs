import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { scanTaskTools } from './task-tool-registry.mjs';
import { executeTaskTool } from './task-tool-runner.mjs';

export class ScheduledTools {
  constructor(home,store,options={}) {
    this.home=home;this.store=store;this.now=options.now||Date.now;this.execute=options.execute||executeTaskTool;this.log=options.log||(()=>{});this.deliver=options.deliver;this.busy=false;this.timer=null;
    this.directory=options.directory||path.join(home,'data','scheduled-tools');fs.mkdirSync(this.directory,{recursive:true});this.file=path.join(this.directory,'plans.json');
    this.items=fs.existsSync(this.file)?JSON.parse(fs.readFileSync(this.file,'utf8')):[];
    for(const item of this.items){if(item.status==='running')item.status='interrupted';else if(item.status==='scheduled'&&item.at<this.now())item.status='missed';}
    this.save();
  }
  save(){fs.writeFileSync(this.file+'.tmp',JSON.stringify(this.items,null,2),{mode:0o600});fs.renameSync(this.file+'.tmp',this.file);}
  create(input){
    const c=this.store.value;
    if(c.mode!=='reply'||!c.ownerQQ)throw Error('请先设置主人并启用回复模式');
    const at=Date.parse(input.at);if(!Number.isFinite(at)||at<=this.now()||at>this.now()+366*86400000)throw Error('执行时间需在未来一年内');
    if(this.items.filter(item=>item.status==='scheduled').length>=100)throw Error('待执行计划达到100个');
    const tool=scanTaskTools(path.join(this.home,'task-tools'),c.taskToolApprovals||{}).find(item=>item.name===input.tool&&item.enabled&&!item.error);
    if(!tool)throw Error('工具未启用或文件已变化');
    if(!input.args||typeof input.args!=='object'||Array.isArray(input.args)||Buffer.byteLength(JSON.stringify(input.args))>128000)throw Error('工具参数无效或过大');
    if((tool.inputSchema.required||[]).some(key=>!Object.hasOwn(input.args,key)))throw Error('缺少工具必填参数');
    const delivery=input.delivery||'console';
    if(!['console','owner','group'].includes(delivery))throw Error('投递类型无效');
    if(delivery==='group'&&(!c.groupEnabled||!c.groups.includes(String(input.group))))throw Error('投递群不在启用的白名单');
    const plan={id:crypto.randomUUID(),owner:c.ownerQQ,at,tool:tool.name,hash:tool.hash,args:structuredClone(input.args),delivery,target:delivery==='group'?String(input.group):delivery==='owner'?c.ownerQQ:null,status:'scheduled',createdAt:this.now()};
    this.items.push(plan);this.save();return plan;
  }
  cancel(id){const plan=this.items.find(item=>item.id===id&&item.owner===this.store.value.ownerQQ);if(!plan||plan.status!=='scheduled')throw Error('只能取消待执行计划');plan.status='cancelled';this.save();}
  async deliverResult(plan,output,workspace){
    if(!plan.delivery||plan.delivery==='console')return;
    const c=this.store.value;
    if(c.mode!=='reply'||c.ownerQQ!==plan.owner||plan.delivery==='group'&&(!c.groupEnabled||!c.groups.includes(plan.target)))throw Error('投递授权已失效');
    const relative=output.file||output.image||output.transcriptFile;
    if(typeof relative!=='string'||path.isAbsolute(relative))throw Error('工具未返回可交付文件');
    const folder=fs.realpathSync(workspace),file=fs.realpathSync(path.resolve(folder,relative));
    if(!file.startsWith(folder+path.sep)||fs.lstatSync(path.resolve(folder,relative)).isSymbolicLink())throw Error('产物路径越界');
    const stat=fs.statSync(file);
    if(!stat.isFile()||!stat.size||stat.size>200*1048576)throw Error('产物文件无效或过大');
    if(stat.size>100*1048576){plan.deliveryState='requires-confirmation';plan.deliveryError='超过100MiB，未发送；请在本机查看产物并单独确认';return;}
    if(plan.deliveryAttempted)return;
    const extension=path.extname(file).toLowerCase();
    if(!['.md','.txt','.json','.csv','.pdf','.pptx','.docx','.xlsx','.zip','.html','.png','.jpg','.jpeg','.webp','.mp4','.mp3','.m4a','.wav','.opus','.webm','.mkv'].includes(extension))throw Error('该产物格式未获准投递');
    const bytes=fs.readFileSync(file);
    let kind='file',value={file,name:path.basename(file)};
    if(['.png','.jpg','.jpeg','.webp'].includes(extension)){const {imageMime}=await import('./vision.mjs');imageMime(bytes);if(stat.size>20*1048576)throw Error('图片超过20MiB');kind='image';value=bytes;}
    if(extension==='.mp4'){if(bytes.toString('ascii',4,8)!=='ftyp')throw Error('MP4文件格式无效');kind='video';}
    if(!this.deliver)throw Error('投递服务不可用');
    plan.deliveryAttempted=true;plan.deliveryState='attempted';this.save();
    await this.deliver({group:plan.delivery==='group',target:plan.target},value,kind);
    plan.deliveryState='sent';
  }
  async tick(){
    if(this.busy)return;this.busy=true;
    try{
      for(const plan of this.items.filter(item=>item.status==='scheduled'&&item.at<=this.now())){
        const c=this.store.value;
        if(plan.at<this.now()-60000){plan.status='missed';this.save();continue;}
        if(c.ownerQQ!==plan.owner||c.mode!=='reply'){plan.status='blocked';plan.error='主人或运行模式已变化';this.save();continue;}
        const workspace=path.join(this.directory,plan.id);fs.mkdirSync(workspace,{recursive:true});
        plan.status='running';plan.startedAt=this.now();this.save();this.log('info','开始执行定时工具：'+plan.tool);
        try{
          const output=await this.execute({home:this.home,approvals:c.taskToolApprovals||{},name:plan.tool,args:plan.args,workspace,taskID:plan.id,node:process.env.NIKOLINK_TOOL_NODE||path.join(this.home,'runtime','node','node.exe'),expectedHash:plan.hash});
          fs.writeFileSync(path.join(workspace,'tool-result.json'),JSON.stringify(output,null,2),{mode:0o600});plan.status='completed';plan.resultDirectory=workspace;
          try{await this.deliverResult(plan,output,workspace);}catch{plan.deliveryState='failed';plan.deliveryError='投递失败或授权变化，结果保留在本机，不自动重试';}
        }catch{plan.status='failed';plan.error='工具执行失败、已禁用或版本变化；不自动重试';}
        plan.finishedAt=this.now();this.save();this.log(plan.status==='completed'?'info':'warning','定时任务：'+plan.status);
      }
    }finally{this.busy=false;}
  }
  start(){if(!this.timer)this.timer=setInterval(()=>this.tick().catch(()=>this.log('error','定时调度失败')),1000);}
  stop(){clearInterval(this.timer);this.timer=null;}
  list(){return this.items.filter(item=>item.owner===this.store.value.ownerQQ).slice(-100).map(({args,...item})=>({...item,parameters:args}));}
}
