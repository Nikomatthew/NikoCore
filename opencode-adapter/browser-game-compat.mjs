export const browserGameCompat=String.raw`
function gameRequestID(){
 const bytes=new Uint8Array(16);
 if(globalThis.crypto?.getRandomValues)globalThis.crypto.getRandomValues(bytes);
 else for(let i=0;i<16;i++)bytes[i]=Math.floor(Math.random()*256);
 bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
 const hex=[...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');return hex.slice(0,8)+'-'+hex.slice(8,12)+'-'+hex.slice(12,16)+'-'+hex.slice(16,20)+'-'+hex.slice(20);
}
if(globalThis.crypto&&typeof globalThis.crypto.randomUUID!=='function'){
 try{Object.defineProperty(globalThis.crypto,'randomUUID',{value:gameRequestID,configurable:true});}catch{}
}
async function gameJSONRequest(route,data,csrf){
 const safe=!data||['/api/qq-login/poll','/api/standalone-launch'].includes(route)||route==='/api/room'&&data.operation==='read';
 for(let attempt=0;attempt<(safe?3:1);attempt++){
  try{
   const response=await fetch(route,{method:data?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf||''},body:data?JSON.stringify(data):undefined,signal:AbortSignal.timeout(route==='/api/judge'?65000:15000)});
   const raw=await response.text();let result;
   try{result=JSON.parse(raw);}catch{const error=Error('网络返回为空或不完整，请检查连接后重试');error.transient=true;throw error;}
   if(!response.ok){const error=Error(result.error||'游戏请求失败 HTTP '+response.status);error.transient=[502,503,504].includes(response.status);throw error;}
   return result;
  }catch(error){const transient=error.transient||error.name==='TypeError'||error.name==='AbortError'||error.name==='TimeoutError';if(!safe||!transient||attempt===2)throw error;await new Promise(resolve=>setTimeout(resolve,300*(attempt+1)));}
 }
}
`;
