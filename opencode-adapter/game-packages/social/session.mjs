import crypto from 'node:crypto';
import {playerMayJoin} from '../../game-access.mjs';
export class SocialGameSession{
 constructor(rooms,send,{randomInt=crypto.randomInt,aiHost=()=>false}={}){this.rooms=rooms;this.send=send;this.randomInt=randomInt;this.aiHost=aiHost;this.delivering=new Set();}
 async start(room,game,user,requestID){
  if(this.delivering.has(room.id))throw Error('正在投递身份，请勿重复开始');
   const minimum=game.kind==='undercover'?3:this.aiHost()?1:2;
  if(room.members.length<minimum)throw Error(`此玩法至少需要${minimum}人`);
   if(game.enabled!==undefined&&room.members.some(id=>!playerMayJoin(game,id)))throw Error('有成员已不在游戏白名单');
  for(const existing of Object.values(this.rooms.rooms))if(existing.id!==room.id&&existing.scope===room.scope&&['dealing','playing'].includes(existing.status)&&existing.state?.kind&&existing.members.some(id=>room.members.includes(id)))throw Error('有成员正在本群另一局游戏中，请先退出旧局');
  const updated=this.rooms.change(room.id,user,room.version,requestID,r=>{
   if(r.owner!==user||r.status!=='waiting'||r.ready.length!==r.members.length)throw Error('仅房主可在全员准备后开始');
   r.status='dealing';r.state={kind:game.kind,acks:[],delivery:{},round:1,alive:[...r.members],descriptions:{},votes:{},history:[]};
   if(game.kind==='undercover'){const pair=game.wordPairs[this.randomInt(game.wordPairs.length)],spy=r.members[this.randomInt(r.members.length)];r.state.words=Object.fromEntries(r.members.map(id=>[id,pair[id===spy?1:0]]));r.state.spy=spy;}
    else{r.state.surface=game.puzzle.surface;r.state.answer=game.puzzle.answer;r.state.keyFacts=game.puzzle.keyFacts||[];r.state.host=r.owner;r.state.questions=[];if(this.aiHost()){r.state.aiHost=true;r.status='playing';r.state.phase='question';}}
  });
  if(updated.state.aiHost)return `海龟汤开始，机器人担任裁判。\n汤面：${updated.state.surface}\n参与玩家可@机器人提问，或使用/提问 ${updated.id} 问题。房主可/揭晓 ${updated.id}结束本局。`;
  this.delivering.add(room.id);
  try{
   const recipients=game.kind==='undercover'?updated.members:[updated.owner];
   for(const member of recipients){
    let r=this.rooms.get(room.id);if(r.status!=='dealing')break;
    r=this.rooms.change(r.id,user,r.version,requestID+'-attempt-'+member,x=>{x.state.delivery[member]='attempted';});
    try{const message=game.kind==='undercover'?`房间 ${r.id}\n座位${r.members.indexOf(member)+1}\n你的词语：${r.state.words[member]}\n不要公开词语或本私信。请在原群@机器人 /确认身份 ${r.id}`:`房间 ${r.id}\n你是海龟汤主持人。\n汤底：${r.state.answer}\n仅你可查看，请勿提前公开。原群@机器人 /确认身份 ${r.id} 后开始。`;
     await this.send({group:false,target:member},message,'text');r=this.rooms.get(room.id);this.rooms.change(r.id,user,r.version,requestID+'-sent-'+member,x=>{x.state.delivery[member]='sent';});
    }catch{r=this.rooms.get(room.id);this.rooms.change(r.id,user,r.version,requestID+'-failed-'+member,x=>{x.state.delivery[member]='uncertain';});}
   }
  }finally{this.delivering.delete(room.id);}
  return '已尝试私发必要角色信息。收到的玩家请确认身份；未送达或状态不明不会自动重发，不能进入正式阶段。可离房中止后重新组局。';
 }
 act(room,user,command,args,requestID){
  let message='';
  this.rooms.change(room.id,user,room.version,requestID,r=>{
   const s=r.state;if(!['undercover','turtle-soup'].includes(s.kind)||!r.members.includes(user))throw Error('未进入此玩法');
   if(command==='/确认身份'){
    if(r.status!=='dealing'||s.delivery[user]!=='sent')throw Error('没有已确认送达的身份可确认');if(!s.acks.includes(user))s.acks.push(user);
    const needed=s.kind==='undercover'?r.members:[s.host];
    if(needed.every(id=>s.delivery[id]==='sent'&&s.acks.includes(id))){r.status='playing';s.phase=s.kind==='undercover'?'describe':'question';message=s.kind==='undercover'?'全员确认。按座位顺序描述，不要说出原词。':`开始猜汤。汤面：${s.surface}`;}else message='已确认，等待其他必要玩家确认';return;
   }
   if(r.status!=='playing')throw Error('本局尚未开始或已经结束');
   if(s.kind==='turtle-soup'){
    if(command==='/提问'){if(s.aiHost)throw Error('请使用AI裁判入口');if(user===s.host)throw Error('主持人不能作为玩家提问');if(s.pending)throw Error('请等待主持人回答上一问题');const text=args.join(' ').trim();if(!text||text.length>500)throw Error('问题需为1–500字');s.pending={user,text};message=`问题：${text}\n主持人请/回答 房间编号 是|否|无关`;}
    else if(command==='/回答'){if(s.aiHost)throw Error('本局由AI裁判判断，不接受人工覆盖');if(user!==s.host||!s.pending)throw Error('仅主持人可回答待处理问题');if(!['是','否','无关'].includes(args.join(' ')))throw Error('只可回答是、否或无关');s.questions.push({...s.pending,answer:args.join(' ')});s.questions=s.questions.slice(-100);s.pending=null;message=args.join(' ');}
    else if(command==='/揭晓'){if(user!==s.host)throw Error('仅房主可揭晓');r.status='finished';r.result={winners:[]};message=`本局结束，汤底：${s.answer}\n本局未自动判定猜中者，不虚构胜利记录。`;}
    else throw Error('此玩法不支持该操作');return;
   }
   if(!s.alive.includes(user))throw Error('你已出局');
   if(command==='/描述'){
    if(s.phase!=='describe'||s.alive.find(id=>!Object.hasOwn(s.descriptions,id))!==user)throw Error('尚未轮到你描述');const text=args.join(' ').trim();if(!text||text.length>300)throw Error('描述需为1–300字');if(Object.values(s.words).some(word=>text.includes(word)))throw Error('描述不可直接包含本局词语');s.descriptions[user]=text;
    message=`座位${r.members.indexOf(user)+1}：${text}`;
    if(s.alive.every(id=>Object.hasOwn(s.descriptions,id))){s.phase='vote';message+='\n描述结束，请/投票 房间编号 座位号';}
   }else if(command==='/投票'){
    if(s.phase!=='vote'||Object.hasOwn(s.votes,user))throw Error('当前不能投票或已经投过');const seat=Number(args[0]),target=r.members[seat-1];if(args.length!==1||!Number.isInteger(seat)||!s.alive.includes(target)||target===user)throw Error('请选择其他在场玩家的座位号');s.votes[user]=target;message='已记录投票';
    if(s.alive.every(id=>Object.hasOwn(s.votes,id))){const counts=new Map();for(const value of Object.values(s.votes))counts.set(value,(counts.get(value)||0)+1);const max=Math.max(...counts.values()),leaders=[...counts].filter(([,n])=>n===max).map(([id])=>id);s.history.push({round:s.round,votes:{...s.votes},descriptions:{...s.descriptions}});s.history=s.history.slice(-50);
     if(leaders.length===1){const eliminated=leaders[0];s.alive=s.alive.filter(id=>id!==eliminated);message=`座位${r.members.indexOf(eliminated)+1}被淘汰。`;if(eliminated===s.spy){r.status='finished';message+='平民获胜！';}else if(s.alive.length<=2){r.status='finished';message+='卧底获胜！';}}
     else message='平票，本轮不淘汰。';
     if(r.status==='finished'){r.result={winners:s.alive.includes(s.spy)?[s.spy]:r.members.filter(id=>id!==s.spy)};message+=`\n卧底座位：${r.members.indexOf(s.spy)+1}`;}else{s.round++;s.phase='describe';s.descriptions={};s.votes={};message+='进入下一轮，按在场座位顺序描述。';}
    }
   }else throw Error('此玩法不支持该操作');
  });return message;
 }
}
