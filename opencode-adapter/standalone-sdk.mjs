import {browserGameCompat} from './browser-game-compat.mjs';
export const standaloneSDK=browserGameCompat+String.raw`
(()=>{
 const pending=new Map();let next=0;
  function call(method,args={}){return new Promise((resolve,reject)=>{if(pending.size>=32)return reject(Error('宿主请求过多'));const id=String(++next),timer=setTimeout(()=>{pending.delete(id);reject(Error('宿主接口超时'));},method==='judge'?70000:12000);pending.set(id,{resolve,reject,timer});parent.postMessage({nikoSDK:1,id,method,args},'*');});}
 addEventListener('message',event=>{if(event.source!==parent||event.data?.nikoSDK!==1)return;const item=pending.get(event.data.id);if(!item)return;clearTimeout(item.timer);pending.delete(event.data.id);event.data.error?item.reject(Error(event.data.error)):item.resolve(event.data.result);});
 const SDK={version:1,identity:()=>call('identity'),rooms:{list:()=>call('rooms.list'),create:()=>call('room',{operation:'create'}),join:room=>call('room',{operation:'join',room}),read:room=>call('room',{operation:'read',room}),leave:room=>call('room',{operation:'leave',room})},party:{create:(room,version)=>call('room',{operation:'party-create',room,version}),join:(room,party,version)=>call('room',{operation:'party-join',room,party,version}),leave:(room,version)=>call('room',{operation:'party-leave',room,version})},save:{read:()=>call('save.read'),write:(data,version)=>call('save.write',{data,version,requestID:crypto.randomUUID()})}};
   SDK.world={read:room=>call('world',{room,operation:'read'}),input:(room,input)=>call('world',{room,operation:'input',input}),action:(room,action)=>call('world',{room,operation:'action',action})};
   SDK.judge={evaluate:(room,objective,text)=>call('judge',{room,objective,text})};
  Object.defineProperty(window,'NikoGame',{value:Object.freeze(SDK),writable:false});
})();
`;
export const standaloneHostClient=String.raw`
function standaloneUI(game,section){
  const frame=document.createElement('iframe');frame.title=game.name;frame.setAttribute('sandbox','allow-scripts allow-pointer-lock');frame.setAttribute('allow','fullscreen; gamepad');frame.setAttribute('allowfullscreen','');frame.style.cssText='display:block;width:100%;height:100%;border:0;background:#101725';
  const start=document.createElement('button');start.textContent='进入游戏';let disposed=false,inflight=0,last=0,count=0,activeRoom=null,heartbeatBusy=false;
 const listener=async event=>{
  if(disposed||event.source!==frame.contentWindow||event.origin!=='null'||event.data?.nikoSDK!==1)return;
  const {id,method,args={}}=event.data;if(typeof id!=='string'||id.length>64)return;
    const now=Date.now();if(now-last>60000){last=now;count=0;}if(++count>1500||inflight>=8){frame.contentWindow.postMessage({nikoSDK:1,id,error:'请求过于频繁，请稍后再试'},'*');return;}
  inflight++;try{
    let result;
    if(method==='judge'){result=await api('/api/judge',{game:game.id,room:args.room,objective:args.objective,text:args.text});}
    else if(method==='identity'){if(!game.webPackage.toolkit.includes('identity'))throw Error('未声明身份工具');result=(await api('/api/player')).player;}
    else if(method==='world')result=args.operation==='action'?await api('/api/world',{game:game.id,room:args.room,operation:args.operation,action:args.action}):await worldRequest(args);
   else if(method==='rooms.list')result=await api('/api/rooms',{game:game.id});
    else if(method==='room'){result=await api('/api/room',{game:game.id,operation:args.operation,room:args.room,party:args.party,version:args.version,requestID:crypto.randomUUID()});if(result.room?.left)activeRoom=null;else if(result.room?.id)activeRoom=result.room.id;}
   else if(['save.read','save.write'].includes(method))result=await api('/api/standalone-save',{game:game.id,operation:method==='save.read'?'read':'write',data:args.data,version:args.version,requestID:args.requestID});
   else throw Error('宿主工具不可用');
   if(!disposed)frame.contentWindow.postMessage({nikoSDK:1,id,result},'*');
  }catch(error){if(!disposed)frame.contentWindow.postMessage({nikoSDK:1,id,error:error.message},'*');}finally{inflight--;}
 };
   start.onclick=async()=>{if(start.disabled)return;start.disabled=true;el('notice').textContent='正在进入游戏…';try{const result=await api('/api/standalone-launch',{game:game.id});if(typeof result.url!=='string'||!result.url.startsWith('/standalone/'))throw Error('游戏启动地址无效，请重试');frame.src=result.url;section.replaceChildren(frame);document.documentElement.classList.add('game-running');document.body.style.cssText='margin:0;padding:0;max-width:none;overflow:hidden;background:#101725';section.style.cssText='position:fixed;inset:0;width:100%;height:100dvh;margin:0;padding:0;border:0;border-radius:0;z-index:10;background:#101725';start.hidden=true;el('notice').textContent='';}catch(error){el('notice').textContent=error.message+'；可点击“进入游戏”重试。';start.disabled=false;}};
  addEventListener('message',listener);section.append(start);
  let worldSocket=null,worldSerial=0;const worldPending=new Map();
  async function worldRequest(args){
   if(!worldSocket||worldSocket.readyState>1){const ws=new WebSocket(location.origin.replace(/^http/,'ws')+'/world-socket');worldSocket=ws;ws.onmessage=event=>{try{const data=JSON.parse(event.data),p=worldPending.get(data.id);if(p){clearTimeout(p.timer);worldPending.delete(data.id);p.resolve(data.result);}}catch{ws.close();}};ws.onclose=()=>{for(const p of worldPending.values()){clearTimeout(p.timer);p.reject(Error('世界连接断开，请重新加入'));}worldPending.clear();};}
   const ws=worldSocket;if(ws.readyState===0)await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',()=>reject(Error('世界连接失败')),{once:true});});
   if(disposed||ws.readyState!==1)throw Error('世界连接不可用');return new Promise((resolve,reject)=>{const id=String(++worldSerial),timer=setTimeout(()=>{worldPending.delete(id);reject(Error('世界请求超时，未自动重放操作'));},10000);worldPending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,csrf,game:game.id,room:args.room,operation:args.operation,input:args.input}));});
  }
  addEventListener('pagehide',()=>worldSocket?.close(),{once:true});
  if(game.autoLaunch)void start.onclick();
   const heartbeat=setInterval(async()=>{if(disposed||document.hidden||!frame.isConnected||!activeRoom||heartbeatBusy)return;heartbeatBusy=true;try{await api('/api/room',{game:game.id,room:activeRoom,operation:'read'});}catch{}finally{heartbeatBusy=false;}},1500);
  const timer=setInterval(()=>{if(!section.isConnected){disposed=true;clearInterval(heartbeat);worldSocket?.close();removeEventListener('message',listener);frame.src='about:blank';clearInterval(timer);}},1000);addEventListener('pagehide',()=>{disposed=true;clearInterval(heartbeat);removeEventListener('message',listener);clearInterval(timer);},{once:true});
}
`;
