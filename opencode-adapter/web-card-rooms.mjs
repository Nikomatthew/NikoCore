import crypto from 'node:crypto';
import {allocateRoomNumber} from './room-number.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {newDoudizhu,bidDoudizhu,playDoudizhu,doudizhuView} from './game-packages/doudizhu.mjs';
export class WebCardRooms{
 constructor(directory){fs.mkdirSync(directory,{recursive:true});this.file=path.join(directory,'rooms.json');this.rooms=fs.existsSync(this.file)?JSON.parse(fs.readFileSync(this.file,'utf8')):{};}
 save(){fs.writeFileSync(this.file+'.tmp',JSON.stringify(this.rooms),{mode:0o600});fs.renameSync(this.file+'.tmp',this.file);}
 view(r,user){if(!r.players.includes(user))throw Error('不是房间成员');return {id:r.id,game:r.game,owner:r.owner,players:[...r.players],self:user,status:r.status,version:r.version,ready:[...r.ready],state:r.state?doudizhuView(r.state,user):null,result:r.result||null};}
 act(game,user,input){
 if(game.kind!=='doudizhu')throw Error('牌类游戏类型无效');
  if(input.operation==='create'){if(Object.keys(this.rooms).length>=500||Object.values(this.rooms).filter(r=>r.owner===user&&r.status!=='finished').length>=3)throw Error('房间数量已达上限');const r={id:allocateRoomNumber(this.rooms),game:game.id,owner:user,players:[user],ready:[],state:null,status:'waiting',version:0,requests:[]};this.rooms[r.id]=r;try{this.save();}catch(e){delete this.rooms[r.id];throw e;}return this.view(r,user);}
 const stored=this.rooms[input.room];if(!stored||stored.game!==game.id)throw Error('房间不存在');if(input.operation==='read')return this.view(stored,user);
 if(typeof input.requestID!=='string'||!/^[-\w]{8,100}$/.test(input.requestID))throw Error('操作编号无效');if(stored.requests.some(x=>x.user===user&&x.id===input.requestID))return this.view(stored,user);
 if(input.operation!=='join'&&input.version!==stored.version)throw Error('房间状态已改变，请刷新');const r=structuredClone(stored);
 if(input.operation==='join'){if(r.status!=='waiting'||r.players.length>=3||r.players.includes(user))throw Error('房间无法加入');r.players.push(user);}
 else{
  if(!r.players.includes(user))throw Error('不是房间成员');
  if(input.operation==='ready'){if(r.status!=='waiting')throw Error('当前不能准备');if(!r.ready.includes(user))r.ready.push(user);}
  else if(input.operation==='start'){if(user!==r.owner||r.status!=='waiting'||r.players.length!==3||r.ready.length!==3)throw Error('仅房主可在三人全准备后开始');r.state=newDoudizhu(r.players);r.status='playing';}
  else if(input.operation==='bid'){if(r.status!=='playing')throw Error('本局不在进行中');r.state=bidDoudizhu(r.state,user,input.bid);}
  else if(input.operation==='play'){if(r.status!=='playing')throw Error('本局不在进行中');r.state=playDoudizhu(r.state,user,input.cards);}
  else if(input.operation==='leave'){if(r.status==='finished')throw Error('本局已结束');r.status='finished';r.result={winners:[],reason:'cancelled'};}
  else throw Error('牌类操作无效');
 }
 if(r.state?.phase==='finished'){r.status='finished';r.result={winners:r.state.winners,reason:r.state.reason};}
 r.version++;r.requests.push({user,id:input.requestID});r.requests=r.requests.slice(-250);this.rooms[r.id]=r;try{this.save();}catch(e){this.rooms[r.id]=stored;throw e;}return this.view(r,user);
 }
}
