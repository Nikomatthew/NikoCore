import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {allocateRoomNumber} from './room-number.mjs';
import {executeFlow,validateMultiplayerFlow} from './game-packages/flow.mjs';
import {partyFor,publicParties,changeParty,removePartyMember} from './game-parties.mjs';
export class WebFlowRooms{
  constructor(directory,{now=Date.now,random=Math.random}={}){fs.mkdirSync(directory,{recursive:true});this.file=path.join(directory,'rooms.json');const stored=fs.existsSync(this.file)?JSON.parse(fs.readFileSync(this.file,'utf8')):{};this.rooms=stored.format===2?stored.rooms:stored;this.profiles=stored.format===2?stored.profiles:{};this.now=now;this.random=random;this.presence=new Map();}
  save(){fs.writeFileSync(this.file+'.tmp',JSON.stringify({format:2,rooms:this.rooms,profiles:this.profiles}),{mode:0o600});fs.renameSync(this.file+'.tmp',this.file);}
  profile(game,user){return structuredClone(this.profiles[game.id]?.[user]||Object.values(this.rooms).filter(r=>r.game===game.id&&r.saves?.[user]).sort((a,b)=>(b.updated||0)-(a.updated||0))[0]?.saves[user]||{flowValues:{...game.flow.values},cooldowns:{}});}
  view(room,game,user){if(!room.players.includes(user))throw Error('不是房间成员');const at=this.now();this.presence.set(room.id+':'+user,at);for(const [key,time]of this.presence)if(at-time>60000)this.presence.delete(key);const field=game.multiplayer.leaderboardField,leaderboard=field?room.players.map(id=>({player:id,seat:room.players.indexOf(id)+1,score:this.profile(game,id).flowValues?.[field]??game.flow.values?.[field]??0})).sort((a,b)=>b.score-a.score||a.seat-b.seat):[];
  return {id:room.id,game:room.game,self:user,owner:room.owner,players:[...room.players],version:room.version,status:room.status,online:room.players.filter(id=>at-(this.presence.get(room.id+':'+id)??-Infinity)<=30000).length,leaderboard,parties:publicParties(room),party:structuredClone(partyFor(room,user)),own:this.profile(game,user),activity:structuredClone(room.activity),result:null};}
 act(game,user,input){
 validateMultiplayerFlow(game);if(!game.multiplayer?.enabled)throw Error('本游戏未声明多人流程');
  if(input.operation==='create'){if(Object.keys(this.rooms).length>=500||Object.values(this.rooms).filter(r=>r.owner===user&&r.status==='playing').length>=3)throw Error('房间数量已达上限');const r={id:allocateRoomNumber(this.rooms),game:game.id,owner:user,players:[user],saves:{[user]:this.profile(game,user)},requests:[],activity:[],status:'playing',version:0,updated:this.now()};this.rooms[r.id]=r;try{this.save();}catch(e){delete this.rooms[r.id];throw e;}return this.view(r,game,user);}
  const stored=this.rooms[input.room];if(!stored||stored.game!==game.id)throw Error('房间不存在');if(input.operation==='read')return this.view(stored,game,user);
 if(typeof input.requestID!=='string'||!/^[-\w]{8,100}$/.test(input.requestID))throw Error('操作编号无效');
  if(stored.requests.some(p=>p.id===input.requestID&&p.user===user))return this.view(stored,game,user);
  if(input.operation==='action'&&this.profile(game,user).requests?.includes(input.requestID)){if(!stored.players.includes(user))throw Error('不是房间成员');return this.view(stored,game,user);}
  const room=structuredClone(stored),profilesBefore=structuredClone(this.profiles);
   if(input.operation==='join'){if(room.status!=='playing')throw Error('房间已关闭');if(!room.players.includes(user)){if(room.players.length>=game.multiplayer.maxPlayers)throw Error('房间已满');room.players.push(user);room.saves[user]=this.profile(game,user);}room.departed=(room.departed||[]).filter(player=>player!==user);}
 else{
 if(!room.players.includes(user)||room.status!=='playing')throw Error('不是房间成员或房间已关闭');
  if(input.operation==='leave'){removePartyMember(room,user);room.players=room.players.filter(p=>p!==user);if(!room.players.length)room.status='closed';else if(room.owner===user)room.owner=room.players[0];}
  else if(['party-create','party-join','party-leave'].includes(input.operation)){if(input.version!==room.version)throw Error('队伍状态已更新，请刷新后重试');changeParty(room,game,user,input.operation,input.party);}
 else if(input.operation==='action'){
  const command=game.commands.find(c=>c.name===input.command);if(!command||command.action.type!=='flow')throw Error('流程指令无效');const save=this.profile(game,user),now=this.now();save.cooldowns??={};if(now<(save.cooldowns[command.name]||0))throw Error('操作冷却中');const reply=executeFlow(game,save,command.name,this.random);save.cooldowns[command.name]=now+command.cooldownSeconds*1000;save.requests=[...(save.requests||[]),input.requestID].slice(-500);room.saves[user]=save;this.profiles[game.id]??={};this.profiles[game.id][user]=structuredClone(save);room.activity.push({seat:room.players.indexOf(user)+1,reply,at:now});room.activity=room.activity.slice(-30);
 }else throw Error('多人流程操作无效');}
  room.version++;room.updated=this.now();room.requests.push({id:input.requestID,user});room.requests=room.requests.slice(-250);this.rooms[room.id]=room;try{this.save();}catch(e){this.rooms[room.id]=stored;this.profiles=profilesBefore;throw e;}
 if(input.operation==='leave')return {id:room.id,left:true,status:room.status};return this.view(room,game,user);
 }
}
