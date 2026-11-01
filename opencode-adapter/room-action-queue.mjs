export class RoomActionQueue{
 constructor(limit=8){this.limit=limit;this.rooms=new Map();}
 run(key,action){
  let entry=this.rooms.get(key);if(!entry){entry={tail:Promise.resolve(),count:0};this.rooms.set(key,entry);}
  if(entry.count>=this.limit)return Promise.reject(Error('房间操作队列已满，请稍后再试'));
  entry.count++;const result=entry.tail.then(action);entry.tail=result.catch(()=>{});
  return result.finally(()=>{entry.count--;if(!entry.count&&this.rooms.get(key)===entry)this.rooms.delete(key);});
 }
}
