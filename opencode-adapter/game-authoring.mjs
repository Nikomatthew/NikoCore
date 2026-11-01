import fs from 'node:fs';
import path from 'node:path';
import {checkGeneratedGame} from './game-generation-check.mjs';
import {webPackageManifest,archiveWebGamePackage,standaloneGameRecord} from './web-game-package.mjs';
export function gameAuthoringInstruction(){return '在任务目录制作game.json，format=1，id为英文内部编号，name为游戏名，type="bot"，initialCoins=0。根据玩家需求设计本游戏独有commands，不固定使用/赚钱和/状态。每条包含name（斜线+1–12个中文/字母/数字）、description、cooldownSeconds（1–86400）、action。优先使用已安装流程包；原创状态玩法可用kind="flow"和action={"type":"flow"}，在flow.actions中为每条指令绑定实际阶段、条件、状态变化及回复。例如探索/休息应改变相应状态，不能只有名字和无效菜单。已批准的custom.*能力按目录ID和hash引用；缺少能力按capabilities.json协议制作草稿并报告待安装，不伪造已可运行。游戏专用指令只在当前房间有效，不能覆盖/游戏退出、/开始游戏、/游戏停止等系统命令。不执行任意脚本或网络请求，不指定enabled/players，不自定六位公开编号。通过校验后由宿主自动归档，不假称已开房或发QQ。';}
export function importGameTask(engine,task,owner,workspace){
 if(task.owner!==owner||task.taskType!=='game-authoring'||task.status!=='succeeded')throw Error('仅可导入主人已完成的游戏生成任务');
 const expected=path.resolve(workspace,task.id);if(path.resolve(task.resultDir||'')!==expected||fs.realpathSync(expected)!==expected)throw Error('游戏任务目录无效');
 if(fs.existsSync(path.join(expected,webPackageManifest))){
  if((task.gameType||task.gameBaseline?.type)!=='web')throw Error('QQ Bot游戏不可导入独立网页包');
  const archive=archiveWebGamePackage(expected,path.join(engine.root,'web-packages'),{baseline:task.gameBaseline,requirements:task.gameRequirements});
  const game=checkGeneratedGame(standaloneGameRecord(archive),{registry:engine.registry,text:task.text,requirements:task.gameRequirements,gameType:'web',baseline:task.gameBaseline});
  if(task.gameUpdateID&&game.id!==task.gameUpdateID)throw Error('生成结果与待更改游戏编号不一致');
   return engine.draft({...game,judgeForbidden:task.gameJudgeForbidden===true||task.gameBaseline?.judgeForbidden===true});
 }
 const file=path.join(expected,'game.json'),stat=fs.lstatSync(file);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>64000||fs.realpathSync(file)!==file)throw Error('游戏规则文件无效');
 const raw=JSON.parse(fs.readFileSync(file,'utf8'));if(Array.isArray(raw.commands))for(const command of raw.commands){if(command.action?.type?.startsWith('custom.')&&!command.action.hash){const capability=engine.registry.list().find(c=>c.id===command.action.type);if(capability)command.action.hash=capability.hash;}}
  const game=checkGeneratedGame(raw,{registry:engine.registry,text:task.text,requirements:task.gameRequirements,gameType:task.gameType,baseline:task.gameBaseline});if(task.gameUpdateID&&game.id!==task.gameUpdateID)throw Error('生成结果与待更改游戏编号不一致');return engine.draft({...game,judgeForbidden:task.gameJudgeForbidden===true||task.gameBaseline?.judgeForbidden===true,enabled:false,players:[]});
}
