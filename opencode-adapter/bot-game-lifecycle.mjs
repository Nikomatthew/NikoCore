import {playerMayJoin,mayCreateGame} from './game-access.mjs';
const active=r=>['waiting','dealing','playing'].includes(r.status);
export class BotGameLifecycle{
 constructor(engine,rooms,store,send,{web}={}){this.engine=engine;this.rooms=rooms;this.store=store;this.send=send;this.web=web;}
 membership(user){return Object.values(this.rooms.rooms).find(r=>active(r)&&r.members.includes(user));}
 clear(room){for(const [key,profile]of Object.entries(this.engine.players))if(room.members.some(user=>key===room.scope+':'+user)&&profile.active===room.game)profile.active=null;this.engine.save();}
 close(room,user,request){const result=this.rooms.change(room.id,user,room.version,request,r=>{r.status='closed';});this.clear(room);return result;}
 async handle(text,scope,user,target,request){
 const c=this.store.value;
 if(text==='/游戏列表'){const games=[...this.engine.games.values()].filter(g=>g.enabled&&(user===c.ownerQQ||playerMayJoin(g,user)));await this.send(target,'游戏名 - 游戏编号\n'+(games.length?games.map((g,i)=>`${i+1}.${g.name} - ${this.engine.numbers.get(g.id)}`).join('\n'):'暂无可用游戏'),'text');return true;}
 if(text==='/游戏退出'){
  const room=this.membership(user);if(!room||room.scope!==scope){await this.send(target,'你当前不在此会话的游戏房间中','text');return true;}
  if(room.owner===user)this.close(room,user,request);
  else{this.rooms.change(room.id,user,room.version,request,r=>{if(['dealing','playing'].includes(r.status)&&r.state?.kind){r.status='closed';}else{r.members=r.members.filter(id=>id!==user);r.ready=r.ready.filter(id=>id!==user);}});const latest=this.rooms.rooms[room.id];if(latest.status==='closed')this.clear(room);else{const p=this.engine.players[scope+':'+user];if(p)p.active=null;this.engine.save();}}
  await this.send(target,'好的','text');return true;
 }
 const match=text.match(/^\/(游戏创建|网页游戏创建|游戏停止|网页游戏停止|游戏加入)\s+(\d{6})(?:\s+(\S+))?$/);
 if(!match){if(/^\/(?:游戏创建|网页游戏创建|游戏停止|网页游戏停止|游戏加入)(?:\s|$)/.test(text)){await this.send(target,'请使用六位游戏编号，加入时还需房间号','text');return true;}return false;}
 try{
  const [,operation,number,roomID]=match,game=this.engine.find(number),isWeb=operation.startsWith('网页');
  if((isWeb?'web':'bot')!==game.type)throw Error('指令与游戏类型不符');
  if(operation.endsWith('停止')){
   if(isWeb){if(!this.web)throw Error('网页独立运行入口尚未配置');await this.web.stop(game,user,roomID);}
   else{const candidates=Object.values(this.rooms.rooms).filter(r=>r.game===game.id&&active(r)&&(roomID?r.id===roomID:true));if(!candidates.length)throw Error('没有运行中的房间');if(candidates.some(r=>user!==c.ownerQQ&&(r.owner!==user||!mayCreateGame(c,user))))throw Error('只能关闭自己创建的房间，主人可关闭全部');for(const room of candidates)this.close(room,user,request+'-'+room.id);}
   await this.send(target,'好的','text');return true;
  }
  if(!game.enabled)throw Error('游戏未开启');
  if(operation==='网页游戏创建'){if(!mayCreateGame(c,user))throw Error('没有创建房间权限');if(!this.web)throw Error('网页独立运行入口尚未配置');const result=await this.web.create(game,user,scope);await this.send(target,`${game.name} - ${number}\n${result.url}`,'text');return true;}
  const occupied=this.membership(user)||this.web?.memberships?.occupiedQQ(user);if(occupied)throw Error('请先退出当前所在房间');
  if(!playerMayJoin(game,user)&&user!==c.ownerQQ)throw Error('没有加入本游戏的权限');
  let room;
   if(operation==='游戏创建'){
   const global=this.web?.quota?.counts();if(global&&(global.count>=(c.gameMaxRooms||1)||!global.games.has(game.id)&&global.games.size>=(c.gameMaxRunning||1)))throw Error('同时运行游戏或房间数量已达上限');
   if(!mayCreateGame(c,user))throw Error('没有创建房间权限');const all=Object.values(this.rooms.rooms).filter(active),gameIDs=new Set(all.map(r=>r.game));if(all.length>=(c.gameMaxRooms||1)||!gameIDs.has(game.id)&&gameIDs.size>=(c.gameMaxRunning||1))throw Error('同时运行的游戏或房间已达上限');
   room=this.rooms.create(game.id,scope,user,c.gameMaxPlayers||10);
  }else{if(!roomID)throw Error('用法：/游戏加入 六位编号 房间号');room=this.rooms.get(roomID);if(room.game!==game.id||room.scope!==scope)throw Error('房间与当前游戏或会话不符');room=this.rooms.join(room.id,user,room.version,request);}
  const profile=this.engine.players[scope+':'+user]||{active:null,saves:{}};profile.active=game.id;profile.saves[game.id]??={coins:game.initialCoins,cooldowns:{}};this.engine.players[scope+':'+user]=profile;this.engine.save();
  await this.send(target,`${game.name} - ${number}\n房间号：${room.id}\n${operation==='游戏创建'?'房间已创建':'已加入房间'}`,'text');return true;
 }catch(error){await this.send(target,error.message,'text');return true;}
 }
}
