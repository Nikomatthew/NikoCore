import {validateGame} from './game-engine.mjs';
import {validateFlow} from './game-packages/flow.mjs';
import {gameRequirements,unmetGameRequirements} from './game-requirements.mjs';
import {assertGameKindContract} from './game-kind-contract.mjs';
export function checkGeneratedGame(raw,{registry,text='',requirements,gameType,baseline}={}){
 assertGameKindContract(raw,text,baseline);
 const game=validateGame(raw,registry),required=requirements||gameRequirements(text),missing=unmetGameRequirements(game,required);
 if(missing.length)throw Error('游戏未满足必需功能：'+missing.join('、'));
 if(game.type==='web'&&/组队|队友|队伍成员/.test(text)&&!(game.kind==='standalone'?game.multiplayer?.party?.enabled===true||game.webPackage?.features?.party===true:game.kind==='flow'&&game.multiplayer?.party?.enabled===true))throw Error('需求包含真实组队，不能用个人数值标记代替队伍能力');
 if(game.type==='web'&&/(?:真正|完整|自由|全)?3[Dd]|三维/.test(text)&&!game.scene3d&&game.kind!=='fps'&&!(game.kind==='standalone'&&['3d','mixed'].includes(game.webPackage.dimension)))throw Error('需求包含3D表现，但产物没有场景或已安装的渲染能力');
 if(gameType&&game.type!==gameType)throw Error('游戏类型与生成命令不符');
 if(baseline&&(game.id!==baseline.id||game.type!==baseline.type))throw Error('更改不能替换游戏身份或类型');
 if(game.kind==='flow'){
  validateFlow(game.flow);const reached=new Set([game.flow.initial]);let changed=true;while(changed){changed=false;for(const action of game.flow.actions)if(reached.has(action.from)&&!reached.has(action.to)){reached.add(action.to);changed=true;}}
  if(game.flow.actions.some(a=>!reached.has(a.from)))throw Error('存在无法从初始阶段到达的游戏动作');
  if(game.multiplayer?.leaderboardField){const field=game.multiplayer.leaderboardField;const writes=steps=>steps.some(s=>s.op==='branch'?writes(s.then)||writes(s.else):s.field===field&&s.op!=='require');if(!game.flow.actions.some(a=>writes(a.steps)))throw Error('排行榜字段没有任何可更新的游戏动作');}
 }
 return game;
}
