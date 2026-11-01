import path from 'node:path';
import {WebGameRooms} from '../web-game-rooms.mjs';
import {WebSocialRooms} from '../web-social-rooms.mjs';
import {WebCardRooms} from '../web-card-rooms.mjs';
import {FPSRooms} from './fps.mjs';
import {WebFlowRooms} from '../web-flow-rooms.mjs';
import {StandaloneRooms} from '../standalone-rooms.mjs';
const definitions=Object.freeze([
 {kinds:['gomoku'],create:(root)=>new WebGameRooms(path.join(root,'web-rooms')),rooms:runtime=>runtime.rooms},
 {kinds:['undercover','turtle-soup'],create:(root,options)=>new WebSocialRooms(path.join(root,'web-social-rooms'),options),rooms:runtime=>runtime.rooms.rooms},
 {kinds:['doudizhu'],create:(root)=>new WebCardRooms(path.join(root,'web-card-rooms')),rooms:runtime=>runtime.rooms},
 {kinds:['fps'],create:()=>new FPSRooms(),rooms:runtime=>runtime.rooms},
  {kinds:['flow'],create:root=>new WebFlowRooms(path.join(root,'web-flow-rooms')),rooms:runtime=>runtime.rooms},
  {kinds:['standalone'],create:root=>new StandaloneRooms(path.join(root,'standalone-rooms')),rooms:runtime=>runtime.rooms}
]);
export class WebGameRuntime{
 constructor(root,options={}){this.options=options;this.entries=definitions.map(definition=>({...definition,runtime:definition.create(root,options)}));}
 entry(game){const entry=this.entries.find(e=>e.kinds.includes(game.kind));if(!entry)throw Error('此游戏未安装网页房间运行能力');return entry;}
 list(game,user){const entry=this.entry(game);return Object.values(entry.rooms(entry.runtime)).filter(r=>r.game===game.id&&(r.members||r.players||Object.keys(r.units||{})).includes(user)&&r.status!=='closed').slice(-30).reverse().map(r=>({id:r.id,status:r.status,players:(r.members||r.players||Object.keys(r.units||{})).length,version:r.version}));}
 async act(game,user,input){
  const entry=this.entry(game),authorize=this.options.authorized||(()=>true);if(!authorize(game.id,user))throw Error('当前游戏授权已失效');
  if(input.operation==='join'){const stored=entry.rooms(entry.runtime)[input.room],limit=this.options.config?.().gameMaxPlayers||10,members=stored?.members||stored?.players||Object.keys(stored?.units||{});if(stored&&!members.includes(user)&&members.length>=limit)throw Error('房间人数达到控制台设置上限');}
  if(input.operation==='start'){const room=entry.rooms(entry.runtime)[input.room];if(room&&room.game===game.id&&(room.members||room.players).some(member=>!authorize(game.id,member)))throw Error('有成员已失去游戏权限，请重新组局');}
  if(game.kind==='fps'){const room=entry.runtime.rooms[input.room];if(room){for(const member of Object.keys(room.units))if(!authorize(game.id,member))delete room.units[member];}}
  return entry.runtime.act(game,user,input);
 }
 summaries(){return this.entries.flatMap(entry=>Object.values(entry.rooms(entry.runtime)).map(r=>({id:r.id,game:r.game,status:r.status,members:r.members||r.players||Object.keys(r.units||{}),version:r.version})));}
}
