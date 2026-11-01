export function validateSocialRules(game){
 if(['flow','fps','standalone'].includes(game.kind))return;
 if(game.kind==='doudizhu'){if(game.type!=='web')throw Error('斗地主目前为网页类型');return;}
 if(game.kind==='gomoku'){if(game.type!=='web')throw Error('五子棋目前为网页类型');return;}
 if(game.kind===undefined||game.kind==='economy')return;
 if(!['undercover','turtle-soup'].includes(game.kind))throw Error('社交玩法类型无效');
 const text=(value,max)=>typeof value==='string'&&value.trim().length>0&&value.length<=max;
 if(game.kind==='undercover'){
  if(!Array.isArray(game.wordPairs)||game.wordPairs.length<1||game.wordPairs.length>100)throw Error('卧底游戏需要1–100组词对');
  for(const pair of game.wordPairs)if(!Array.isArray(pair)||pair.length!==2||!pair.every(w=>text(w,40))||pair[0].trim()===pair[1].trim())throw Error('卧底词对需为两个不同的短词');
  }else{if(!text(game.puzzle?.surface,2000)||!text(game.puzzle?.answer,4000))throw Error('海龟汤需要汤面和汤底');if(game.puzzle.keyFacts!==undefined&&(!Array.isArray(game.puzzle.keyFacts)||game.puzzle.keyFacts.length>20||game.puzzle.keyFacts.some(f=>!text(f,500))))throw Error('汤底关键事实无效');}
}
export function socialMenu(game){return game.kind==='undercover'?
 '/建房 游戏编号 → /加入 房间编号 → 全员/准备 房间编号 → 房主/开始 房间编号\n开始后私信每人词语（不公布阵营）；收到词语后/确认身份 房间编号\n全员确认后按座位/描述 房间编号 内容，再/投票 房间编号 座位号\n平票不淘汰，进入下一轮；/离房 房间编号退出，进行中离房会中止本局并保留记录。':
 '/建房 游戏编号 → /加入 房间编号 → 全员准备 → 房主/开始 房间编号\n需主人先配置游戏裁判模型，汤底不私发玩家。\n参与玩家可在本群@机器人提问，或/提问 房间编号 问题；裁判回复是/否/无关/无法确定。\n房主/揭晓 房间编号公布汤底并结束，不自动判定猜中者。';}
