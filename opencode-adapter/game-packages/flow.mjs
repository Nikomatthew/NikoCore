const key=/^v_[a-z][a-z0-9_]{0,31}$/;
import {assertGameStatBounds} from '../game-design.mjs';
export function validateMultiplayerFlow(game){
 if(game.multiplayer===undefined)return;
  const m=game.multiplayer;if(game.type!=='web'||!['flow','standalone'].includes(game.kind)||!m||m.enabled!==true||!Number.isInteger(m.maxPlayers)||m.maxPlayers<1||m.maxPlayers>100||m.leaderboardField!==undefined&&!key.test(m.leaderboardField))throw Error('多人流程配置无效');
}
export function validateFlowExtensions(flow){
 let count=0;const walk=(steps,depth)=>{if(depth>4)throw Error('流程分支嵌套过深');for(const s of steps){if(++count>128)throw Error('流程步骤总数超限');if(s.op==='branch'){if(!key.test(s.field)||!['gte','lte','eq'].includes(s.compare)||!Number.isSafeInteger(s.value)||!Array.isArray(s.then)||!Array.isArray(s.else))throw Error('流程分支无效');walk(s.then,depth+1);walk(s.else,depth+1);}else if(s.op==='calculate'){if(!key.test(s.field)||!['add','subtract','multiply','min','max'].includes(s.operator)||!Array.isArray(s.fields)||s.fields.length<1||s.fields.length>8||s.fields.some(f=>!key.test(f)))throw Error('流程计算无效');}else validateStep(s);}};
 for(const action of flow.actions)walk(action.steps,0);
}
function validateStep(step){if(!step||!['require','add','set','random'].includes(step.op)||!key.test(step.field))throw Error('流程步骤无效');if(step.op==='random'){if(!Number.isSafeInteger(step.min)||!Number.isSafeInteger(step.max)||step.min>step.max||Math.abs(step.min)>1000000||Math.abs(step.max)>1000000)throw Error('随机数范围无效');}else if(!Number.isSafeInteger(step.value)||Math.abs(step.value)>1000000||step.op==='require'&&!['gte','lte','eq'].includes(step.compare))throw Error('流程参数无效');}
export function validateFlow(flow){
 if(!flow||flow.version!==1||typeof flow.initial!=='string'||!Array.isArray(flow.states)||flow.states.length<1||flow.states.length>32||!Array.isArray(flow.actions)||flow.actions.length>40)throw Error('流程定义无效');
 const states=new Set(flow.states);if(states.size!==flow.states.length||!flow.states.every(s=>/^[-a-z0-9]{1,32}$/.test(s))||!states.has(flow.initial))throw Error('流程阶段无效');
 const initial=flow.values||{};if(Object.keys(initial).length>64||Object.entries(initial).some(([k,v])=>!key.test(k)||!Number.isSafeInteger(v)||Math.abs(v)>1000000000))throw Error('流程初始状态无效');
 const names=new Set();for(const a of flow.actions){const actionKey=a?.command+'\0'+a?.from;if(!a||!/^\/[\u4e00-\u9fffA-Za-z0-9]{1,12}$/.test(a.command)||names.has(actionKey)||!states.has(a.from)||!states.has(a.to)||!Array.isArray(a.steps)||a.steps.length>32||typeof a.reply!=='string'||a.reply.length>1000)throw Error('流程动作无效');names.add(actionKey);}
 validateFlowExtensions(flow);
 return flow;
}
export function executeFlow(game,state,command,random=Math.random){
 const flow=validateFlow(game.flow),phase=state.flowPhase||flow.initial,action=flow.actions.find(a=>a.command===command&&a.from===phase);if(!action)throw Error('当前阶段不支持此行动');
 const values={...flow.values,...state.flowValues};
 const run=steps=>{for(const step of steps){const old=values[step.field]??0;if(!Number.isSafeInteger(old))throw Error('流程存档无效');if(step.op==='branch'){run((step.compare==='gte'?old>=step.value:step.compare==='lte'?old<=step.value:old===step.value)?step.then:step.else);continue;}if(step.op==='require'){if(!(step.compare==='gte'?old>=step.value:step.compare==='lte'?old<=step.value:old===step.value))throw Error('未满足行动条件');continue;}let next;if(step.op==='calculate'){const numbers=step.fields.map(f=>values[f]??0);if(numbers.some(n=>!Number.isSafeInteger(n)))throw Error('计算字段无效');next=step.operator==='add'?numbers.reduce((a,b)=>a+b,0):step.operator==='multiply'?numbers.reduce((a,b)=>a*b,1):step.operator==='subtract'?numbers.slice(1).reduce((a,b)=>a-b,numbers[0]):step.operator==='min'?Math.min(...numbers):Math.max(...numbers);}else next=step.op==='set'?step.value:step.op==='add'?old+step.value:step.min+Math.floor(random()*(step.max-step.min+1));if(!Number.isSafeInteger(next)||Math.abs(next)>1000000000)throw Error('流程数值超限');values[step.field]=next;}};run(action.steps);
  assertGameStatBounds(game,values);const reply=action.reply.replace(/\{(v_[a-z][a-z0-9_]*)\}/g,(_,name)=>String(values[name]??0));state.flowPhase=action.to;state.flowValues=values;return reply;
}
export function flowAuthoringInstruction(){return ' 可使用通用流程包kind="flow"，支持Bot玩家状态和网页多人房间。game.json每个commands的action使用{"type":"flow"}。flow={"version":1,"initial":"start","states":["start"],"values":{"v_energy":10,"v_score":0},"actions":[{"command":"/工作","from":"start","to":"start","steps":[{"op":"require","field":"v_energy","compare":"gte","value":1},{"op":"add","field":"v_energy","value":-1},{"op":"random","field":"v_gain","min":1,"max":10},{"op":"add","field":"v_score","value":1}],"reply":"得分{v_score}，体力{v_energy}"}]}。支持require/add/set/random/calculate/branch，不运行代码，不允许任意QQ收件人、文件网络。网页多人必须声明multiplayer={"enabled":true,"maxPlayers":8,"leaderboardField":"v_score"}：共用房间与公开行动、在线数和排行，但玩家存档独立且跨房保留。单人需求可不声明multiplayer。最多32阶段/40动作/单动作32步骤/总128步骤/分支4层；共享世界战斗等超出现有多人状态协议时要制作能力草稿，不把单人存档冒充共享世界。';}
