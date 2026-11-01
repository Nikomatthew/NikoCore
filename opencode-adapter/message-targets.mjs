import { parseDecision } from './social.mjs';

export function messageTargets(items){return items.flatMap((item,index)=>(item.sources||[item]).map((r,n)=>({ref:`u${index}m${n}`,index,user:item.user,text:r.text,messageID:r.messageID,images:r.images||[],direct:Boolean(r.direct),replyToOther:Boolean(r.replyToOther),quotedContext:r.quotedContext||null})));}
export function parseTargetAnswers(raw,items,max=5){
  const value=JSON.parse(String(raw).trim().replace(/^```json\s*/i,'').replace(/\s*```$/,''));
  if(!value||Object.keys(value).some(k=>k!=='answers')||!Array.isArray(value.answers)||value.answers.length>max)throw new Error('消息级回答结构无效');
  const targets=messageTargets(items),seen=new Set(),budgets=new Map();
  return value.answers.map(a=>{
    if(Object.keys(a).some(k=>!['replyTo','index','action','messages'].includes(k)))throw new Error('回答包含非法字段');
    let target=null,index=a.index;
    if(a.replyTo!=null){target=targets.find(t=>t.ref===a.replyTo);if(!target||index!=null&&index!==target.index)throw new Error('引用目标无效');index=target.index;}
    if(!Number.isInteger(index)||!items[index])throw new Error('回答对象无效');
    const key=target?.ref||`user${index}`;if(seen.has(key))throw new Error('重复回答目标');seen.add(key);
    const decision=parseDecision(JSON.stringify({action:a.action,messages:a.messages}));
    const budget=budgets.get(index)||{count:0,chars:0};budget.count+=decision.messages.length;budget.chars+=Array.from(decision.text).length;if(budget.count>6||budget.chars>1800)throw new Error('单用户回答超过上限');budgets.set(index,budget);
    return {index,decision,messageID:target?.messageID??null,quotePending:Boolean(target?.messageID),targetOrder:target?targets.indexOf(target):index*30};
  }).sort((a,b)=>a.index-b.index||a.targetOrder-b.targetOrder);
}
