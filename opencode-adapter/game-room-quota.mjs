import crypto from 'node:crypto';
export class GameRoomQuota{
 constructor(config,{botRooms=()=>[],now=Date.now}={}){this.config=config;this.botRooms=botRooms;this.now=now;this.rooms=new Map();this.pending=new Map();}
 counts(){for(const [key,item]of this.pending)if(item.expires<=this.now())this.pending.delete(key);const active=this.botRooms().filter(r=>['waiting','dealing','playing'].includes(r.status));return {count:active.length+this.rooms.size+this.pending.size,games:new Set([...active.map(r=>r.game),...[...this.rooms.values()].map(r=>r.game),...[...this.pending.values()].map(r=>r.game)])};}
 reserve(game){const limits=this.config(),counts=this.counts();if(counts.count>=(limits.gameMaxRooms||1)||!counts.games.has(game)&&counts.games.size>=(limits.gameMaxRunning||1))throw Error('同时运行游戏或房间数量已达上限');const token=crypto.randomUUID();this.pending.set(token,{game,expires:this.now()+10000});return {token};}
 commit(game,token,room){const claim=this.pending.get(token);if(!claim||claim.game!==game||claim.expires<=this.now()||typeof room!=='string')throw Error('房间创建预留已失效');this.pending.delete(token);this.rooms.set(game+':'+room,{game,room});}
 cancel(game,token){if(this.pending.get(token)?.game===game)this.pending.delete(token);}
 finish(game,room){this.rooms.delete(game+':'+room);}
 removeGame(game){for(const [key,item]of this.rooms)if(item.game===game)this.rooms.delete(key);for(const [key,item]of this.pending)if(item.game===game)this.pending.delete(key);}
}
