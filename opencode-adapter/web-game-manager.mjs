import fs from 'node:fs';
import path from 'node:path';
import {fork} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {GameTunnel} from './game-tunnel.mjs';
import {mayCreateGame} from './game-access.mjs';
import {GameMemberships} from './game-memberships.mjs';
import {GameRoomQuota} from './game-room-quota.mjs';
import {gameWorkerEntry} from './game-worker-entry.mjs';
import {GameObservability} from './game-observability.mjs';
import {isSea} from 'node:sea';
import {selectGameRoute} from './game-route-allocation.mjs';
export class WebGameManager{
  constructor({engine,store,home,judge,accountDirectory,botRoom,botRooms,tunnelFactory}){Object.assign(this,{engine,store,home,judge,accountDirectory});this.tunnelFactory=tunnelFactory||(()=>new GameTunnel(this.home,{settings:()=>this.store.value}));this.instances=new Map();this.starting=new Set();this.serial=0;this.memberships=new GameMemberships({botRoom});this.quota=new GameRoomQuota(()=>store.value,{botRooms});}
  rpc(instance,action,data={},timeout=15000){return new Promise((resolve,reject)=>{if(!instance.child.connected)return reject(Error('游戏后台未连接'));const id='manager-'+(++this.serial),timer=setTimeout(()=>{instance.pending.delete(id);reject(Error('游戏后台响应超时'));},timeout);instance.pending.set(id,{resolve,reject,timer});instance.child.send({id,action,...data});});}
 async create(game,user,scope){
  this.observability??=new GameObservability();
   this.routeClaims??=new Map();
  const c=this.store.value;if(!mayCreateGame(c,user))throw Error('没有创建权限');if(this.starting.has(game.id))throw Error('该游戏正在启动');const existing=this.instances.get(game.id);if(existing)return {url:existing.url,address:existing.address};
  if(this.instances.size+this.starting.size>=(c.gameMaxRunning||1))throw Error('同时运行游戏数量已达上限');
  this.starting.add(game.id);let instance;
  try{
    const route=selectGameRoute(c,this.routeClaims);if(route)this.routeClaims.set(game.id,route.port);
   const root=path.join(this.engine.root,'web-instances',game.id);fs.mkdirSync(root,{recursive:true});
    const worker=gameWorkerEntry(this.home),child=fork(worker.entry,[],{execPath:worker.executable,execArgv:[],windowsHide:true,stdio:['ignore','ignore','ignore','ipc'],env:{SystemRoot:process.env.SystemRoot,PATH:process.env.PATH,TEMP:process.env.TEMP,TMP:process.env.TMP}});
     instance={child,pending:new Map(),owner:user,scope,game:game.id,address:null,url:null,startedAt:Date.now(),tunnel:this.tunnelFactory()};
    this.observability.event(game.id,'info','正在启动游戏后台');
    child.on('message',message=>{if(message.observation===true&&['ready','room-create','room-join','room-leave','room-stop','runtime-error','update'].includes(message.event))this.observability.event(game.id,message.event==='runtime-error'?'error':'info',message.event);});
    child.on('exit',(code)=>this.observability.event(game.id,'warning','后台退出，退出码 '+code));
   child.on('message',message=>{if(!message.quota)return;try{if(message.game!==game.id||!['reserve','commit','cancel','finish'].includes(message.method))throw Error('房间限额请求无效');const args=message.method==='commit'?[game.id,message.token,message.room]:message.method==='reserve'?[game.id]:[game.id,message.token||message.room];const result=this.quota[message.method](...args);if(child.connected)child.send({quotaResult:true,id:message.id,result:result||{ok:true}});}catch(error){if(child.connected)child.send({quotaResult:true,id:message.id,error:error.message});}});
    child.on('message',async message=>{if(message.membership){try{if(message.game!==game.id||!['acquire','touch','release'].includes(message.method)||typeof message.player!=='string'||! /^(?:qq:\d{5,15}|[a-f0-9-]{36})$/.test(message.player))throw Error('玩家租约请求无效');const result=this.memberships[message.method](message.player,game.id,message.room);if(child.connected)child.send({membershipResult:true,id:message.id,result:result||{allowed:true}});}catch(error){if(child.connected)child.send({membershipResult:true,id:message.id,error:error.message});}return;}if(message.judge){try{const current=this.engine.find(game.id);if(current.judgeForbidden===true)throw Error('AI裁判功能未开启');if(!current.enabled||!this.store.value.gamesEnabled||!['decide','score','solve','evaluate'].includes(message.method))throw Error('游戏已停用或裁判调用无效');const result=await this.judge[message.method](message.room,message.question);if(this.engine.find(game.id).judgeForbidden===true)throw Error('AI裁判功能未开启');if(child.connected)child.send({judgeResult:true,id:message.id,result});}catch(error){if(child.connected)child.send({judgeResult:true,id:message.id,error:error.message==='AI裁判功能未开启'?error.message:'裁判暂不可用'});}return;}const p=instance.pending.get(message.id);if(p){clearTimeout(p.timer);instance.pending.delete(message.id);message.error?p.reject(Error(message.error)):p.resolve(message.result);}});
     child.on('error',()=>{});child.on('exit',()=>{instance.tunnel.stop();this.routeClaims.delete(game.id);this.memberships.removeGame(game.id);this.quota.removeGame(game.id);if(this.instances.get(game.id)===instance)this.instances.delete(game.id);for(const p of instance.pending.values()){clearTimeout(p.timer);p.reject(Error('游戏后台已退出'));}instance.pending.clear();});
    const started=await this.rpc(instance,'start',{game,creator:user,root,engineRoot:this.engine.root,configFile:this.store.file,accountDirectory:this.accountDirectory,vendorHome:path.join(this.home,'runtime'),home:this.home,packaged:isSea(),port:route?.port||0});instance.address=started.address;instance.networkMode=route?'custom':'cloudflare';instance.port=route?.port||Number(new URL(started.address).port);
    if(route)instance.url=route.url;
    else{instance.tunnel.start(instance.address);for(let i=0;i<100;i++){if(instance.tunnel.url){instance.url=instance.tunnel.url;break;}if(!instance.tunnel.child)throw Error('公网隧道启动失败');await new Promise(resolve=>setTimeout(resolve,200));}if(!instance.url)throw Error('公网隧道未就绪');}
   this.instances.set(game.id,instance);return {url:instance.url,address:instance.address,pid:child.pid};
    }catch(error){if(instance){instance.tunnel.stop();instance.child.kill();}this.routeClaims.delete(game.id);throw error;}finally{this.starting.delete(game.id);}
 }
 async stop(game,user,room){const instance=this.instances.get(game.id);if(!instance)throw Error('该网页游戏未运行');const owner=user===this.store.value.ownerQQ;if(!owner&&!mayCreateGame(this.store.value,user))throw Error('没有关闭房间权限');if(room){await this.rpc(instance,'room-stop',{room,user});const status=await this.rpc(instance,'status');if(status.rooms.some(r=>!['closed','finished'].includes(r.status)))return;}else if(!owner){const status=await this.rpc(instance,'status'),active=status.rooms.filter(r=>!['closed','finished'].includes(r.status));if(active.some(r=>r.owner!=='qq:'+user)||!active.length&&instance.owner!==user)throw Error('只能关闭自己创建的游戏房间，请指定房间号');}instance.tunnel.stop();try{await this.rpc(instance,'stop',{},5000);}finally{instance.child.kill();this.instances.delete(game.id);this.routeClaims?.delete(game.id);if(![...this.instances.values()].some(i=>i.networkMode==='cloudflare'))this.namedTunnel?.stop();}}
 async verify(event){const results=await Promise.allSettled([...this.instances.values()].map(i=>this.rpc(i,'qq-verify',{event},5000)));return results.some(r=>r.status==='fulfilled'&&r.value?.verified===true);}
 async update(game){const instance=this.instances.get(game.id);if(instance)await this.rpc(instance,'update',{game});}
 async console(game){const instance=this.instances.get(game.id),log=this.observability?.read(game.id)||{events:[],startedAt:null};if(!instance)return {...log,running:false,rooms:[],onlinePlayers:0};try{return {...log,running:true,startedAt:instance.startedAt,...await this.rpc(instance,'status')};}catch{return {...log,running:true,state:'unavailable',rooms:[],onlinePlayers:null};}}
  list(){return [...this.instances.values()].map(i=>({game:i.game,owner:i.owner,pid:i.child.pid,address:i.address,url:i.url,port:i.port,networkMode:i.networkMode,tunnel:i.networkMode==='cloudflare'?i.tunnel.view():null}));}
 async status(){return Promise.all([...this.instances.values()].map(async i=>{try{return {...this.list().find(s=>s.game===i.game),...await this.rpc(i,'status')};}catch{return {game:i.game,owner:i.owner,status:'unavailable'};}}));}
 stopAll(){for(const i of this.instances.values()){i.tunnel.stop();i.child.kill();}this.instances.clear();this.namedTunnel?.stop();this.routeClaims?.clear();}
}
