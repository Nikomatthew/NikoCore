export async function connectProvider(hosts, integration, key) {
  if(typeof integration!=='string'||!/^[a-zA-Z0-9_.-]{1,100}$/.test(integration))throw Error('渠道ID格式无效');
  if(typeof key!=='string'||!key.trim()||key.length>4096)throw Error('请输入有效API Key');
  const results=[];
  for(const [name,host] of hosts){
    try{
      if(!host.ready)await host.start();
      await host.call(`/api/integration/${encodeURIComponent(integration)}/connect/key`,{key:key.trim(),label:'NikoLink'},30000);
      results.push({instance:name,connected:true});
    }catch{results.push({instance:name,connected:false});}
  }
  return {results};
}
