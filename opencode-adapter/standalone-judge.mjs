import path from 'node:path';
import {inspectWebGamePackage} from './web-game-package.mjs';
export function assertJudgeAllowed(game){if(game.judgeForbidden===true)throw Error('AI裁判功能未开启');if(game.kind!=='standalone'||!game.webPackage?.toolkit?.includes('judge'))throw Error('本游戏未声明裁判工具');}
export function validateJudgeDefinition(value){
 if(!value||value.version!==1||!Array.isArray(value.objectives)||!value.objectives.length||value.objectives.length>32)throw Error('裁判题目定义无效');
 const ids=new Set();for(const item of value.objectives){if(!item||typeof item.id!=='string'||!/^[-a-z0-9]{1,40}$/.test(item.id)||ids.has(item.id)||typeof item.prompt!=='string'||!item.prompt.trim()||item.prompt.length>2000||typeof item.answer!=='string'||!item.answer.trim()||item.answer.length>6000||!['question','solution'].includes(item.mode))throw Error('裁判目标/答案/模式无效');ids.add(item.id);}return value;
}
export async function judgeStandalone(service,game,user,input){
 assertJudgeAllowed(game);if(typeof input.text!=='string'||!input.text.trim()||input.text.length>3000)throw Error('裁判输入需为1–3000字');
 const entry=service.runtime.entry(game),room=entry.rooms(entry.runtime)[input.room];
 const authorized=()=>service.config().gamesEnabled&&service.engine.find(game.id).enabled&&service.engine.find(game.id).judgeForbidden!==true&&service.engine.find(game.id).webPackage.hash===game.webPackage.hash&&service.sessionMemberAllowed(game.id,user)&&room?.status==='playing'&&room.players.includes(user)&&!room.departed?.includes(user);
 if(!authorized())throw Error('不是有效房间成员或裁判权限已撤销');
 const archive=inspectWebGamePackage(path.join(service.packageRoot||service.engine.root,'web-packages',game.webPackage.hash));if(archive.hash!==game.webPackage.hash)throw Error('裁判版本校验失败');
 const file=archive.files.find(f=>f.name==='server/judge.json');if(!file)throw Error('缺少服务端裁判定义');
 const definition=validateJudgeDefinition(JSON.parse(file.bytes.toString('utf8'))),objective=definition.objectives.find(o=>o.id===input.objective);if(!objective)throw Error('裁判目标不存在');
 if(!service.judge?.evaluate)throw Error('独立裁判服务未配置');
 const result=await service.judge.evaluate({id:game.id+':'+room.id,game:game.id,room:room.id},objective,input.text);
 if(service.engine.find(game.id).judgeForbidden===true)throw Error('AI裁判功能未开启');if(!authorized())throw Error('裁判完成前权限或房间已变化，结果未提交');return {verdict:result.verdict};
}
