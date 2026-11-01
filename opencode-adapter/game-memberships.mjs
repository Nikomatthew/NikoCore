export class GameMemberships{
 constructor({now=Date.now,botRoom=()=>null}={}){this.now=now;this.botRoom=botRoom;this.entries=new Map();}
 key(player){return player.startsWith('qq:')?player.slice(3):player;}
 acquire(player,game,room){const key=this.key(player),bot=/^\d{5,15}$/.test(key)?this.botRoom(key):null;if(bot)throw Error('请先退出当前所在房间');const prior=this.entries.get(key);if(prior&&prior.expires>this.now()&&(prior.game!==game||!room||prior.room!=='pending'&&prior.room!==room))throw Error('请先退出当前所在房间');const claim=room||'pending';this.entries.set(key,{player,game,room:claim,expires:this.now()+5000});return {allowed:true};}
 touch(player,game,room){this.acquire(player,game,room);const key=this.key(player);this.entries.set(key,{player,game,room,expires:this.now()+5000});return {allowed:true};}
 release(player,game,room){const key=this.key(player),prior=this.entries.get(key);if(prior?.game===game&&(!room||prior.room===room))this.entries.delete(key);}
 occupiedQQ(qq){const entry=this.entries.get(qq);return entry&&entry.expires>this.now()?entry:null;}
 removeGame(game){for(const [key,entry]of this.entries)if(entry.game===game)this.entries.delete(key);}
}
