import {SocialGameSession} from './social-game-session.mjs';
import {socialMenu} from './social-game-rules.mjs';
import {GameRecords} from './game-records.mjs';
import path from 'node:path';
import {hasGameTool} from './game-tool-declarations.mjs';
import {GameTools} from './game-tools.mjs';
import {BotGameLifecycle} from './bot-game-lifecycle.mjs';
import {playerMayJoin} from './game-access.mjs';
import {blocksOrdinaryChat} from './game-chat-gate.mjs';
import {submitSoupSolution} from './soup-solution.mjs';
import {assertGameKindContract} from './game-kind-contract.mjs';
export class GameRouter{
 constructor(engine,store,send,{generate,rooms,webURL,judge,web}={}){this.engine=engine;this.store=store;this.send=send;this.generate=generate;this.rooms=rooms;this.webURL=webURL;this.judge=judge;this.records=new GameRecords(path.join(engine.root,'records'));this.lifecycle=rooms?new BotGameLifecycle(engine,rooms,store,send,{web}):null;this.social=rooms?new SocialGameSession(rooms,send,{aiHost:()=>Boolean(judge&&store.value.gameJudgeModel)}):null;}
 async receive(event){
  const parts=Array.isArray(event.message)?event.message:[];let text=parts.filter(p=>p.type==='text').map(p=>p.data?.text||'').join('').trim();
  if(event.post_type!=='message'||!['private','group'].includes(event.message_type)||String(event.user_id)===String(event.self_id))return false;
  const c=this.store.value,user=String(event.user_id),group=event.message_type==='group',scope=`${group?'group':'private'}:${group?event.group_id:user}`;
  if(/^\/提交故事(?:\s|$)/.test(text)){
   const target={group,target:group?String(event.group_id):user};
   if(!c.gamesEnabled||c.mode!=='reply'||parts.some(p=>!['text','at'].includes(p.type))||group&&(!c.groupEnabled||!c.groups.includes(String(event.group_id))||!parts.some(p=>p.type==='at'&&String(p.data?.qq)===String(event.self_id)))||!group&&user!==c.ownerQQ&&!c.privateQQ.includes(user))return true;
   try{const room=this.lifecycle?.membership(user);if(!room||room.scope!==scope)throw Error('请先进入当前会话的海龟汤房间');const game=this.engine.find(room.game);if(!playerMayJoin(game,user))throw Error('没有本游戏权限');const requestID='soup-story-'+event.self_id+'-'+event.message_id;if(event.message_id==null)return true;
    const ended=await submitSoupSolution({rooms:this.rooms,room,user,story:text.replace(/^\/提交故事\s*/,''),requestID,judge:this.judge,authorized:()=>this.store.value.gamesEnabled&&this.store.value.mode==='reply'&&playerMayJoin(this.engine.find(room.game),user)});
    if(ended.status==='finished'){this.records.settle({id:ended.id,game:ended.game,scope:ended.scope,players:ended.members,winners:ended.result.winners});await this.send(target,'还原成功！\n判定理由：'+ended.result.explanation+'\n汤底：'+ended.state.answer,'text');}
    else await this.send(target,ended.state.solutions.at(-1).reason,'text');
   }catch(error){await this.send(target,error.message,'text');}return true;
  }
  if(text==='/开始游戏'){
   if(!c.gamesEnabled||c.mode!=='reply'||parts.some(p=>!['text','at'].includes(p.type))||group&&(!c.groupEnabled||!c.groups.includes(String(event.group_id))||!parts.some(p=>p.type==='at'&&String(p.data?.qq)===String(event.self_id)))||!group&&user!==c.ownerQQ&&!c.privateQQ.includes(user))return true;
    const room=this.lifecycle?.membership(user),target={group,target:group?String(event.group_id):user};
    try{if(room&&room.scope===scope&&room.owner===user)assertGameKindContract(this.engine.find(room.game));}catch(error){await this.send(target,error.message,'text');return true;}
   try{if(!room||room.scope!==scope)throw Error('请先创建或加入当前会话的房间');if(room.owner!==user)throw Error('只有房主可以开始游戏');if(room.status!=='waiting')throw Error('游戏已开始或当前不可开始');const game=this.engine.find(room.game);if(!playerMayJoin(game,user)&&user!==c.ownerQQ)throw Error('没有游戏权限');if(room.members.some(id=>!playerMayJoin(game,id)&&id!==c.ownerQQ))throw Error('有玩家已失去加入权限');if(game.kind==='turtle-soup'&&!c.gameJudgeModel)throw Error('请先配置游戏裁判模型');let prepared=room;for(const id of room.members)if(!prepared.ready.includes(id))prepared=this.rooms.ready(room.id,id,prepared.version,'start-ready-'+event.message_id+'-'+id);if(['undercover','turtle-soup'].includes(game.kind)){const result=await this.social.start(prepared,game,user,'start-game-'+event.message_id);await this.send(target,result,'text');}else{this.rooms.change(room.id,user,prepared.version,'start-game-'+event.message_id,r=>{r.status='playing';r.turn=0;});await this.send(target,'游戏开始','text');}}catch(error){await this.send(target,error.message,'text');}return true;
  }
  if(this.judge&&group&&!text.startsWith('/')&&text&&parts.some(p=>p.type==='at'&&String(p.data?.qq)===String(event.self_id))){const candidates=Object.values(this.rooms?.rooms||{}).filter(r=>r.scope===scope&&r.status==='playing'&&r.state?.aiHost&&r.members.includes(user));if(candidates.length===1)text=`/提问 ${candidates[0].id} ${text}`;}
  const reserved=/^\/(?:游戏|网页游戏|游戏列表|游戏创建|网页游戏创建|游戏停止|网页游戏停止|游戏加入|游戏退出|游戏生成|网页游戏生成|游戏更改|网页游戏更改|房间|建房|加入|准备|开始|离房|结束回合|确认身份|描述|投票|提问|回答|揭晓|战绩|评分)(?:\s|$)/.test(text);
  const active=this.engine.players[this.engine.key(scope,user)]?.active;
  const game=this.engine.games.get(active),action=text==='/结束'||game?.commands.some(cmd=>cmd.name===text)||[...this.engine.games.values()].some(g=>g.type==='bot'&&g.commands.some(cmd=>cmd.name===text));
   if(!reserved&&!action){if(blocksOrdinaryChat(this.rooms?.rooms,user)){if(user===c.ownerQQ&&/^\/(?:任务|创建工具|进度|暂停|继续|指导|打断)(?:\s|$)/.test(text))return false;return true;}return false;}
  if(!c.gamesEnabled||c.mode!=='reply'||(group?(!c.groupEnabled||!c.groups.includes(String(event.group_id))||!parts.some(p=>p.type==='at'&&String(p.data?.qq)===String(event.self_id))):user!==c.ownerQQ&&!c.privateQQ.includes(user))||parts.some(p=>!['text','at'].includes(p.type)))return true;
  const key=`game:${event.self_id}:${event.message_id}`;if(event.message_id==null||c.seen.includes(key))return true;c.seen.push(key);c.seen=c.seen.slice(-5000);this.store.save();
  const target={group,target:group?String(event.group_id):user};
  if(this.lifecycle&&await this.lifecycle.handle(text,scope,user,target,String(event.self_id)+'-'+event.message_id))return true;
  if(/^\/(?:游戏|网页游戏|建房|加入|离房|结束)(?:\s|$)/.test(text)){await this.send(target,'请使用 /游戏列表、/游戏创建、/游戏加入、/游戏退出 或 /网页游戏创建','text');return true;}
  if(action&&!reserved&&!this.lifecycle?.membership(user))return true;
  if(action&&game&&!playerMayJoin(game,user)&&user!==c.ownerQQ)return true;
  if(/^\/评分\s+/.test(text)){try{const r=this.rooms.get(text.split(/\s+/)[1]);if(r.scope!==scope||!r.members.includes(user))return true;if(!hasGameTool(this.engine.find(r.game),'judge.score')){await this.send(target,'本游戏未启用MVP评分能力','text');return true;}}catch{return true;}}
   if(this.judge&&/^\/评分\s+/.test(text)){try{const id=text.split(/\s+/)[1],room=this.rooms.get(id),game=this.engine.find(room.game);if(room.scope!==scope||!playerMayJoin(game,user)||room.owner!==user)return true;if(room.status!=='finished'||!room.result?.winners)throw Error('仅房主可为已结束对局申请评分');if(!room.state.history?.length)throw Error('缺少可评分的公开表现记录，不授予MVP');const rating=await this.judge.score(room),latest=this.rooms.get(id);if(latest.version!==room.version||!this.store.value.gamesEnabled||!playerMayJoin(this.engine.find(room.game),user))throw Error('评分期间状态或授权变化');this.records.settle({id:room.id,game:room.game,scope:room.scope,players:room.members,winners:room.result.winners});const receipt=this.records.awardMVP({id:room.id,game:room.game,scope:room.scope,players:room.members,scores:rating.scores});await this.send(target,`本局MVP座位：${receipt.mvp.map(id=>room.members.indexOf(id)+1).join('、')}（最高分并列时共同获得，仅计入一次）`,'text');}catch(error){await this.send(target,error.message,'text');}return true;}
   if(/^\/战绩(?:\s|$)/.test(text)){try{const game=this.engine.find(text.split(/\s+/)[1]||active||'');if(!playerMayJoin(game,user)&&user!==c.ownerQQ)return true;const record=this.records.read(game.id,scope,user);await this.send(target,`${game.name}个人战绩\n参与${record.played}局 · 胜利${record.wins}局 · MVP ${record.mvp}次`,'text');}catch(error){await this.send(target,error.message,'text');}return true;}
   if(this.judge&&/^\/提问\s+/.test(text)){try{const [,id,...words]=text.split(/\s+/),room=this.rooms.get(id),game=this.engine.find(room.game);if(room.scope!==scope||!room.members.includes(user)||!playerMayJoin(game,user))return true;if(room.state.kind!=='turtle-soup'||room.status!=='playing')throw Error('当前不是进行中的海龟汤');const question=words.join(' '),version=room.version;
    const tools=new GameTools({room:()=>({...this.rooms.get(id),capabilities:['judge.decide']}),authorized:r=>{const c=this.store.value,g=this.engine.find(r.game);return c.gamesEnabled&&c.mode==='reply'&&r.scope===scope&&r.members.includes(user)&&playerMayJoin(g,user)&&(group?c.groupEnabled&&c.groups.includes(target.target):user===c.ownerQQ||c.privateQQ.includes(user));},judge:this.judge,send:this.send,records:this.records});
   const {verdict}=await tools.call('judge.decide',{player:user,question});this.rooms.change(id,user,version,String(event.self_id)+'-'+event.message_id,r=>{r.state.questions.push({user,text:question,answer:verdict});r.state.questions=r.state.questions.slice(-100);});await this.send(target,({yes:'是',no:'否',irrelevant:'无关',unknown:'无法确定'})[verdict],'text');}catch(error){await this.send(target,error.message,'text');}return true;}
  if(text==='/结束'&&this.rooms){for(const room of Object.values(this.rooms.rooms)){if(room.scope===scope&&room.members.includes(user)&&['waiting','dealing','playing'].includes(room.status)&&room.state?.kind){this.rooms.change(room.id,user,room.version,String(event.self_id)+'-'+event.message_id,r=>{r.status='closed';});}}}
   if(this.social&&/^\/(?:确认身份|描述|投票|提问|回答|揭晓)(?:\s|$)/.test(text)){
    try{const [command,id,...args]=text.split(/\s+/),room=this.rooms.get(id),game=this.engine.find(room.game);if(room.scope!==scope||!playerMayJoin(game,user)||!room.members.includes(user))return true;const result=this.social.act(room,user,command,args,String(event.self_id)+'-'+event.message_id);const ended=this.rooms.get(id);if(ended.status==='finished'&&ended.result?.winners)this.records.settle({id:ended.id,game:ended.game,scope:ended.scope,players:ended.members,winners:ended.result.winners});await this.send(target,result,'text');}catch(error){await this.send(target,error.message,'text');}return true;
  }
  if(/^\/网页游戏\s+/.test(text)){try{const web=this.engine.find(text.replace(/^\/网页游戏\s+/,''));if(web.type!=='web'||!web.enabled)return true;const url=this.webURL?.();if(!url)throw Error('网页游戏公网入口尚未开启');const loginMode=c.webGameLoginMode||'password',hint=loginMode==='qq'?'使用QQ机器人验证登录，权限按网页登录名单检查。':loginMode==='both'?'可使用主人分配的账号密码或QQ机器人验证登录，权限按所选方式检查。':'请使用主人分配并授权此游戏的账号登录，不开放自行注册。';await this.send({group:false,target:user},`${web.name}\n${url}\n${hint}`,'text');}catch(error){await this.send(target,error.message,'text');}return true;}
  if(/^\/(?:游戏生成|网页游戏生成)\s+/.test(text)&&user===c.ownerQQ&&this.generate){const web=text.startsWith('/网页游戏生成');await this.generate(text.replace(/^\/(?:游戏生成|网页游戏生成)\s+/,''),{group,target:target.target,owner:user,gameType:web?'web':'bot'});return true;}
   if(/^\/(?:游戏更改|网页游戏更改)\s+/.test(text)&&user===c.ownerQQ&&this.generate){try{const match=text.match(/^\/(游戏更改|网页游戏更改)\s+(\d{6})\s+([\s\S]+)$/);if(!match)throw Error('用法：/游戏更改 或 /网页游戏更改 六位游戏编号 修改要求');const game=this.engine.find(match[2]),gameType=match[1]==='网页游戏更改'?'web':'bot';if(game.type!==gameType)throw Error('修改命令与游戏类型不符');await this.generate(match[3],{group,target:target.target,owner:user,gameType,gameUpdateID:game.id,gameBaseline:game});}catch(error){await this.send(target,error.message,'text');}return true;}
  if(this.rooms&&/^\/(?:房间|建房|加入|准备|开始|离房|结束回合)(?:\s|$)/.test(text)){
   try{const [command,...args]=text.split(/\s+/);let room;
     if(command==='/建房'){const game=this.engine.find(args[0]||active||'');if(!game.enabled||game.type!=='bot'||!game.players.includes(user))return true;room=this.rooms.create(game.id,scope,user,game.kind==='undercover'?8:4);}
      else{const id=args[0];if(!id)throw Error('请提供完整房间编号');room=this.rooms.get(id);const game=this.engine.find(room.game);if(room.scope!==scope||game.type!=='bot'||!playerMayJoin(game,user))return true;if(command==='/加入')room=this.rooms.join(id,user,room.version,String(event.self_id)+'-'+event.message_id);else{if(!room.members.includes(user))return true;
      if(command==='/开始'&&['undercover','turtle-soup'].includes(game.kind)){if(game.kind==='turtle-soup'&&!this.store.value.gameJudgeModel)throw Error('请主人先配置游戏裁判模型，海龟汤不会自动改为真人主持');const result=await this.social.start(room,game,user,String(event.self_id)+'-'+event.message_id);await this.send(target,result,'text');return true;}
      if(command==='/结束回合'&&['undercover','turtle-soup'].includes(game.kind))throw Error('本玩法根据描述/投票自动推进');
      if(command==='/离房'&&['dealing','playing'].includes(room.status)&&room.state.kind){room=this.rooms.change(id,user,room.version,String(event.self_id)+'-'+event.message_id,r=>{r.status='closed';});await this.send(target,'有玩家退出，本局已中止。角色记录保留，不重复使用本局身份。','text');return true;}
      const methods={'/准备':'ready','/开始':'start','/离房':'leave','/结束回合':'advance'};if(methods[command])room=this.rooms[methods[command]](id,user,room.version,String(event.self_id)+'-'+event.message_id);}}
    await this.send(target,`房间 ${room.id}\n状态：${room.status}\n成员：${room.members.length}/${room.maxPlayers}\n已准备：${room.ready.length}\n${room.status==='playing'?'当前回合玩家：'+room.members[room.turn]:''}`,'text');
   }catch(error){await this.send(target,error.message,'text');}return true;
  }
   if(/^\/游戏\s+/.test(text)){try{const id=text.replace(/^\/游戏\s+/,''),game=this.engine.find(id),menu=this.engine.join(scope,user,id);await this.send({group:false,target:user},game.kind&&game.kind!=='economy'?`${game.name}\n${socialMenu(game)}`:menu,'text');}catch(error){await this.send(target,error.message,'text');}return true;}
  if(reserved){await this.send(target,user===c.ownerQQ?'游戏生成、发布和网页入口请在控制台管理；尚未配置的功能不会执行。':'此游戏入口当前不可用','text');return true;}
  const result=this.engine.act(scope,user,text);if(result)await this.send(target,result,'text');return true;
 }
}
