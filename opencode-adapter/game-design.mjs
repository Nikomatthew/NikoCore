const field=/^v_[a-z][a-z0-9_]{0,31}$/;
export function validateGameDesign(game){
 const d=game.design;if(d===undefined)return;
 if(!d||d.version!==1||typeof d.goal!=='string'||!d.goal.trim()||d.goal.length>500||!Array.isArray(d.loop)||d.loop.length<1||d.loop.length>8||d.loop.some(s=>typeof s!=='string'||!s.trim()||s.length>200))throw Error('游戏设计目标或核心循环无效');
 const stats=d.stats||[];if(!Array.isArray(stats)||stats.length>32)throw Error('游戏数值定义无效');const seen=new Set();
 for(const s of stats){if(!s||!field.test(s.field)||seen.has(s.field)||typeof s.label!=='string'||!s.label.trim()||s.label.length>40||!Number.isSafeInteger(s.min)||!Number.isSafeInteger(s.max)||s.min>s.max||Math.abs(s.min)>1000000000||Math.abs(s.max)>1000000000)throw Error('游戏数值范围无效');seen.add(s.field);const initial=game.flow?.values?.[s.field];if(initial!==undefined&&(initial<s.min||initial>s.max))throw Error('游戏初始数值超出设计范围');}
 for(const key of ['decisions','outcomes'])if(d[key]!==undefined&&(!Array.isArray(d[key])||d[key].length>12||d[key].some(s=>typeof s!=='string'||s.length>300)))throw Error('游戏决策或结果说明无效');
}
export function assertGameStatBounds(game,values){for(const stat of game.design?.stats||[]){const value=values[stat.field]??0;if(!Number.isSafeInteger(value)||value<stat.min||value>stat.max)throw Error(stat.label+'超出允许范围，行动未保存');}}
export function gameDesignInstruction(){return ' 制作步骤：先在任务目录写design.json设计摘要（不包含隐藏推理），再实施game.json，最后检查。摘要version=1、goal明确玩家目标、loop为开始→行动→反馈→成长/结算的循环数组、decisions为选择及实际代价、outcomes为成功/失败/重试条件、stats为数值表（field:v_字段,label,min,max），并将这些公开设计信息写入game.json.design。不要所有玩法都增加无关战斗/经济。数值必须有来源/消耗、初始值、上限和失败路径，概率规则与实际random/branch一致；不把按钮数量当游戏深度。操作必须改变真实状态或显示真实信息，不创建不能完成的目标。任务检查至少包含正常路径、资源不足、重复请求、离开重入和多人越权；不能假称没运行的检查已通过。已实现能力优先复用；缺失能力生成草稿并报告缺口，不改玩法要求来迁就模板。网页UI用可读标题、状态、动作按钮、队伍及进度，不让玩家输入QQ命令。';}
