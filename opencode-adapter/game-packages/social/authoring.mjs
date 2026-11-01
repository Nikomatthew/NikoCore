export function socialAuthoringInstruction(text,baseline){
 const request=String(text)+' '+String(baseline?.name||''),kind=(['undercover','turtle-soup'].includes(baseline?.kind)?baseline.kind:null)||(/谁是卧底|卧底游戏/.test(request)?'undercover':/海龟汤/.test(request)?'turtle-soup':null);
 if(!['undercover','turtle-soup'].includes(kind))return '';
  return '只生成任务目录game.json，不生成或执行脚本。使用现有社交游戏能力，format=1，type="bot"，id为英文短编号，name为游戏名，initialCoins=0，commands=[{"name":"/状态","description":"查看状态","cooldownSeconds":1,"action":{"type":"status"}}]。不设置enabled和players。'+(kind==='undercover'?'kind="undercover"，wordPairs为1–100组不同且语义接近的词语对，例如[["苹果","梨子"]]。角色私信、全员确认、描述轮次和投票由引擎提供，不生成固定玩家身份。':'kind="turtle-soup"，puzzle={"surface":"汤面","answer":"逻辑自洽的完整汤底"}。需要独立游戏裁判模型；开局不向玩家私发汤底，所有本局玩家可提问，由裁判返回固定判定。房主仅控制揭晓，不手动覆盖判题。不声称已运行模型或已配置裁判。')+'缺少其他能力时按能力草稿协议制作，不虚构已安装；生成后待主人审核发布。';
}
