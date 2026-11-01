export const gamePackageCatalog=Object.freeze([
  {id:'standalone',types:['web'],version:1,description:'独立2D/3D网页源码包；隔离客户端运行、可选身份/房间/队伍/非权威个人存档，不执行生成后端'},
 {id:'flow',types:['bot','web'],version:2,description:'声明式阶段/条件/计算/随机流程；网页可声明多人房间、在线、排行及跨房玩家存档，不执行任意代码'},
 {id:'fps',types:['web'],version:1,description:'8人基础射线3D竞技场，服务端移动/墙体/命中校验，10击杀结束；房间不跨重启保存'},
 {id:'economy',types:['bot','web'],version:1,description:'数值规则与经批准的自定义整数能力'},
 {id:'undercover',types:['bot','web'],version:1,description:'身份/词语私有、确认、描述与投票'},
 {id:'turtle-soup',types:['bot','web'],version:1,description:'秘密汤底与独立AI裁判'},
 {id:'gomoku',types:['web'],version:1,description:'15×15无禁手五子棋'},
 {id:'doudizhu',types:['web'],version:1,description:'三人一次叫分斗地主基础规则，无癞子/下注'}
]);
export function validateGamePackage(game){const kind=game.kind||'economy',entry=gamePackageCatalog.find(p=>p.id===kind);if(!entry||!entry.types.includes(game.type||'bot'))throw Error('游戏流程包未安装或不支持该类型：'+kind);return entry;}
