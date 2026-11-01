import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {allocateRoomNumber} from './room-number.mjs';
import {newGomoku,moveGomoku} from './game-packages/gomoku.mjs';
export class WebGameRooms{
 constructor(directory){fs.mkdirSync(directory,{recursive:true});this.file=path.join(directory,'web-rooms.json');this.rooms=fs.existsSync(this.file)?JSON.parse(fs.readFileSync(this.file,'utf8')):{};}
 save(){fs.writeFileSync(this.file+'.tmp',JSON.stringify(this.rooms),{mode:0o600});fs.renameSync(this.file+'.tmp',this.file);}
  view(room){return {id:room.id,game:room.game,players:[...room.players],version:room.version,state:structuredClone(room.state),status:room.status,result:room.result||null};}
 act(game,player,input){
  if(game.kind!=='gomoku')throw Error('此游戏未声明五子棋房间能力');
  if(input.operation==='create'){if(Object.values(this.rooms).filter(r=>r.owner===player&&r.status!=='finished').length>=3||Object.keys(this.rooms).length>=500)throw Error('房间数量达到上限');const room={id:allocateRoomNumber(this.rooms),game:game.id,owner:player,players:[player],status:'waiting',version:0,state:null,requests:[]};this.rooms[room.id]=room;try{this.save();}catch(e){delete this.rooms[room.id];throw e;}return this.view(room);}
  const stored=this.rooms[input.room];if(!stored||stored.game!==game.id)throw Error('房间不存在');
  if(input.operation==='read'){if(!stored.players.includes(player))throw Error('不是房间成员');return this.view(stored);}
  if(typeof input.requestID!=='string'||!/^[-\w]{8,100}$/.test(input.requestID))throw Error('操作编号无效');
  if(stored.requests.some(r=>r.player===player&&r.id===input.requestID))return this.view(stored);
  if(input.operation!=='join'&&input.version!==stored.version)throw Error('房间有新状态，请刷新');const room=structuredClone(stored);
  if(input.operation==='join'){if(room.status!=='waiting'||room.players.length!==1||room.players.includes(player))throw Error('房间不能加入');room.players.push(player);room.state=newGomoku(room.players);room.status='playing';}
  else if(input.operation==='move'){if(!room.players.includes(player)||room.status!=='playing')throw Error('不能落子');room.state=moveGomoku(room.state,player,input.x,input.y);if(room.state.winner||room.state.draw){room.status='finished';room.result={reason:room.state.draw?'draw':'five-in-row',winners:room.state.winner?[room.state.winner]:[]};}}
  else if(input.operation==='leave'){if(!room.players.includes(player)||room.status==='finished')throw Error('当前不能退出本局');room.status='finished';const winner=room.players.find(id=>id!==player);room.result={reason:'leave',winners:winner?[winner]:[]};if(room.state&&winner)room.state.winner=winner;}
  else throw Error('房间操作无效');
  room.version++;room.requests.push({player,id:input.requestID});room.requests=room.requests.slice(-250);this.rooms[room.id]=room;try{this.save();}catch(e){this.rooms[room.id]=stored;throw e;}return this.view(room);
 }
}
