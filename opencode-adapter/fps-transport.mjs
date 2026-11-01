import {WebSocketServer} from 'ws';
export function attachFPSTransport(server,service){
 const wss=new WebSocketServer({noServer:true,maxPayload:2048,perMessageDeflate:false}),clients=new Map();
  server.on('upgrade',(req,socket,head)=>{
   if(req.url==='/world-socket')return;
  let origin;try{origin=new URL(req.headers.origin);}catch{socket.destroy();return;}
  if(req.url!=='/fps-socket'||!['http:','https:'].includes(origin.protocol)||origin.host!==req.headers.host){socket.destroy();return;}
  const cookie=String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('niko_game='))?.slice(10)||'',session=service.session(cookie);
  if(!session||[...clients.values()].filter(c=>c.user===session.id).length>=2||clients.size>=64){socket.destroy();return;}
  wss.handleUpgrade(req,socket,head,ws=>{
   const state={user:session.id,cookie,game:null,room:null,at:Date.now(),count:0,alive:true};clients.set(ws,state);
   ws.on('pong',()=>{state.alive=true;});
   ws.on('message',async raw=>{
    try{const now=Date.now();if(now-state.at>=1000){state.at=now;state.count=0;}if(++state.count>30){ws.close(1008,'rate limit');return;}
     const active=service.session(cookie),input=JSON.parse(raw.toString());if(!active||active.id!==state.user||input.csrf!==active.csrf)throw Error('登录已失效');
     const game=service.engine.find(input.game);if(game.kind!=='fps'||!game.enabled||!active.games.includes(game.id)||!service.sessionMemberAllowed(game.id,state.user))throw Error('游戏授权已失效');
     if(state.room&&(state.room!==input.room||state.game!==game.id))throw Error('连接不能更换房间');
     const entry=service.runtime.entry(game),room=entry.runtime.rooms[input.room];if(!room||room.game!==game.id||room.status==='closed'||!room.units[state.user])throw Error('不是竞技房间成员或房间已停止');
     state.game=game.id;state.room=room.id;for(const member of Object.keys(room.units))if(!service.sessionMemberAllowed(game.id,member))delete room.units[member];
     const snapshot=room.status==='finished'?entry.runtime.act(game,state.user,{operation:'read',room:room.id}):entry.runtime.act(game,state.user,{...input,operation:'input'});service.recordRoom(game,snapshot);
     if(service.membership)await service.membership('touch',state.user,game.id,snapshot.id);
     service.presenceState().touch(state.user,game,snapshot);
     if(ws.bufferedAmount>256000){ws.close(1013,'slow consumer');return;}
     ws.send(JSON.stringify({room:snapshot}));
    }catch{ws.send(JSON.stringify({error:'竞技连接状态或请求无效，请刷新并重新登录'}));ws.close(1008);}
   });
   ws.on('error',()=>{});ws.on('close',()=>clients.delete(ws));
  });
 });
 const heartbeat=setInterval(()=>{for(const [ws,state]of clients){if(!state.alive||!service.session(state.cookie)||state.game&&!service.sessionMemberAllowed(state.game,state.user)){ws.terminate();continue;}state.alive=false;ws.ping();}},30000);heartbeat.unref();
 return ()=>{clearInterval(heartbeat);for(const ws of clients.keys())ws.terminate();clients.clear();wss.close();};
}
