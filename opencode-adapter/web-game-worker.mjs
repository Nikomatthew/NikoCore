import fs from 'node:fs';
import path from 'node:path';
import {GameEngine} from './game-engine.mjs';
import {WebGameAccounts} from './web-game-accounts.mjs';
import {WebGameServer} from './web-game-server.mjs';
import {QQGameLogin} from './web-game-login.mjs';
import {GameCapabilityRegistry} from './game-capability-registry.mjs';
import {gamePresenceSummary} from './game-observability.mjs';
let service,engine,configFile,gameID,creator,quotaSweep,assignedPort=0;const pending=new Map();let serial=0;
function config(){return {...JSON.parse(fs.readFileSync(configFile,'utf8')),webGamePort:assignedPort};}
const askJudge=(method,room,question)=>new Promise((resolve,reject)=>{const id=++serial,timer=setTimeout(()=>{pending.delete(id);reject(Error('裁判请求超时'));},55000);pending.set(id,{resolve,reject,timer});process.send({judge:true,id,method,room,question});});
const membership=(method,player,game,room)=>new Promise((resolve,reject)=>{const id=++serial,timer=setTimeout(()=>{pending.delete(id);reject(Error('房间权限确认超时'));},4000);pending.set(id,{resolve,reject,timer});process.send({membership:true,id,method,player,game,room});});
const quota=(method,game,token,room)=>new Promise((resolve,reject)=>{const id=++serial,timer=setTimeout(()=>{pending.delete(id);reject(Error('房间限额确认超时'));},4000);pending.set(id,{resolve,reject,timer});process.send({quota:true,id,method,game,token,room});});
process.on('message',async message=>{
 if(message.judgeResult||message.membershipResult||message.quotaResult){const p=pending.get(message.id);if(p){clearTimeout(p.timer);pending.delete(message.id);message.error?p.reject(Error(message.error)):p.resolve(message.result);}return;}
 if(message.quota||message.membership||message.judge)return;
 try{
  let result;
   if(message.action==='start'){
    assignedPort=message.port??0;if(!Number.isInteger(assignedPort)||assignedPort<0||assignedPort>65535)throw Error('游戏端口无效');
    configFile=message.configFile;gameID=message.game.id;creator=message.creator;if(message.home)process.env.NIKOLINK_HOME=message.home;process.env.NIKOLINK_PACKAGED_WORKER=message.packaged?'1':'0';
   engine=new GameEngine(message.root);engine.games.set(gameID,{...message.game,enabled:true});
   engine.registry=new GameCapabilityRegistry(path.join(message.engineRoot,'capabilities'));
   const accounts=new WebGameAccounts(message.accountDirectory),reload=()=>{accounts.accounts=Object.assign(Object.create(null),fs.existsSync(accounts.file)?JSON.parse(fs.readFileSync(accounts.file,'utf8')):{});};
   const refreshGame=()=>{const file=path.join(message.engineRoot,'published',gameID+'.json');if(fs.existsSync(file)){const latest=JSON.parse(fs.readFileSync(file,'utf8')),snapshot=engine.find(gameID);engine.games.set(gameID,{...snapshot,enabled:latest.enabled,players:latest.players,blockedPlayers:latest.blockedPlayers,judgeForbidden:latest.judgeForbidden});}};
   const get=accounts.get.bind(accounts),login=accounts.login.bind(accounts),list=accounts.list.bind(accounts);accounts.get=token=>{reload();return get(token);};accounts.login=async(...args)=>{reload();return login(...args);};accounts.list=()=>{reload();return list();};
      const qqLogin=new QQGameLogin(config);service=new WebGameServer(engine,accounts,config,{qqLogin,judge:{decide:(r,q)=>askJudge('decide',r,q),score:r=>askJudge('score',r),solve:(r,s)=>askJudge('solve',r,s),evaluate:(r,o,t)=>askJudge('evaluate',r,{objective:o,text:t})}});
    service.packageRoot=message.engineRoot;
    service.vendorHome=message.vendorHome;
   const memberAllowed=service.sessionMemberAllowed.bind(service);service.sessionMemberAllowed=(game,user)=>{refreshGame();return memberAllowed(game,user);};
   service.membership=membership;
   service.quota=quota;
   const runtimeAct=service.runtime.act.bind(service.runtime);
   service.runtime.act=async(game,user,input)=>{
    let reservation;if(input.operation==='create')reservation=await quota('reserve',game.id);
    try{const room=await runtimeAct(game,user,input);if(reservation)await quota('commit',game.id,reservation.token,room.id);if(['finished','closed'].includes(room.status))await quota('finish',game.id,undefined,room.id);if(['create','join','leave'].includes(input.operation))process.send({observation:true,event:'room-'+input.operation});return room;}
    catch(error){if(reservation)await quota('cancel',game.id,reservation.token).catch(()=>{});throw error;}
   };
    service.presenceState();result={address:await service.start(),pid:process.pid};process.send({observation:true,event:'ready'});
    const released=new Set();quotaSweep=setInterval(()=>{service.presenceState().sweep(service.runtime);for(const room of service.runtime.summaries())if(['closed','finished'].includes(room.status)&&!released.has(room.id)){released.add(room.id);quota('finish',gameID,undefined,room.id).catch(()=>released.delete(room.id));}},1000);quotaSweep.unref();
  }else if(message.action==='qq-verify'){const event=message.event,parts=Array.isArray(event.message)?event.message:[],text=parts.filter(p=>p.type==='text').map(p=>p.data?.text||'').join('').trim(),match=text.match(/^\/网页登录\s+([A-Fa-f0-9]{12})$/);let verified=false;if(match&&event.message_type==='private'&&parts.every(p=>p.type==='text')){try{service.qqLogin.verify(String(event.user_id),match[1].toUpperCase());verified=true;}catch{}}result={verified};}
  else if(message.action==='update'){if(message.game.id!==gameID)throw Error('更新游戏不匹配');engine.registry.load();engine.games.set(gameID,message.game);result={updated:true};}
  else if(message.action==='room-stop'){
   const summaries=service.runtime.summaries(),room=summaries.find(r=>r.id===message.room&&r.game===gameID);if(!room)throw Error('房间不存在');
   const entry=service.runtime.entry(engine.find(gameID)),all=entry.rooms(entry.runtime),stored=all[room.id];
    if(message.user!==config().ownerQQ&&stored.owner!=='qq:'+message.user)throw Error('只能关闭自己创建的房间；账号密码房主尚未绑定QQ时由主人管理');
    stored.status='closed';stored.result={reason:'cancelled',winners:[]};stored.version++;if(entry.runtime.save)entry.runtime.save();else if(typeof entry.runtime.rooms?.save==='function')entry.runtime.rooms.save();await quota('finish',gameID,undefined,stored.id);result={stopped:true};
   }else if(message.action==='status'){service.presenceState().sweep(service.runtime);const summary=gamePresenceSummary(service.runtime,service.presence,gameID);result={address:service.address,rooms:service.runtime.entries.flatMap(entry=>Object.values(entry.rooms(entry.runtime)).map(r=>({id:r.id,game:r.game,status:r.status,owner:r.owner,players:(r.members||r.players||Object.keys(r.units||{})).length,online:summary.rooms.find(x=>x.id===r.id)?.online||0}))),onlinePlayers:summary.onlinePlayers,onlineMetric:summary.onlineMetric,pid:process.pid};}
   else if(message.action==='stop'){clearInterval(quotaSweep);await service?.stop();process.send({id:message.id,result:{stopped:true}});process.exit(0);return;}
  else throw Error('未知托管操作');
  process.send({id:message.id,result});
 }catch(error){process.send({id:message.id,error:error.message});}
});
process.on('disconnect',()=>{service?.stop().finally(()=>process.exit(0));});
