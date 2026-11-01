export function gameExecutionOptions(request={}){
  const choices={gameVerification:['none','basic','full'],gameScope:['strict','core','expand'],gameBudget:['economy','balanced','generous']},defaults={gameVerification:'basic',gameScope:'expand',gameBudget:'balanced'},result={};
 for(const field of Object.keys(choices)){const value=request[field]??defaults[field];if(!choices[field].includes(value))throw Error('游戏执行选项无效：'+field);result[field]=value;}return result;
}
export function gameExecutionInstruction(request){
 const o=gameExecutionOptions(request);
 const verify={none:'仅生成，交由用户自测。不启动游戏/浏览器，不运行测试或验证命令，不自行循环修复。明确标注未运行验证。',basic:'基础检查：一次相关语法/构建/入口检查，最多修复一轮并复查一次；不进行浏览器或玩法体验测试。',full:'完整检查：允许相关基础检查和浏览器主要流程验证，最多两轮修复，不扩展到无关系统测试。'}[o.gameVerification];
 const scope={strict:'严格按需求：只做明确功能和使其可运行必需的部分，不主动增加签到、成就、商店、排行或额外剧情。',core:'核心可玩版：优先最小可玩循环；需求过大时明确本轮范围和剩余，不悄悄删要求后假称完成。',expand:'允许自主扩展：仅补充相关玩法，先完成明确需求，不无限新增系统。'}[o.gameScope];
 const budget={economy:'省Token：工具调用目标上限60次、修复1轮；短计划、定点读取，不搜索非必要资料、不多方案比较，不重复读完整源码/日志。',balanced:'均衡：工具调用目标上限120次、修复2轮；按需查询，保留简短摘要。',generous:'充分制作：工具调用目标上限180次、修复3轮；允许更多打磨，但不无限扩展。'}[o.gameBudget];
 return `\n【执行选项】${verify}${scope}${budget}验证与预算修复上限取较小值。调用次数是执行指导，不是精确Token硬限制；现有任务审批、时限和预算机制不变。局部修改只读取相关文件，不重做整款游戏；接近预算停止扩展并报告剩余。不得凭文件存在宣称完成，none不测试仍可交付但标明未测。宿主路径/格式/结构/权限校验始终保留，不等于玩法测试。`;
}
