export const publicGameToolNames=Object.freeze(['room.public','player.private','judge.decide','judge.score','records.read','records.settle']);
export function declaredGameTools(game){
 const values=game.capabilities??[];
 if(!Array.isArray(values)||values.length>publicGameToolNames.length||values.some(value=>!publicGameToolNames.includes(value))||new Set(values).size!==values.length)throw Error('游戏工具声明无效');
 if(game.mvpEnabled!==undefined&&typeof game.mvpEnabled!=='boolean')throw Error('MVP能力开关无效');
 if(game.mvpEnabled===false&&values.includes('judge.score'))throw Error('MVP开关与评分工具声明冲突');
 return [...new Set([...values,...(game.mvpEnabled===true?['judge.score']:[])])];
}
export function hasGameTool(game,name){return declaredGameTools(game).includes(name);}
