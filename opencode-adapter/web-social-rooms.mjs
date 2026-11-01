import {GameRooms} from './game-rooms.mjs';
import {SocialGameSession} from './game-packages/social/session.mjs';
import {checkedScores} from './game-records.mjs';
import {hasGameTool} from './game-tool-declarations.mjs';
import {submitSoupSolution} from './soup-solution.mjs';
export class WebSocialRooms{
  constructor(directory,{judge,authorized=()=>true,config=()=>({})}={}){this.rooms=new GameRooms(directory);this.judge=judge;this.authorized=authorized;this.config=config;this.social=new SocialGameSession(this.rooms,async()=>{}, {aiHost:()=>true});}
 view(room,user){
  if(!room.members.includes(user))throw Error('不是房间成员');const s=room.state||{};
  return {id:room.id,game:room.game,status:room.status,version:room.version,owner:room.owner,players:[...room.members],ready:[...room.ready],kind:s.kind,phase:s.phase,round:s.round,alive:s.alive,descriptions:s.descriptions||{},voted:Object.keys(s.votes||{}),questions:s.questions||[],surface:s.surface||'',self:user,privateWord:s.words?.[user]||null,confirmed:s.acks?.includes(user)||false,result:room.result||null,mvp:room.mvp||null,revealed:room.status==='finished'&&room.result?.reason!=='cancelled'?s.answer||null:null};
 }
 async act(game,user,input){
  if(!['undercover','turtle-soup'].includes(game.kind))throw Error('网页社交玩法无效');
  if(!this.authorized(game.id,user))throw Error('当前玩家游戏授权已失效');
  if(input.operation==='create'){const room=this.rooms.create(game.id,'web:'+game.id,user,this.config().gameMaxPlayers||10);return this.view(room,user);}
  let room=this.rooms.get(input.room);if(room.game!==game.id)throw Error('房间游戏不符');
  if(!this.authorized(game.id,user))throw Error('当前玩家游戏授权已失效');
  if(input.operation==='read')return this.view(room,user);
  const request=input.requestID;if(typeof request!=='string'||!/^[-\w]{8,100}$/.test(request))throw Error('操作编号无效');
  if(input.operation==='join'){room=this.rooms.join(room.id,user,room.version,request);return this.view(room,user);}
  if(!room.members.includes(user))throw Error('不是房间成员');
  if(room.requests.some(r=>r.id===request&&r.user===user))return this.view(room,user);
  if(input.version!==room.version)throw Error('房间已更新，请刷新后重试');
  if(input.operation==='solve'){room=await submitSoupSolution({rooms:this.rooms,room,user,story:input.text,requestID:request,judge:this.judge,authorized:()=>this.authorized(game.id,user)});return {...this.view(room,user),solutionFeedback:room.state.solutions.at(-1).reason};}
  if(input.operation==='score'){
   if(!hasGameTool(game,'judge.score'))throw Error('本游戏未声明MVP能力');
   if(room.owner!==user||room.status!=='finished'||!room.result||room.result.reason==='cancelled'||!room.state.history?.length||!this.judge)throw Error('当前不能评分');
   if(room.mvp)return this.view(room,user);
   const rating=await this.judge.score(room),latest=this.rooms.get(room.id);if(!this.authorized(game.id,user)||latest.version!==room.version)throw Error('评分期间状态或授权改变');
   const mvp=checkedScores(room.members,rating?.scores);
   room=this.rooms.change(room.id,user,room.version,request,r=>{r.mvp={players:mvp,scores:rating.scores.map(s=>({player:s.player,score:s.score}))};});return this.view(room,user);
  }
  if(input.operation==='ready')room=this.rooms.ready(room.id,user,room.version,request);
  else if(input.operation==='start'){
   if(room.members.some(member=>!this.authorized(game.id,member)))throw Error('有成员已失去游戏授权，请重新组局');
   if(game.kind==='turtle-soup'&&!this.judge)throw Error('游戏裁判未配置');
   await this.social.start(room,{...game,players:room.members},user,request);room=this.rooms.get(room.id);
  }else if(input.operation==='question'){
   if(room.status!=='playing'||!room.state.aiHost||!this.judge)throw Error('当前不能提问');
   const question=String(input.text||'');const verdict=await this.judge.decide(room,question);const latest=this.rooms.get(room.id);
   if(!['yes','no','irrelevant','unknown'].includes(verdict))throw Error('裁判返回无效判定');
   if(!this.authorized(game.id,user)||latest.version!==room.version)throw Error('判题期间状态或授权改变');
   room=this.rooms.change(room.id,user,room.version,request,r=>{r.state.questions.push({user,text:question,answer:({yes:'是',no:'否',irrelevant:'无关',unknown:'无法确定'})[verdict]});r.state.questions=r.state.questions.slice(-100);});
  }else if(input.operation==='leave'){
   room=this.rooms.change(room.id,user,room.version,request,r=>{if(['playing','dealing'].includes(r.status)){r.status='finished';r.result={winners:[],reason:'cancelled'};}else{r.members=r.members.filter(id=>id!==user);r.ready=r.ready.filter(id=>id!==user);if(!r.members.length)r.status='closed';else if(r.owner===user)r.owner=r.members[0];}});
   return {id:room.id,status:room.status,left:true};
  }else{
   const commands={confirm:'/确认身份',describe:'/描述',vote:'/投票',reveal:'/揭晓'},command=commands[input.operation];if(!command)throw Error('操作无效');
   this.social.act(room,user,command,input.operation==='vote'?[String(input.seat)]:input.operation==='describe'?[String(input.text||'')]:[],request);room=this.rooms.get(room.id);
  }
  return this.view(room,user);
 }
}
