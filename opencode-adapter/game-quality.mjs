export const gameQualityLevels=Object.freeze({
 low:{label:'低',standard:'小规模可玩原型；允许明确标记的占位美术，优先核心循环、必要操作和基础反馈，避免无关系统扩张。'},
 medium:{label:'中',standard:'完整小型游戏；统一基础美术与清晰HUD，主要流程和必要动画音效齐全，具有可重复游玩的目标。'},
 high:{label:'高',standard:'精细小型成品目标；强化场景层次、动画过渡、战斗或交互反馈、内容变化、可用性与性能分档。'},
 ultra:{label:'超高',standard:'高表现力精品目标；先确定独特视觉与玩法记忆点，细化模型材质、灯光、镜头演出、动画音效和内容节奏；不能以堆特效或扩大地图代替可玩性。'}
});
export function gameQuality(request={}){
 if(request.gameQuality!==undefined){if(!Object.hasOwn(gameQualityLevels,request.gameQuality))throw Error('制作标准需为低/中/高/超高');return request.gameQuality;}
 const match=String(request.text||'').match(/(?:制作标准|制作档位|品质档位|质量档位)\s*[:：=]?\s*(超高|高|中|低)/);
 return match?({'低':'low','中':'medium','高':'high','超高':'ultra'}[match[1]]):'medium';
}
export function gameQualityInstruction(request){const level=gameQuality(request),entry=gameQualityLevels[level];return ` 制作标准=${entry.label}（${level}），这是用户选择的投入与打磨目标，不是已达成认证。${entry.standard} 所有档位都保留明确要求的功能、输入方式、2D/3D及多人需求；低标准不能把WASD改成按钮，超高不能承诺AAA或未实测质量。自由选择适合玩法的渲染、界面与工具，不强制模板。碰撞、角色控制、物理、动画、战斗、相机、UI等既可自行编写，也可复用本地提供的工具/库，并允许混用。不得把可选工具误当唯一玩法语言；自制逻辑不需要转成commands或flow。自制多人逻辑必须在受限服务端运行并经宿主验证，不能信任客户端自报命中、伤害、金币或奖励。资源和依赖需本地打包并记录来源许可；不绕过沙箱、审批或未接通接口。设计摘要记录qualityLevel、目标范围、工具自制/复用选择、占位资源和待验收项。缺少资源/能力时报告，不暗降档。高档位不自动扩大任务预算、解除安全校验、购买素材或调用额外付费服务；预算不足申请继续，不伪报完成。`;}
