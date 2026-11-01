export function gameRequirements(text=''){
  return {multiplayer:/多人|联机|同房|房间/.test(text),leaderboard:/排行榜|排名榜|排行/.test(text),presence:/在线人数|在线玩家/.test(text),...(/WASD|键鼠|鼠标(?:左|右)键|[Ee]键互动|第一人称|第三人称|\b(?:FPS|TPS)\b|驾驶|赛车/i.test(text)?{directControl:true}:{})};
}
export function unmetGameRequirements(game,requirements={}){
  if(game.kind==='standalone')return Object.entries(requirements).filter(([key,needed])=>needed===true&&game.webPackage?.features?.[key]!==true).map(([key])=>'独立游戏功能：'+key);
  const missing=[];const roomKinds=['undercover','turtle-soup','gomoku','doudizhu','fps'];
  if(requirements.directControl&&game.kind!=='fps')missing.push('直接操控玩法，不能以指令按钮面板替代');
 if(requirements.multiplayer&&!roomKinds.includes(game.kind)&&!(game.kind==='flow'&&game.multiplayer?.enabled===true))missing.push('多人房间');
 if(requirements.leaderboard&&!(game.kind==='flow'&&game.multiplayer?.enabled===true&&game.multiplayer?.leaderboardField))missing.push('排行榜');
 if(requirements.presence&&!(game.kind==='flow'&&game.multiplayer?.enabled===true))missing.push('在线人数');
 return missing;
}
