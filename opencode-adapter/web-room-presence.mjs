import {removePartyMember} from './game-parties.mjs';
export class WebRoomPresence{
 constructor({now=Date.now}={}){this.now=now;this.entries=new Map();}
 sweep(runtime){const now=this.now();for(const [user,entry]of this.entries){if(now-entry.at<=5000)continue;this.entries.delete(user);try{const game={id:entry.game,kind:entry.kind},item=runtime.entry(game),room=item.rooms(item.runtime)[entry.room];if(!room)continue;const members=room.members||room.players;
  if(room.units){delete room.units[user];if(room.owner===user)room.owner=Object.keys(room.units)[0]||room.owner;}
    else if(members?.includes(user)){const property=room.members?'members':'players';room.departed??=[];if(!room.departed.includes(user))room.departed.push(user);if(room.status==='waiting'||['flow','standalone'].includes(entry.kind)){room[property]=members.filter(id=>id!==user);if(Array.isArray(room.ready))room.ready=room.ready.filter(id=>id!==user);if(room.owner===user&&room[property].length)room.owner=room[property][0];}room.version++;if(item.runtime.save)item.runtime.save();else if(typeof item.runtime.rooms?.save==='function')item.runtime.rooms.save();}
    if(['flow','standalone'].includes(entry.kind)){removePartyMember(room,user);if(!room.players.length)room.status='closed';if(typeof item.runtime.save==='function')item.runtime.save();}
  }catch{}}
 }
  check(user,game,room,operation){const previous=this.entries.get(user);if(previous&&(previous.game!==game||room&&previous.room!==room)&&['create','join'].includes(operation))throw Error('请先退出当前所在房间');}
  departed(runtime,game,room,user){if(!room)return false;const entry=runtime.entry(game),stored=entry.rooms(entry.runtime)[room];return Boolean(stored?.departed?.includes(user));}
  rejoin(runtime,game,room,user){const entry=runtime.entry(game),stored=entry.rooms(entry.runtime)[room];if(!stored?.departed?.includes(user))return false;if(stored.status==='closed'||stored.status==='finished')throw Error('该对局已结束');const members=stored.members||stored.players;if(!members?.includes(user))return false;stored.departed=stored.departed.filter(p=>p!==user);stored.version++;if(entry.runtime.save)entry.runtime.save();else if(typeof entry.runtime.rooms?.save==='function')entry.runtime.rooms.save();return true;}
 touch(user,game,room){if(room.left){this.entries.delete(user);return;}this.entries.set(user,{game:game.id,kind:game.kind,room:room.id,at:this.now()});}
 clear(){this.entries.clear();}
}
