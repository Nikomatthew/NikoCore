import fs from 'node:fs';
import path from 'node:path';

export async function autoAccounts(host,home,saveProviders){
  const configRoot=path.join(process.env.XDG_CONFIG_HOME||path.join(home,'.config'),'opencode');
  const config=['opencode.json','opencode.jsonc'].map(name=>path.join(configRoot,name)).filter(file=>fs.existsSync(file));
  if(config.length)await saveProviders(config.map(file=>fs.readFileSync(file,'utf8')));
  const dataRoot=path.join(process.env.XDG_DATA_HOME||path.join(home,'.local','share'),'opencode');
  const override=process.env.OPENCODE_DB;
  const file=override?(path.isAbsolute(override)?override:path.join(dataRoot,override)):path.join(dataRoot,'opencode.db');
  if(!fs.existsSync(file))throw Error('未找到主 OpenCode 账号数据库，请使用官方登录窗口');
  const {DatabaseSync}=await import('node:sqlite');
  const db=new DatabaseSync(file,{readOnly:true});
  let rows;
  try{rows=db.prepare('SELECT integration_id, value, active FROM credential ORDER BY active DESC, time_updated DESC').all();}finally{db.close();}
  const seen=new Set(),results=[];
  if(!host.ready)await host.start();
  for(const row of rows){
    if(seen.has(row.integration_id))continue;
    let value;try{value=JSON.parse(row.value);}catch{continue;}
    if(value?.type!=='key'||typeof value.key!=='string'||!value.key.trim())continue;
    seen.add(row.integration_id);
    try{await host.call(`/api/integration/${encodeURIComponent(row.integration_id)}/connect/key`,{key:value.key,label:'NikoLink imported'},30000);results.push({provider:row.integration_id,connected:true});}
    catch{results.push({provider:row.integration_id,connected:false});}
    value.key='';row.value='';
  }
  return {results};
}
