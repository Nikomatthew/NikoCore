import {WebSocketServer} from 'ws';
import {StandaloneWorlds} from './standalone-worlds.mjs';
export function attachWorldTransport(server,service){
 const wss=new WebSocketServer({noServer:true,maxPayload:8192,perMessageDeflate:false}),clients=new Map();
 const upgrade=(req,socket,head)=>{
  if(req.url!=='/world-socket')return;let origin;try{origin=new URL(req.headers.origin);}catch{socket.destroy();return;}
  if(!['http:','https:'].includes(origin.protocol)||origin.host!==req.headers.host){socket.destroy();return;}
  const token=String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('niko_game='))?.slice(10),session=service.session(token);
  if(!session||clients.size>=64||[...clients.values()].filter(x=>x.user===session.id).length>=2){socket.destroy();return;}
  wss.handleUpgrade(req,socket,head,ws=>{
   const state={user:session.id,token,at:Date.now(),count:0,busy:false,last:Date.now(),game:null,room:null};clients.set(ws,state);
   ws.on('error',()=>{});ws.on('close',()=>clients.delete(ws));
   ws.on('message',async bytes=>{
    if(state.busy){ws.close(1008);return;}state.busy=true;
    try{
     const now=Date.now();if(now-state.at>=1000){state.at=now;state.count=0;}if(++state.count>25)throw Error('输入频率过高');
     const active=service.session(token),input=JSON.parse(bytes.toString());if(!active||active.id!==state.user||input.csrf!==active.csrf||typeof input.id!=='string'||input.id.length>64)throw Error('登录校验失败');
     const game=service.engine.find(input.game);if(!service.config().gamesEnabled||game.kind!=='standalone'||!game.enabled||!active.games.includes(game.id)||!service.sessionMemberAllowed(game.id,state.user))throw Error('游戏授权失效');
     if(state.room&&(state.room!==input.room||state.game!==game.id))throw Error('连接不能切换房间');
     service.worlds??=new StandaloneWorlds(service);const presence=service.presenceState();presence.sweep(service.runtime);
     if(service.membership)await service.membership('touch',state.user,game.id,input.room);
     const result=service.worlds.request(game,state.user,{room:input.room,operation:input.operation,input:input.input});
     state.game=game.id;state.room=input.room;state.last=now;presence.touch(state.user,game,{id:input.room});
     if(ws.bufferedAmount>256000)throw Error('连接消费过慢');ws.send(JSON.stringify({id:input.id,result}));
    }catch{ws.close(1008,'world request rejected');}finally{state.busy=false;}
   });
  });
 };
 server.on('upgrade',upgrade);
 const timer=setInterval(()=>{for(const [ws,state]of clients){if(Date.now()-state.last>5000||!service.session(state.token)||state.game&&!service.sessionMemberAllowed(state.game,state.user)){ws.terminate();}}},1000);timer.unref();
 return ()=>{clearInterval(timer);server.off('upgrade',upgrade);for(const ws of clients.keys())ws.terminate();clients.clear();wss.close();};
}
