import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {allocateRoomNumber} from './room-number.mjs';

export class GameRooms {
  constructor(directory,{now=Date.now}={}){this.directory=directory;this.now=now;fs.mkdirSync(directory,{recursive:true});this.file=path.join(directory,'rooms.json');this.rooms=fs.existsSync(this.file)?JSON.parse(fs.readFileSync(this.file,'utf8')):{};}
  save(){const temp=this.file+'.tmp';fs.writeFileSync(temp,JSON.stringify(this.rooms),{mode:0o600});fs.renameSync(temp,this.file);}
  create(game,scope,owner,maxPlayers=4){
    if(!Number.isInteger(maxPlayers)||maxPlayers<1||maxPlayers>100)throw Error('房间人数需为1–100');
    if(Object.values(this.rooms).filter(r=>r.owner===owner&&r.status!=='closed').length>=3)throw Error('创建的房间过多');
    if(Object.values(this.rooms).filter(r=>r.status!=='closed').length>=100)throw Error('房间数量已达上限');
    const id=allocateRoomNumber(this.rooms),room={id,game,scope,owner,maxPlayers,status:'waiting',members:[owner],ready:[],turn:0,version:0,createdAt:this.now(),updatedAt:this.now(),state:{},requests:[]};this.rooms[id]=room;try{this.save();}catch(e){delete this.rooms[id];throw e;}return structuredClone(room);
  }
  get(id){const room=this.rooms[id];if(!room||room.status==='closed')throw Error('房间不存在或已关闭');return structuredClone(room);}
  change(id,user,expectedVersion,requestID,operation){
    const room=this.get(id);if(typeof requestID!=='string'||!/^[-\w]{8,100}$/.test(requestID))throw Error('操作编号无效');
    if(room.requests.some(r=>r.id===requestID&&r.user===user))return room;
    if(!Number.isInteger(expectedVersion)||room.version!==expectedVersion)throw Error('房间状态已更新，请刷新后重试');
    operation(room);room.version++;room.updatedAt=this.now();room.requests.push({id:requestID,user});room.requests=room.requests.slice(-128);
    const previous=this.rooms[id];this.rooms[id]=room;try{this.save();}catch(e){this.rooms[id]=previous;throw e;}return structuredClone(room);
  }
  join(id,user,version,requestID){return this.change(id,user,version,requestID,r=>{if(r.members.includes(user))return;if(r.status!=='waiting'||r.members.length>=r.maxPlayers)throw Error('房间无法加入');r.members.push(user);});}
  ready(id,user,version,requestID){return this.change(id,user,version,requestID,r=>{if(r.status!=='waiting'||!r.members.includes(user))throw Error('不能准备');if(!r.ready.includes(user))r.ready.push(user);});}
  start(id,user,version,requestID){return this.change(id,user,version,requestID,r=>{if(r.owner!==user||r.status!=='waiting'||r.members.length<2||r.ready.length!==r.members.length)throw Error('仅房主可在全部成员准备后开始');r.status='playing';r.turn=0;});}
  advance(id,user,version,requestID){return this.change(id,user,version,requestID,r=>{if(r.status!=='playing'||r.members[r.turn]!==user)throw Error('尚未轮到你');r.turn=(r.turn+1)%r.members.length;});}
  leave(id,user,version,requestID){return this.change(id,user,version,requestID,r=>{const index=r.members.indexOf(user);if(index<0)throw Error('不是房间成员');const current=r.members[r.turn];r.members.splice(index,1);r.ready=r.ready.filter(x=>x!==user);if(!r.members.length){r.status='closed';return;}if(r.owner===user)r.owner=r.members[0];r.turn=Math.max(0,r.members.indexOf(current));if(r.members.length<2)r.status='waiting';});}
}
