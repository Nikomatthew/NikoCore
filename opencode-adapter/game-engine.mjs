import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {validateSocialRules} from './social-game-rules.mjs';
import {validateWebUI} from './web-game-ui.mjs';
import {GameCapabilityRegistry} from './game-capability-registry.mjs';
import {declaredGameTools} from './game-tool-declarations.mjs';
import {validateGamePackage} from './game-packages/catalog.mjs';
import {validateFlow,executeFlow,validateMultiplayerFlow} from './game-packages/flow.mjs';
import {GameNumbers} from './game-numbers.mjs';
import {playerMayJoin} from './game-access.mjs';
import {reservedGameCommands} from './game-command-policy.mjs';
import {validatePartySettings} from './game-parties.mjs';
import {validateGameDesign} from './game-design.mjs';
import {validateScene3D} from './scene3d.mjs';

export const gameCapabilities=Object.freeze({
 earn:{validate(a){if(!Number.isSafeInteger(a.min)||!Number.isSafeInteger(a.max)||a.min<0||a.max<a.min||a.max>1000000)throw Error('收益范围无效');},run(a,state,random){const amount=a.min+Math.floor(random()*(a.max-a.min+1));if(!Number.isSafeInteger(state.coins+amount))throw Error('余额超限');state.coins+=amount;return `获得${amount}游戏币，余额${state.coins}`;}},
 status:{validate(){},run(a,state){return `余额${state.coins}游戏币`;}},
 flow:{validate(){},run(){throw Error('流程需经游戏上下文执行');}}
});
export function validateGame(value,registry){
 if(value?.judgeForbidden!==undefined&&typeof value.judgeForbidden!=='boolean')throw Error('裁判禁用开关无效');
 if(value?.kind==='standalone'){
  const p=value.webPackage;
   if(value.type!=='web'||!p||! /^[a-f0-9]{64}$/.test(p.hash)||!['2d','3d','mixed'].includes(p.dimension)||typeof p.entry!=='string'||!p.entry.endsWith('.html')||!Array.isArray(p.toolkit)||p.toolkit.some(id=>!['identity','rooms','party','save','world','judge'].includes(id)))throw Error('独立网页游戏包引用或工具依赖无效');
 }
 if(!value||value.format!==1||typeof value.id!=='string'||!/^[-a-z0-9]{1,40}$/.test(value.id)||typeof value.name!=='string'||value.name.length<1||value.name.length>40||!Array.isArray(value.commands)||value.commands.length<(value.kind==='standalone'?0:1)||value.commands.length>20)throw Error('游戏格式无效');
 if(!Number.isSafeInteger(value.initialCoins)||value.initialCoins<0||value.initialCoins>1000000)throw Error('初始游戏币无效');
  const names=new Set();for(const command of value.commands){if(!command||!/^\/[\u4e00-\u9fffA-Za-z0-9]{1,12}$/.test(command.name)||['/结束','/游戏','/帮助','/任务','/暂停','/继续','/指导','/打断','/进度','/创建工具','/存表情','/发表情','/撤回','/游戏生成','/游戏更改','/房间','/建房','/加入','/准备','/开始','/离房','/结束回合','/战绩'].includes(command.name)||names.has(command.name))throw Error('游戏指令重复或保留');names.add(command.name);if(typeof command.description!=='string'||command.description.length>100)throw Error('指令说明无效');if(!Number.isInteger(command.cooldownSeconds)||command.cooldownSeconds<1||command.cooldownSeconds>86400)throw Error('冷却无效');if(Object.hasOwn(gameCapabilities,command.action?.type))gameCapabilities[command.action.type].validate(command.action);else if(registry)registry.validate(command.action);else throw Error('游戏能力尚未支持，需要批准安装');}
   if(value.type!==undefined&&!['bot','web'].includes(value.type))throw Error('游戏类型无效');
  if(value.enabled!==undefined&&typeof value.enabled!=='boolean')throw Error('游戏开关无效');
  if(value.players!==undefined&&(!Array.isArray(value.players)||value.players.length>1000||value.players.some(id=>typeof id!=='string'||!/^\d{5,15}$/.test(id))))throw Error('玩家白名单无效');
   validateSocialRules(value);
   if(value.commands.some(c=>reservedGameCommands.has(c.name)))throw Error('游戏专用指令不能覆盖系统指令');
   if(value.blockedPlayers!==undefined&&(!Array.isArray(value.blockedPlayers)||value.blockedPlayers.length>1000||value.blockedPlayers.some(p=>typeof p!=='string'||!/^\d{5,15}$/.test(p))))throw Error('游戏黑名单无效');
   validateGamePackage(value);
   validateMultiplayerFlow(value);
   validatePartySettings(value);
   if(value.kind==='flow'){validateFlow(value.flow);if(value.commands.some(c=>c.action.type!=='flow')||value.commands.some(c=>!value.flow.actions.some(a=>a.command===c.name))||value.flow.actions.some(a=>!value.commands.some(c=>c.name===a.command)))throw Error('流程动作与指令不一致');}else if(value.commands.some(c=>c.action.type==='flow'))throw Error('流程动作需声明flow游戏包');
   validateWebUI(value.webUI);
   validateGameDesign(value);validateScene3D(value.scene3d);if(value.scene3d&&value.type!=='web')throw Error('3D场景仅支持网页游戏');
   const capabilities=declaredGameTools(value);
   if(value.webUI&&(value.type!=='web'||value.webUI.buttons.some(b=>!value.commands.some(c=>c.name===b.command))))throw Error('网页界面引用了未定义指令');
   return {...JSON.parse(JSON.stringify(value)),capabilities,mvpEnabled:capabilities.includes('judge.score'),type:value.type||'bot',enabled:value.enabled===true,players:[...new Set(value.players||[])]};
}
export class GameEngine{
  constructor(root,{random=Math.random,now=Date.now}={}){this.root=path.join(root,'state','games');this.random=random;this.now=now;fs.mkdirSync(this.root,{recursive:true});this.numbers=new GameNumbers(this.root);this.registry=new GameCapabilityRegistry(path.join(this.root,'capabilities'));this.file=path.join(this.root,'players.json');this.players=fs.existsSync(this.file)?JSON.parse(fs.readFileSync(this.file,'utf8')):{};this.games=new Map();}
 save(){const file=this.file+'.tmp';fs.writeFileSync(file,JSON.stringify(this.players),{mode:0o600});fs.renameSync(file,this.file);}
   load(){this.registry.load();const dir=path.join(this.root,'published');fs.mkdirSync(dir,{recursive:true});this.games.clear();for(const name of fs.readdirSync(dir)){if(!name.endsWith('.json'))continue;const game=validateGame(JSON.parse(fs.readFileSync(path.join(dir,name),'utf8')),this.registry);if(this.games.has(game.id))throw Error('游戏编号重复');game.number=this.numbers.get(game.id);this.games.set(game.id,game);}}
 key(scope,user){if(!/^(group|private):\d{5,15}$/.test(scope)||!/^\d{5,15}$/.test(user))throw Error('游戏分区无效');return `${scope}:${user}`;}
  find(id){const internal=this.numbers.resolve(String(id));const matches=[...this.games.values()].filter(g=>g.id===(internal||id)||g.name===id);if(matches.length!==1)throw Error('游戏不存在或名称重复，请使用编号');const game=matches[0];return {...game,number:this.numbers.get(game.id)};}
  webAction(game,command,state){if(command.action.type==='flow')return executeFlow(game,state,command.name,this.random);return Object.hasOwn(gameCapabilities,command.action.type)?gameCapabilities[command.action.type].run(command.action,state,this.random):this.registry.execute(command.action,state);}
 versions(id){const game=this.find(id),dir=path.join(this.root,'versions',game.id);if(!fs.existsSync(dir))return [];return fs.readdirSync(dir).filter(n=>/^[a-f0-9-]{36}\.json$/.test(n)).map(n=>({version:n.slice(0,-5),createdAt:fs.statSync(path.join(dir,n)).mtimeMs})).sort((a,b)=>b.createdAt-a.createdAt);}
 replace(id,value){const current=this.find(id),game=validateGame(value,this.registry);if(game.id!==current.id||game.type!==current.type)throw Error('更新不能更换游戏编号或类型');const dir=path.join(this.root,'versions',current.id);fs.mkdirSync(dir,{recursive:true});const version=crypto.randomUUID();fs.writeFileSync(path.join(dir,version+'.json'),JSON.stringify(current),{flag:'wx',mode:0o600});const next={...game,enabled:false,players:current.players},file=path.join(this.root,'published',current.id+'.json');fs.writeFileSync(file+'.tmp',JSON.stringify(next),{mode:0o600});fs.renameSync(file+'.tmp',file);this.load();return version;}
 updateDraft(id,draftID){if(!/^[a-f0-9-]{36}$/.test(draftID))throw Error('草稿编号无效');return this.replace(id,JSON.parse(fs.readFileSync(path.join(this.root,'drafts',draftID+'.json'),'utf8')));}
 rollback(id,version){const current=this.find(id);if(!/^[a-f0-9-]{36}$/.test(version))throw Error('历史版本编号无效');return this.replace(id,JSON.parse(fs.readFileSync(path.join(this.root,'versions',current.id,version+'.json'),'utf8')));}
  join(scope,user,id){const game=this.find(id);if(game.type!=='bot'||!playerMayJoin(game,user))throw Error('游戏未启用或你没有加入权限');const key=this.key(scope,user),profile=this.players[key]||{active:null,saves:{}};profile.saves[game.id]??={coins:game.initialCoins,cooldowns:{}};profile.active=game.id;this.players[key]=profile;this.save();return `${game.name}\n${game.commands.map(c=>`${c.name}：${c.description}`).join('\n')}\n/游戏退出：退出当前房间`;}
  act(scope,user,text){const key=this.key(scope,user),profile=this.players[key];if(!profile?.active)return null;if(text==='/结束'){profile.active=null;this.save();return '已退出游戏，存档保留';}const game=this.games.get(profile.active);if(!game)throw Error('游戏当前不可用，请使用/游戏退出');if(!playerMayJoin(game,user))return null;const command=game.commands.find(c=>c.name===text);if(!command)return null;const state=structuredClone(profile.saves[game.id]),now=this.now();if(now<(state.cooldowns[command.name]||0))return '操作冷却中，请稍后再试';const result=this.webAction(game,command,state);state.cooldowns[command.name]=now+command.cooldownSeconds*1000;const before=profile.saves[game.id];profile.saves[game.id]=state;try{this.save();}catch(e){profile.saves[game.id]=before;throw e;}return result;}
 publish(draftID){if(!/^[a-f0-9-]{36}$/.test(draftID))throw Error('草稿编号无效');const file=path.join(this.root,'drafts',draftID+'.json'),game=validateGame(JSON.parse(fs.readFileSync(file,'utf8')),this.registry),dir=path.join(this.root,'published');fs.mkdirSync(dir,{recursive:true});const dest=path.join(dir,game.id+'.json');if(fs.existsSync(dest))throw Error('游戏编号已存在，不覆盖旧游戏');fs.writeFileSync(dest,JSON.stringify({...game,enabled:false}),{flag:'wx',mode:0o600});this.load();return game.id;}
   configure(id,{enabled,players,blockedPlayers,judgeForbidden}){const current=this.find(id),game=validateGame({...current,enabled,players,judgeForbidden:judgeForbidden??current.judgeForbidden??false,blockedPlayers:blockedPlayers??current.blockedPlayers??[]},this.registry),file=path.join(this.root,'published',current.id+'.json');fs.copyFileSync(file,file+'.backup-'+this.now());fs.writeFileSync(file+'.tmp',JSON.stringify(game),{mode:0o600});fs.renameSync(file+'.tmp',file);this.load();}
  draft(value){const game=validateGame(value,this.registry),dir=path.join(this.root,'drafts');fs.mkdirSync(dir,{recursive:true});const id=crypto.randomUUID();fs.writeFileSync(path.join(dir,id+'.json'),JSON.stringify(game,null,2),{flag:'wx',mode:0o600});return id;}
}
