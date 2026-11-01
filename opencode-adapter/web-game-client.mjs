import {fpsClient} from './fps-client.mjs';
import {gameLatencyClient} from './game-latency.mjs';
import {scene3DClient} from './scene3d-client.mjs';
import {gameStatusClient} from './game-status-client.mjs';
import {standaloneHostClient} from './standalone-sdk.mjs';
import {browserGameCompat} from './browser-game-compat.mjs';
export const webGameClient=browserGameCompat+gameLatencyClient+String.raw`
let csrf='';
let qqPoll=null;
const el=id=>document.getElementById(id);
async function api(route,data){return gameJSONRequest(route,data,csrf);}
function gomokuUI(game,section){
 let room=null;const input=document.createElement('input'),status=document.createElement('p'),board=document.createElement('div');input.placeholder='房间编号';input.setAttribute('aria-label','五子棋房间编号');board.className='gomoku';
 function render(){board.replaceChildren();if(!room)return;input.value=room.id;status.textContent='房间 '+room.id+' · '+room.status+' · '+(room.state?.winner?'本局胜者：'+(room.players.indexOf(room.state.winner)+1)+'号座位':room.state?'当前落子：'+(room.state.turn+1)+'号座位':'等待另一位玩家');if(!room.state)return;for(let y=0;y<15;y++)for(let x=0;x<15;x++){const b=document.createElement('button'),v=room.state.board[y*15+x];b.textContent=v===1?'●':v===2?'○':'·';b.setAttribute('aria-label',x+','+y);b.onclick=()=>act('move',{x,y});board.append(b);}}
 async function act(operation,extra={}){try{const data=await api('/api/room',{game:game.id,operation,room:room?.id||input.value.trim(),version:room?.version??0,requestID:crypto.randomUUID(),...extra});room=data.room;render();}catch(error){el('notice').textContent=error.message;}}
 for(const [label,operation]of [['创建房间','create'],['加入房间','join'],['刷新棋盘','read'],['退出本局','leave']]){const b=document.createElement('button');b.textContent=label;b.onclick=async()=>{if(operation==='leave'&&!confirm('确定退出？进行中的对局将判对手获胜，已保存棋局保留。'))return;if(operation==='join')room=null;await act(operation);};section.append(b);}section.append(input,status,board);
 restoreRooms(game,section,async roomID=>{room=null;input.value=roomID;await act('read');});
 let refreshing=false;const timer=setInterval(async()=>{if(!section.isConnected){clearInterval(timer);return;}if(document.hidden||!room||room.status==='finished'||refreshing)return;refreshing=true;try{const data=await api('/api/room',{game:game.id,operation:'read',room:room.id});if(data.room.version!==room.version){room=data.room;render();}}catch(error){el('notice').textContent=error.message;clearInterval(timer);}finally{refreshing=false;}},3000);window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
}
async function load(){
 latencyHeadings.clear();activeLatencyHeading=null;
 const data=await api('/api/games'),box=el('games');box.replaceChildren();csrf=data.csrf;el('login').hidden=true;el('logout').hidden=false;
 for(const game of data.games){
   const section=document.createElement('section'),heading=document.createElement('h2'),description=document.createElement('p'),state=document.createElement('p');
  heading.textContent=game.webUI?.title||game.name;description.textContent=game.webUI?.description||'';state.textContent='余额：'+game.coins;
  if(game.kind==='gomoku'){boardStyle();}
  section.className=game.webUI?.layout==='arcade'?'arcade':'cards';section.append(heading,description,state);
   box.append(section);registerLatencyHeading(heading,game.webUI?.title||game.name);
   if(game.kind==='standalone'){state.remove();standaloneUI({...game,autoLaunch:data.games.length===1},section);continue;}
  if(game.scene3d)scene3DUI(game.scene3d,section);
  const records=document.createElement('button');records.textContent='我的战绩';records.onclick=async()=>{try{const data=await api('/api/records',{game:game.id});state.textContent='参与 '+data.records.played+' 局 · 胜利 '+data.records.wins+' 局 · MVP '+data.records.mvp+' 次';}catch(error){el('notice').textContent=error.message;}};section.append(records);
  if(game.kind==='gomoku'){gomokuUI(game,section);box.append(section);continue;}
  if(['undercover','turtle-soup'].includes(game.kind)){socialUI(game,section);box.append(section);continue;}
  if(game.kind==='doudizhu'){cardUI(game,section);box.append(section);continue;}
  if(game.kind==='fps'){fpsUI(game,section);box.append(section);continue;}
  if(game.kind==='flow'&&game.multiplayer?.enabled){multiplayerFlowUI(game,section);box.append(section);continue;}
  const buttons=game.webUI?.buttons||game.commands.map(c=>({command:c.name,label:c.description}));
  for(const item of buttons){const button=document.createElement('button');button.textContent=item.label;button.onclick=async()=>{button.disabled=true;try{const result=await api('/api/action',{game:game.id,command:item.command,requestID:crypto.randomUUID()});state.textContent=result.result;}catch(error){el('notice').textContent=error.message;}finally{button.disabled=false;}};section.append(button);}
  box.append(section);
 }
 if(!data.games.length)box.textContent='当前账号没有已启用的游戏，请联系主人授权。';
}
el('login').onsubmit=async event=>{event.preventDefault();try{const form=new FormData(event.target),result=await api('/api/login',{username:form.get('username'),password:form.get('password')});event.target.reset();csrf=result.csrf;await load();el('notice').textContent='';}catch(error){el('notice').textContent=error.message;}};
el('logout').onclick=async()=>{try{await api('/api/logout',{});location.reload();}catch(error){el('notice').textContent=error.message;}};
load().catch(()=>{});
async function loginOptions(){
 const data=await api('/api/login-options');el('login').hidden=data.mode==='qq'||!el('logout').hidden;
 if(!['qq','both'].includes(data.mode))return;
 const section=document.createElement('section'),begin=document.createElement('button'),status=document.createElement('p'),complete=document.createElement('button');begin.textContent='QQ机器人验证登录';complete.textContent='核对身份并确认登录';complete.hidden=true;
  let expires=0,polling=false,attemptActive=false;
  try{expires=Number(sessionStorage.getItem('nikolink-qq-login-expires'))||0;attemptActive=expires>Date.now();}catch{}
  async function pollLogin(){if(polling||!attemptActive||document.hidden||!section.isConnected)return;if(Date.now()>expires){attemptActive=false;clearInterval(qqPoll);status.textContent='验证码已过期，请重新获取';return;}polling=true;try{const result=await api('/api/qq-login/poll',{});if(result.ready){attemptActive=false;clearInterval(qqPoll);status.textContent='待登录QQ：'+result.qq+'。确认是你本人后继续。';complete.hidden=false;}}catch(error){status.textContent=error.message+'；网络恢复后会继续检查。';}finally{polling=false;}}
  begin.onclick=async()=>{begin.disabled=true;try{clearInterval(qqPoll);const attempt=await api('/api/qq-login/begin',{});status.textContent='请私聊机器人发送：/网页登录 '+attempt.code+'（两分钟有效；不要为他人验证码验证）';complete.hidden=true;expires=Date.now()+attempt.expiresIn*1000;attemptActive=true;try{sessionStorage.setItem('nikolink-qq-login-expires',String(expires));}catch{}qqPoll=setInterval(pollLogin,4000);}catch(error){status.textContent=error.message;}finally{begin.disabled=false;}};
  complete.onclick=async()=>{complete.disabled=true;try{const result=await api('/api/qq-login/complete',{});csrf=result.csrf;clearInterval(qqPoll);section.remove();await load();}catch(error){try{await load();section.remove();}catch{status.textContent=error.message;}}finally{complete.disabled=false;}};
  section.append(begin,status,complete);el('login').after(section);if(attemptActive){status.textContent='正在恢复QQ验证状态…';qqPoll=setInterval(pollLogin,4000);void pollLogin();}document.addEventListener('visibilitychange',()=>{if(!document.hidden)void pollLogin();});window.addEventListener('pageshow',()=>{if(attemptActive){clearInterval(qqPoll);qqPoll=setInterval(pollLogin,4000);void pollLogin();}});window.addEventListener('pagehide',()=>clearInterval(qqPoll));
}
loginOptions().catch(error=>{el('notice').textContent=error.message;});
function boardStyle(){const style=document.createElement('link');style.rel='stylesheet';style.href='/gomoku.css';if(!document.querySelector('link[href="/gomoku.css"]'))document.head.append(style);}
function socialUI(game,section){
 let room=null,busy=false;const id=document.createElement('input'),status=document.createElement('pre'),secret=document.createElement('p'),text=document.createElement('textarea'),seat=document.createElement('input'),controls=document.createElement('div');id.placeholder='房间编号';id.setAttribute('aria-label','房间编号');text.placeholder=game.kind==='undercover'?'本轮描述':'问题或完整故事';text.maxLength=game.kind==='undercover'?300:3000;seat.type='number';seat.min='1';seat.max='100';seat.placeholder='投票座位号';secret.setAttribute('aria-live','off');
 function render(){if(!room){status.textContent='创建房间或填写编号加入。';secret.textContent='';return;}id.value=room.id;if(room.left){status.textContent='已退出，本局记录保留';secret.textContent='';return;}status.textContent='房间 '+room.id+'\n状态：'+room.status+' · 阶段：'+(room.phase||'等待')+'\n'+room.players.map((p,i)=>(i+1)+'号'+(p===room.self?'（你）':'')+(p===room.owner?'［房主］':'')+(room.ready.includes(p)?' 已准备':'')).join('\n')+'\n'+(room.surface||'')+'\n'+Object.entries(room.descriptions||{}).map(([p,t])=>(room.players.indexOf(p)+1)+'号：'+t).join('\n')+'\n'+(room.questions||[]).map(q=>'问题：'+q.text+' → '+q.answer).join('\n')+(room.revealed?'\n揭晓：'+room.revealed:'')+(room.result?'\n本局已结束':'');secret.textContent=room.privateWord?'仅你可见的词语：'+room.privateWord+'。不要向其他玩家展示。':'';}
 async function act(operation){if(busy)return;busy=true;try{if(operation==='join')room=null;const response=await api('/api/room',{game:game.id,operation,room:room?.id||id.value.trim(),version:room?.version??0,requestID:crypto.randomUUID(),text:text.value.trim(),seat:Number(seat.value)});room=response.room;if(['question','describe','solve'].includes(operation))text.value='';el('notice').textContent=room.solutionFeedback||room.result?.explanation||(room.mvp?'本局MVP座位：'+room.mvp.players.map(p=>room.players.indexOf(p)+1).join('、'):'');render();}catch(error){el('notice').textContent=error.message;}finally{busy=false;}}
 const actions=[['创建房间','create'],['加入房间','join'],['刷新房间','read'],['准备','ready'],['房主开始','start'],...(game.kind==='undercover'?[['确认收到词语','confirm'],['提交描述','describe'],['投票','vote']]:[['向裁判提问','question'],['提交完整故事','solve'],['房主揭晓','reveal']]),...(game.mvpEnabled?[['房主申请MVP评分','score']]:[]),['退出本局','leave']];
 for(const [label,operation]of actions){const button=document.createElement('button');button.textContent=label;button.onclick=()=>{if(['leave','reveal'].includes(operation)&&!confirm(operation==='reveal'?'确认公布汤底并结束本局？':'确认退出？进行中的本局将中止。'))return;act(operation);};controls.append(button);}
 section.append(id,controls,secret,status,text);if(game.kind==='undercover')section.append(seat);render();
 restoreRooms(game,section,async roomID=>{room=null;id.value=roomID;await act('read');});
 const timer=setInterval(()=>{if(!section.isConnected){clearInterval(timer);return;}if(document.hidden||busy||!room||room.left||room.status==='finished')return;act('read');},4000);window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
}
function restoreRooms(game,section,open){const list=document.createElement('div'),refresh=document.createElement('button');refresh.textContent='读取我的房间';refresh.onclick=async()=>{try{const data=await api('/api/rooms',{game:game.id});list.replaceChildren();for(const room of data.rooms){const button=document.createElement('button');button.textContent=room.id+' · '+room.status;button.onclick=()=>open(room.id);list.append(button);}if(!data.rooms.length)list.textContent='暂无保存的房间';}catch(error){el('notice').textContent=error.message;}};section.append(refresh,list);}
function multiplayerFlowUI(game,section){
 const statsPanel=document.createElement('div');statsPanel.className='game-stats';section.append(statsPanel);
 let room=null,busy=false;const id=document.createElement('input'),status=document.createElement('pre'),actions=document.createElement('div');id.placeholder='房间编号';
 function render(){if(!room){status.textContent='创建或加入房间';return;}if(room.left){status.textContent='已退出房间';return;}id.value=room.id;status.textContent='房间 '+room.id+' · 在线 '+room.online+'/'+room.players.length+'\n我的存档：'+JSON.stringify(room.own.flowValues||{})+'\n排行榜：\n'+(room.leaderboard||[]).map((r,i)=>(i+1)+'. '+(r.player.startsWith('qq:')?r.player.slice(3):'座位'+r.seat)+'：'+r.score).join('\n')+'\n最近行动：\n'+room.activity.map(a=>'座位'+a.seat+'：'+a.reply).join('\n');}
 async function act(operation,command,extra={}){if(busy)return;busy=true;try{const data=await api('/api/room',{game:game.id,operation,room:room?.id||id.value.trim(),command,version:room?.version,requestID:crypto.randomUUID(),...extra});room=data.room;render();renderGameStats(game,room.own?.flowValues,statsPanel);if(partyPanel)renderParties();el('notice').textContent='';}catch(e){el('notice').textContent=e.message;}finally{busy=false;}}
 let partyPanel=null;
 function renderParties(){if(!partyPanel)return;partyPanel.replaceChildren();const heading=document.createElement('h3');heading.textContent='队伍';partyPanel.append(heading);if(!room||room.left)return;const current=document.createElement('p');current.textContent=room.party?'当前队伍 '+room.party.id+' · '+room.party.members.length+'人':'尚未加入队伍';partyPanel.append(current);const button=document.createElement('button');button.textContent=room.party?'退出队伍':'创建队伍';button.onclick=()=>act(room.party?'party-leave':'party-create');partyPanel.append(button);for(const party of room.parties||[]){const row=document.createElement('div'),text=document.createElement('p');text.textContent='队伍 '+party.id+' · '+party.members.map(p=>'座位'+(room.players.indexOf(p)+1)+(p===party.leader?'（队长）':'')).join('、');row.append(text);if(!room.party){const join=document.createElement('button');join.textContent='加入该队伍';join.onclick=()=>act('party-join',undefined,{party:party.id});row.append(join);}partyPanel.append(row);}}
 if(game.multiplayer?.party?.enabled){partyPanel=document.createElement('div');partyPanel.className='party-panel';section.append(partyPanel);}
 for(const [label,op]of [['创建房间','create'],['加入房间','join'],['刷新','read'],['退出房间','leave']]){const b=document.createElement('button');b.textContent=label;b.onclick=()=>{if(op==='join')room=null;act(op);};actions.append(b);}for(const c of game.commands){const b=document.createElement('button');b.textContent=c.description;b.onclick=()=>act('action',c.name);actions.append(b);}section.append(id,actions,status);restoreRooms(game,section,async roomID=>{room=null;id.value=roomID;await act('read');});render();const timer=setInterval(()=>{if(!section.isConnected){clearInterval(timer);return;}if(!document.hidden&&room&&!room.left&&!busy)act('read');},5000);window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
}
function cardUI(game,section){
 let room=null,busy=false,selected=new Set();const id=document.createElement('input'),status=document.createElement('pre'),hand=document.createElement('div'),controls=document.createElement('div');id.placeholder='房间编号';id.setAttribute('aria-label','斗地主房间编号');
 const label=card=>{const r=card<52?Math.floor(card/4)+3:card-36;return r<=10?String(r):({11:'J',12:'Q',13:'K',14:'A',15:'2',16:'小王',17:'大王'})[r];};
 function render(){hand.replaceChildren();if(!room){status.textContent='三位玩家加入、准备后，由房主开始。';return;}id.value=room.id;const state=room.state;status.textContent='房间 '+room.id+'\n'+room.players.map((p,i)=>(i+1)+'号'+(p===room.self?'（你）':'')+(room.ready.includes(p)?' 已准备':'')+(state?' 剩'+state.counts[p]+'张':'')).join('\n')+'\n状态：'+room.status+(state?' · '+state.phase+' · 当前'+(state.turn+1)+'号\n地主：'+(state.landlord?room.players.indexOf(state.landlord)+1:'未确定')+'\n桌面：'+(state.table?state.table.cards.map(label).join(' '):'无'):'')+(room.result?'\n结束：'+room.result.reason+' 胜方座位 '+room.result.winners.map(p=>room.players.indexOf(p)+1).join('、'):'');for(const card of state?.hand||[]){const b=document.createElement('button');b.textContent=(selected.has(card)?'✓ ':'')+label(card);b.setAttribute('aria-pressed',String(selected.has(card)));b.onclick=()=>{if(selected.has(card))selected.delete(card);else selected.add(card);render();};hand.append(b);}}
 async function act(operation,extra={}){if(busy)return;busy=true;try{const data=await api('/api/room',{game:game.id,operation,room:room?.id||id.value.trim(),version:room?.version??0,requestID:crypto.randomUUID(),...extra});const changed=!room||room.version!==data.room.version;room=data.room;if(operation!=='read'||changed)selected.clear();render();el('notice').textContent='';}catch(error){el('notice').textContent=error.message;}finally{busy=false;}}
 const actions=[['建房','create',{}],['加入','join',{}],['刷新','read',{}],['准备','ready',{}],['开始','start',{}],['不叫','bid',{bid:0}],['叫1分','bid',{bid:1}],['叫2分','bid',{bid:2}],['叫3分','bid',{bid:3}],['出牌','play',null],['不出','play',{cards:[]}],['退出中止','leave',{}]];
 for(const [name,operation,args]of actions){const button=document.createElement('button');button.textContent=name;button.onclick=()=>{if(operation==='leave'&&!confirm('确认退出并中止本局？不发放胜利奖励。'))return;if(operation==='join')room=null;act(operation,args||{cards:[...selected]});};controls.append(button);}section.append(id,controls,status,hand);restoreRooms(game,section,async roomID=>{room=null;id.value=roomID;await act('read');});render();const timer=setInterval(()=>{if(!section.isConnected){clearInterval(timer);return;}if(document.hidden||busy||!room||room.status==='finished')return;act('read');},4000);window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
}
`+fpsClient+scene3DClient+gameStatusClient+standaloneHostClient;
