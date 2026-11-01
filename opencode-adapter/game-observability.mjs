export class GameObservability{
 constructor({now=Date.now}={}){this.now=now;this.games=new Map();}
 event(game,level,message){
  if(!this.games.has(game)){if(this.games.size>=100)this.games.delete(this.games.keys().next().value);this.games.set(game,{startedAt:this.now(),events:[],serial:0});}
  const state=this.games.get(game);state.events.push({id:++state.serial,at:this.now(),level,message:String(message).slice(0,160)});state.events=state.events.slice(-200);
 }
 read(game){const state=this.games.get(game);return state?{startedAt:state.startedAt,events:state.events.map(e=>({...e}))}:{startedAt:null,events:[]};}
}
export function gamePresenceSummary(runtime,presence,game,now=Date.now()){
 const entries=[...(presence?.entries?.values()||[])].filter(e=>e.game===game&&now-e.at<=5000),online=new Set();
 const rooms=runtime.summaries().filter(r=>r.game===game&&!['closed','finished'].includes(r.status)).map(room=>{
  const connected=entries.filter(e=>e.room===room.id);return {id:room.id,status:room.status,players:room.members.length,online:connected.length};
 });
 for(const [user,e]of presence?.entries||[])if(e.game===game&&now-e.at<=5000&&rooms.some(r=>r.id===e.room))online.add(user);
 return {rooms,onlinePlayers:online.size,onlineMetric:'5秒内有效房间心跳的唯一玩家，不是登录会话数或浏览器连接数'};
}
