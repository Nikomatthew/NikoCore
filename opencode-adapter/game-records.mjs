import fs from 'node:fs';
import path from 'node:path';
export function checkedScores(players,scores){
 if(!Array.isArray(scores)||scores.length!==players.length)throw Error('裁判评分人数不符');
 const seen=new Set();for(const item of scores){if(!item||!players.includes(item.player)||seen.has(item.player)||!Number.isFinite(item.score)||item.score<0||item.score>100)throw Error('裁判评分无效');seen.add(item.player);}
 const highest=Math.max(...scores.map(s=>s.score));return scores.filter(s=>s.score===highest).map(s=>s.player);
}
export class GameRecords{
 constructor(directory){fs.mkdirSync(directory,{recursive:true});this.file=path.join(directory,'records.json');this.data=fs.existsSync(this.file)?JSON.parse(fs.readFileSync(this.file,'utf8')):{players:{},settlements:{}};}
  key(game,scope,player){const bot=/^(group|private):\d{5,15}$/.test(scope)&&/^\d{5,15}$/.test(player),web=scope==='web:'+game&&(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(player)||/^qq:\d{5,15}$/.test(player));if(!/^[-a-z0-9]{1,40}$/.test(game)||!bot&&!web)throw Error('战绩身份无效');return `${game}:${scope}:${player}`;}
 read(game,scope,player){return structuredClone(this.data.players[this.key(game,scope,player)]||{played:0,wins:0,mvp:0});}
 awardMVP({id,game,scope,players,scores}){
  const key=`${game}:${scope}:${id}`,prior=this.data.settlements[key];if(!prior)throw Error('请先完成服务端胜负结算');
  if(prior.scored)return structuredClone(prior);
  const mvp=checkedScores(players,scores),before=structuredClone(this.data);
  for(const player of players)this.key(game,scope,player);
  if(prior.signature!==JSON.stringify({players:[...players].sort(),winners:[...prior.winners].sort()}))throw Error('评分玩家与结算不符');
  for(const player of mvp)this.data.players[this.key(game,scope,player)].mvp++;
  prior.mvp=mvp;prior.scored=true;
  try{fs.writeFileSync(this.file+'.tmp',JSON.stringify(this.data),{mode:0o600});fs.renameSync(this.file+'.tmp',this.file);}catch(e){this.data=before;throw e;}return structuredClone(prior);
 }
 settle({id,game,scope,players,winners,scores}){
  if(typeof id!=='string'||! /^(?:\d{6}|[-a-zA-Z0-9]{8,100})$/.test(id)||!Array.isArray(players)||players.length<1||players.length>100||new Set(players).size!==players.length||!Array.isArray(winners)||new Set(winners).size!==winners.length||winners.some(p=>!players.includes(p)))throw Error('战绩结算参数无效');
 for(const player of players)this.key(game,scope,player);
 const key=`${game}:${scope}:${id}`,signature=JSON.stringify({players:[...players].sort(),winners:[...winners].sort()});
 if(Object.hasOwn(this.data.settlements,key)){const prior=this.data.settlements[key];if(prior.signature!==signature)throw Error('结算编号已使用且结果冲突');return structuredClone(prior);}
 const mvp=scores===undefined?[]:checkedScores(players,scores),before=structuredClone(this.data);
 for(const player of players){const stat=this.read(game,scope,player);stat.played++;if(winners.includes(player))stat.wins++;if(mvp.includes(player))stat.mvp++;this.data.players[this.key(game,scope,player)]=stat;}
 const receipt={signature,id,game,scope,mvp,winners:[...winners],at:Date.now()};this.data.settlements[key]=receipt;
 try{fs.writeFileSync(this.file+'.tmp',JSON.stringify(this.data),{mode:0o600});fs.renameSync(this.file+'.tmp',this.file);}catch(e){this.data=before;throw e;}return structuredClone(receipt);
 }
}
