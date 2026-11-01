import {parse} from 'jsonc-parser';

export function importProviders(text){
  if(typeof text!=='string'||Buffer.byteLength(text)>1000000)throw Error('配置文件最多1MB');
  const errors=[];const config=parse(text,errors,{allowTrailingComma:true});
  if(errors.length||!config||typeof config!=='object')throw Error('JSON/JSONC 配置格式错误');
  const source=config.providers||config.provider;
  if(!source||typeof source!=='object'||Array.isArray(source)||!Object.keys(source).length)throw Error('配置中没有 providers 或 provider 渠道');
  const packages={'@ai-sdk/openai-compatible':'@opencode/ai/providers/openai-compatible','@ai-sdk/openai':'@opencode/ai/providers/openai','@ai-sdk/anthropic':'@opencode/ai/providers/anthropic','@ai-sdk/google':'@opencode/ai/providers/google'};
  const providers={};
  for(const [id,item] of Object.entries(source)){
    if(!/^[\w.-]{1,100}$/.test(id)||!item||typeof item!=='object'||Array.isArray(item))throw Error('渠道配置格式错误');
    const provider={};
    for(const key of ['name','env','canonical','compatibility','settings','headers','body','models'])if(item[key]!==undefined)provider[key]=item[key];
    const runtime=item.package||packages[item.npm];
    if((item.package||item.npm)&&!runtime)throw Error('旧版渠道运行库不受支持，请使用 OpenCode V2 配置');
    if(runtime){if(!/^@opencode\/ai\/providers\/[a-z0-9/-]+$/.test(runtime))throw Error('仅支持 OpenCode 内置渠道运行库');provider.package=runtime;}
    if(item.options)provider.settings={...item.options,...provider.settings};
    providers[id]=provider;
  }
  return {providers};
}
