export const modelPurposeFields=Object.freeze({chat:'model',task:'taskModel',game:'gameJudgeModel'});
export function purposeHost(hosts,purpose){if(!Object.hasOwn(modelPurposeFields,purpose)||!Object.hasOwn(hosts,purpose)||!hosts[purpose])throw Error('请选择聊天、任务或游戏用途');return hosts[purpose];}
