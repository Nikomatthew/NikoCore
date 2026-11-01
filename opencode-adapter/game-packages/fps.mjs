import crypto from 'node:crypto';
import {allocateRoomNumber} from '../room-number.mjs';
export const arenaMap=Object.freeze(['1111111111111111','1000000000000001','1000000000000001','1000110000110001','1000000000000001','1000000000000001','1000001100000001','1000001100000001','1000000000000001','1000000000000001','1000110000110001','1000000000000001','1000000000000001','1111111111111111']);
const spawns=[[2.5,2.5],[13.5,11.5],[13.5,2.5],[2.5,11.5],[7.5,4.5],[7.5,10.5],[4.5,7.5],[11.5,7.5]];
export function blocked(x,y,r=.22){for(const a of [-r,r])for(const b of [-r,r])if(arenaMap[Math.floor(y+b)]?.[Math.floor(x+a)]!=='0')return true;return false;}
export function wallDistance(x,y,angle,max=24){for(let d=0;d<max;d+=.025)if(blocked(x+Math.cos(angle)*d,y+Math.sin(angle)*d,0))return d;return max;}
export class FPSRooms{
 constructor({now=Date.now}={}){this.rooms={};this.now=now;}
 player(id,index){const [x,y]=spawns[index%spawns.length];return {id,x,y,angle:0,hp:100,kills:0,deaths:0,lastInput:this.now(),lastShot:-Infinity,seq:-1,respawnAt:0};}
 view(r,user){return {id:r.id,game:r.game,owner:r.owner,players:Object.keys(r.units),self:user,status:r.status,version:r.version,map:arenaMap,serverTime:this.now(),units:Object.values(r.units).map(({id,x,y,angle,hp,kills,deaths,respawnAt})=>({id,x,y,angle,hp,kills,deaths,respawnAt})),result:r.result||null,ephemeral:true};}
 act(game,user,input){
  const now=this.now();for(const [id,r]of Object.entries(this.rooms))if(now-r.updated>1800000)delete this.rooms[id];
  if(input.operation==='create'){if(Object.keys(this.rooms).length>=50||Object.values(this.rooms).filter(r=>r.owner===user&&r.status==='playing').length>=2)throw Error('竞技房间数量达到上限');const r={id:allocateRoomNumber(this.rooms),game:game.id,owner:user,status:'playing',version:0,updated:now,units:{[user]:this.player(user,0)},finished:[],started:now};this.rooms[r.id]=r;return this.view(r,user);}
  const r=this.rooms[input.room];if(!r||r.game!==game.id)throw Error('竞技房间不存在');
  if(input.operation==='join'){if(r.status!=='playing'||Object.keys(r.units).length>=8&&!r.units[user])throw Error('房间已满或已结束');r.units[user]??=this.player(user,Object.keys(r.units).length);r.updated=now;return this.view(r,user);}
  const p=r.units[user];if(!p)throw Error('不是竞技房间成员');
  if(input.operation==='leave'){if(r.status==='finished')return {...this.view(r,user),left:true};delete r.units[user];r.updated=now;if(!Object.keys(r.units).length){r.status='finished';r.result={reason:'cancelled',winners:[]};}else if(r.owner===user)r.owner=Object.keys(r.units)[0];return {...this.view(r,user),left:true};}
  if(r.status==='playing')for(const unit of Object.values(r.units))if(unit.hp===0&&now>=unit.respawnAt){const [x,y]=spawns[Object.keys(r.units).indexOf(unit.id)%spawns.length];Object.assign(unit,{x,y,hp:100,respawnAt:0,lastInput:now});}
  if(input.operation==='read')return this.view(r,user);
  if(input.operation!=='input'||r.status!=='playing')throw Error('竞技操作无效');
  if(!Number.isSafeInteger(input.seq)||input.seq<0||!Number.isFinite(input.angle)||Math.abs(input.angle)>100000||!Number.isFinite(input.forward)||!Number.isFinite(input.strafe)||Math.abs(input.forward)>1||Math.abs(input.strafe)>1||typeof input.fire!=='boolean')throw Error('竞技输入无效');
  if(input.seq<=p.seq)return this.view(r,user);p.seq=input.seq;
  const dt=Math.min(.15,Math.max(0,(now-p.lastInput)/1000));p.lastInput=now;r.updated=now;p.angle=((input.angle%(Math.PI*2))+Math.PI*2)%(Math.PI*2);
  if(p.hp>0){let f=input.forward,s=input.strafe;const length=Math.hypot(f,s);if(length>1){f/=length;s/=length;}const dx=(Math.cos(p.angle)*f-Math.sin(p.angle)*s)*3*dt,dy=(Math.sin(p.angle)*f+Math.cos(p.angle)*s)*3*dt;if(!blocked(p.x+dx,p.y))p.x+=dx;if(!blocked(p.x,p.y+dy))p.y+=dy;
   if(input.fire&&now-p.lastShot>=300){p.lastShot=now;const wall=wallDistance(p.x,p.y,p.angle);let target=null,best=wall;for(const unit of Object.values(r.units)){if(unit===p||unit.hp<=0)continue;const x=unit.x-p.x,y=unit.y-p.y,along=x*Math.cos(p.angle)+y*Math.sin(p.angle),side=Math.abs(-x*Math.sin(p.angle)+y*Math.cos(p.angle));if(along<=0||side>.3)continue;const distance=along-Math.sqrt(.09-side*side);if(distance<best){best=distance;target=unit;}}if(target){target.hp=Math.max(0,target.hp-25);if(target.hp===0){target.deaths++;p.kills++;target.respawnAt=now+3000;if(p.kills>=10){r.status='finished';r.result={reason:'score-limit',winners:[user]};}}}}
  }r.version++;return this.view(r,user);
 }
}
