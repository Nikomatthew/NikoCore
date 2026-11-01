import fs from 'node:fs';
import path from 'node:path';

export class TaskHost {
  constructor(service,workspace){this.service=service;this.workspace=workspace;this.sessions=new Set();service.sharedTaskWorkspace=workspace;}
  get root(){return this.service.root;}
  get ready(){return this.service.ready;}
  get starting(){return this.service.starting;}
  get viewSecrets(){return this.service.viewSecrets;}
  get password(){return this.service.password;}
  get url(){return this.service.url;}
  get cliExecutable(){return this.service.cliExecutable;}
  get launchEnvironment(){return this.service.launchEnvironment;}
  get taskMode(){return true;}
  get taskSteps(){return this.service.taskSteps;}
  set taskSteps(value){this.service.taskSteps=value;}
  async start(){
    await this.service.start();fs.mkdirSync(this.workspace,{recursive:true});
    const result=await this.service.call(`/api/agent?location%5Bdirectory%5D=${encodeURIComponent(this.workspace)}`);
    const taskAgent=result.data?.find(agent=>agent.id==='owner-task');
    if(!taskAgent?.permissions?.some(rule=>rule.action==='*'&&rule.effect==='ask'))throw Error('共享任务Agent权限校验失败');
    const file=path.join(this.root,'state','isolated','config','opencode','opencode.json');
    const config=JSON.parse(fs.readFileSync(file,'utf8'));
    const agent=config.agents?.['owner-task'];if(!agent)throw Error('共享服务缺少任务Agent');
    if(this.taskSteps&&agent.steps!==this.taskSteps){agent.steps=this.taskSteps;fs.writeFileSync(file,JSON.stringify(config,null,2),{mode:0o600});}
  }
  async call(route,body,timeout,method){
    const match=route.match(/^\/api\/(?:experimental\/)?session\/([^/?]+)/);
    if(match)this.sessions.add(match[1]);
    const result=await this.service.call(route,body,timeout,method);
    if(route==='/api/session'&&result?.data?.id)this.sessions.add(result.data.id);
    return result;
  }
  stop(){
    const sessions=[...this.sessions];this.sessions.clear();
    return Promise.allSettled(sessions.map(id=>this.service.call(`/api/session/${encodeURIComponent(id)}/interrupt`,{},3000)));
  }
}
