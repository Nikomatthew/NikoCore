export function requestedGameKind(text=''){
 if(/海龟汤/.test(text))return 'turtle-soup';
 if(/谁是卧底|卧底游戏/.test(text))return 'undercover';
 if(/五子棋/.test(text))return 'gomoku';
 if(/斗地主/.test(text))return 'doudizhu';
 return null;
}
export function assertGameKindContract(game,text='',baseline){
  if(game.type==='web'&&game.kind==='standalone')return null;
 const expected=requestedGameKind(text)||requestedGameKind(game.name)||requestedGameKind(baseline?.name)||(['turtle-soup','undercover','gomoku','doudizhu'].includes(baseline?.kind)?baseline.kind:null);
 if(expected&&game.kind!==expected)throw Error(`游戏规则不完整：需要${expected}玩法包，不能只修改游戏名称；请使用更改任务重新制作`);
 if(expected==='turtle-soup'&&(!game.puzzle?.surface?.trim()||!game.puzzle?.answer?.trim()))throw Error('海龟汤缺少汤面或汤底，请先通过更改任务补齐');
 return expected;
}
