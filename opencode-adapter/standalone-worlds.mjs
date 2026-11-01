import path from 'node:path';
import {GameAuthorityStore} from './game-authority-store.mjs';
import {AuthoritativeWorld} from './game-authoritative-world.mjs';
import {inspectWebGamePackage} from './web-game-package.mjs';
import {GameScriptService} from './game-script-service.mjs';
import {RoomActionQueue} from './room-action-queue.mjs';
export class StandaloneWorlds{
  constructor(service){this.service=service;this.closed=false;this.worlds=new Map();this.scripts=new Map();this.scriptPending=new Set();this.scriptStates=new Map();this.scriptOwners=new Map();this.store=new GameAuthorityStore(path.join(service.engine.root,'authority'));this.timer=setInterval(()=>this.step(),50);this.timer.unref();}
  async prepare(game,room){
   const key=game.id+':'+room;if(this.scripts.has(key)&&this.scriptOwners.get(key)?.hash!==game.webPackage.hash){this.scripts.get(key).close();this.scripts.delete(key);this.scriptStates.delete(key);this.scriptOwners.delete(key);}if(this.scripts.has(key)||game.webPackage.backend!=='quickjs-v1')return;if(this.scripts.size+this.scriptPending.size>=16)throw Error('受限后端数量超过预算');
   if(this.scriptPending.has(key))throw Error('游戏后端正在初始化，请稍后重试');this.scriptPending.add(key);
   try{if(this.closed)throw Error('世界服务已停止');const archive=inspectWebGamePackage(path.join(this.service.packageRoot||this.service.engine.root,'web-packages',game.webPackage.hash));if(archive.hash!==game.webPackage.hash)throw Error('后端摘要不一致');const source=archive.files.find(file=>file.name===archive.manifest.server).bytes.toString('utf8');const script=await GameScriptService.create(source);if(this.closed){script.close();throw Error('世界服务已停止');}this.scripts.set(key,script);this.scriptOwners.set(key,{game:game.id,room,hash:game.webPackage.hash});}finally{this.scriptPending.delete(key);}
  }
   async custom(game,user,input){
    this.actionQueue??=new RoomActionQueue();return this.actionQueue.run(game.id+':'+input.room,()=>this.customAction(game,user,input));
   }
   async customAction(game,user,input){
   if(!game.webPackage.toolkit.includes('world')||game.webPackage.backend!=='quickjs-v1')throw Error('未声明受限后端工具');this.room(game,user,input.room);await this.prepare(game,input.room);this.room(game,user,input.room);if(!this.service.sessionMemberAllowed(game.id,user))throw Error('游戏授权失效');const key=game.id+':'+input.room,script=this.scripts.get(key);if(!script)throw Error('游戏未声明受限后端');if(input.operation!=='action')throw Error('后端操作无效');
   const previous=this.scriptStates.get(key)||{},result=await script.update(previous,{player:user,action:input.action},.05);
   if(!result||typeof result!=='object'||Array.isArray(result)||!result.state||typeof result.state!=='object'||Array.isArray(result.state)||Buffer.byteLength(JSON.stringify(result))>64000)throw Error('后端返回需包含受预算state对象');
   this.room(game,user,input.room);if(this.closed||this.scripts.get(key)!==script||!this.service.config().gamesEnabled||!this.service.sessionMemberAllowed(game.id,user)||this.service.engine.find(game.id).webPackage.hash!==game.webPackage.hash)throw Error('游戏授权或版本失效');this.scriptStates.set(key,structuredClone(result.state));return {state:structuredClone(result.state),authority:'server-script'};
  }
 room(game,user,id){const entry=this.service.runtime.entry(game),room=entry.rooms(entry.runtime)[id];if(!room||room.game!==game.id||room.status!=='playing'||!room.players.includes(user)||room.departed?.includes(user))throw Error('不是有效房间成员');return room;}
 request(game,user,input){
  if(!game.webPackage.toolkit.includes('world'))throw Error('未声明world工具');const room=this.room(game,user,input.room),key=game.id+':'+room.id;let world=this.worlds.get(key);
  if(!world){if(this.worlds.size>=32)throw Error('世界数量达到预算');world=new AuthoritativeWorld({game:game.id,room:room.id,store:this.store});this.worlds.set(key,world);}
  for(const player of room.players)if(!room.departed?.includes(player)&&this.service.sessionMemberAllowed(game.id,player))world.join(player);
  if(input.operation==='input')world.input(user,input.input);else if(input.operation!=='read')throw Error('世界操作无效');
   return {world:world.snapshot(),coins:this.store.balance(game.id,user),inventory:this.store.inventory(game.id,user),authority:'server'};
 }
  step(){
   for(const [key,owner]of this.scriptOwners){let valid=false;try{const game=this.service.engine.find(owner.game),entry=this.service.runtime.entry(game),room=entry.rooms(entry.runtime)[owner.room];valid=game.enabled&&this.service.config().gamesEnabled&&game.webPackage.hash===owner.hash&&room?.status==='playing';}catch{}if(!valid){this.scripts.get(key)?.close();this.scripts.delete(key);this.scriptStates.delete(key);this.scriptOwners.delete(key);}}
   for(const [key,world]of this.worlds){try{const game=this.service.engine.find(world.game),entry=this.service.runtime.entry(game),room=entry.rooms(entry.runtime)[world.room];if(!game.enabled||!this.service.config().gamesEnabled||!room||room.status!=='playing'){this.worlds.delete(key);continue;}for(const player of world.players.keys())if(!room.players.includes(player)||room.departed?.includes(player)||!this.service.sessionMemberAllowed(game.id,player))world.leave(player);world.step(.05);}catch{this.worlds.delete(key);}}
  }
   close(){if(this.closed)return;this.closed=true;clearInterval(this.timer);this.worlds.clear();for(const script of this.scripts.values())script.close();this.scripts.clear();this.scriptStates.clear();this.scriptOwners.clear();this.store.close();}
}
