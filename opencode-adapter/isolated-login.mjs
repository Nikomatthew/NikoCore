import {purposeHost} from './model-purpose.mjs';
export function defaultAnswers(form){
  const answer={};
  for(const field of Array.isArray(form)?form:[]){
    if(field.when?.some(condition=>answer[condition.key]!==condition.value))continue;
    if(field.default!==undefined)answer[field.key]=field.default;
    else if(field.required)throw Error('该渠道需要额外登录信息，暂不能使用快捷登录');
  }
  return answer;
}
function requiresInput(form){try{defaultAnswers(form);return false;}catch{return true;}}
export class IsolatedLogin {
  constructor(hosts){this.hosts=hosts;this.attempts=new Map();}
  async host(instance){const host=purposeHost(this.hosts,instance);if(!host.ready)await host.start();return host;}
  async catalog(instance){
    const host=await this.host(instance);
    const [integrations,models]=await Promise.all([host.call('/api/integration'),host.call('/api/model')]);
    return {integrations:(integrations.data||[]).map(item=>({id:item.id,name:item.name,methods:item.methods.filter(method=>['key','oauth'].includes(method.type)).map(method=>({id:method.id,type:method.type,label:method.label,requiresForm:requiresInput(method.form)}))})),models:(models.data||[]).filter(item=>item.enabled&&(!item.type||item.type==='chat')).map(item=>({id:`${item.providerID}/${item.id}`,name:item.name}))};
  }
  async begin(instance,integration,method){
    if(!/^[\w.-]{1,100}$/.test(integration)||method!==undefined&&(typeof method!=='string'||method.length>200))throw Error('授权参数无效');
    const host=await this.host(instance);
    const list=await host.call('/api/integration');
    const methods=list.data?.find(item=>item.id===integration)?.methods||[];
    const selected=methods.find(item=>item.type==='oauth'&&(!method||item.id===method)&&!requiresInput(item.form));
    if(!selected)throw Error(methods.some(item=>item.type==='oauth')?'该渠道需要额外登录信息，暂不支持快捷授权':'该渠道不支持浏览器授权，请使用API Key连接');
    const answer=defaultAnswers(selected.form);
    const response=await host.call(`/api/integration/${encodeURIComponent(integration)}/connect/oauth`,{methodID:selected.id,label:'NikoLink',...(Object.keys(answer).length?{answer}:{})},30000);
    const value=response.data,url=new URL(value.url);
    if(url.protocol!=='https:'||url.username||url.password)throw Error('授权链接不是安全HTTPS地址');
    const key=`${instance}:${value.attemptID}`;this.attempts.set(key,{host,integration,attemptID:value.attemptID});
    if(this.attempts.size>32)this.attempts.delete(this.attempts.keys().next().value);
    return {attemptID:value.attemptID,url:url.href,instructions:String(value.instructions).slice(0,4000),mode:value.mode};
  }
  async action(instance,id,action,code){
    const key=`${instance}:${id}`,attempt=this.attempts.get(key);
    if(!attempt||attempt.host!==this.hosts[instance])throw Error('授权请求不存在或已失效');
    const base=`/api/integration/${encodeURIComponent(attempt.integration)}/connect/oauth/${encodeURIComponent(attempt.attemptID)}`;
    if(action==='cancel'){await attempt.host.call(base,undefined,15000,'DELETE');this.attempts.delete(key);return {status:'cancelled'};}
    if(action==='complete'){if(typeof code!=='string'||!code.trim()||code.length>4096)throw Error('授权码无效');await attempt.host.call(base+'/complete',{code:code.trim()},30000);}
    const result=await attempt.host.call(base);const status=result.data?.status;
    if(['complete','expired','failed'].includes(status))this.attempts.delete(key);
    return {status:status||'pending'};
  }
}
