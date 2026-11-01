export async function langSearch(query,{request=fetch,key=process.env.LANGSEARCH_API_KEY}={}){
  if(!key)throw new Error('LangSearch未配置密钥');
  const response=await request('https://api.langsearch.com/v1/web-search',{method:'POST',redirect:'error',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({query,count:5,freshness:'noLimit',contents:{text:{maxCharacters:1500}}}),signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw new Error(`LangSearch HTTP ${response.status}`);
  let bytes=0;const chunks=[];for await(const chunk of response.body){bytes+=chunk.length;if(bytes>2000000)throw new Error('LangSearch响应过大');chunks.push(Buffer.from(chunk));}
  const value=JSON.parse(Buffer.concat(chunks).toString('utf8'));const sources=value?.data?.webPages?.value;
  if(!Array.isArray(sources))throw new Error('LangSearch响应格式无效');
  return {results:sources.slice(0,5).filter(s=>{try{const u=new URL(s.url);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}}).map(s=>({title:String(s.name||'').slice(0,120),url:s.url,snippet:String(s.text||s.snippet||'').slice(0,1500)}))};
}
