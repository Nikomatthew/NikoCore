export function groupAdmission(r,c,channel,now=Date.now(),random=Math.random){
  if(c.mode!=='reply')return false;
  if(r.direct)return true;
  if(r.addressedOther||r.replyToOther)return false;
  if(c.groupChatMode==='lively')return Boolean(r.followup||r.joining||!c.groupMentionOnly);
  if(c.groupChatMode==='peak'){if(r.followup)return true;if(c.groupMentionOnly||now-(channel.lastDecisionAt||0)<30000)return false;return random()<0.15;}
  if(now-(channel.lastNonDirectSentAt||0)<(c.groupNonDirectCooldownSec??60)*1000)return false;
  if(r.followup||r.joining)return true;
  if(c.groupMentionOnly)return false;
  if(groupLively(channel,now)&&now-(channel.lastNonDirectSentAt||0)>=(c.groupInterjectSec??90)*1000&&now-(channel.lastQuietAttemptAt||0)>=30000)return true;
  if(now-Math.max(channel.lastQuietAttemptAt||0,channel.lastDecisionAt||0)<(c.groupQuietCooldownSec??180)*1000)return false;
  return random()<(c.groupQuietProbability??0.05);
}
export function groupLively(channel,now=Date.now()){
  const recent=(channel.messages||[]).filter(m=>!m.self&&now-(m.at||0)<120000);
  return recent.length>=3&&new Set(recent.map(m=>m.user)).size>=2;
}
export function collectionDue(items,nextAt=0,mode='paced'){
  if(!items.length)return nextAt;
  const first=items[0].at,last=items.at(-1);
  const [firstWait,supplement,maxWait,unfinishedWait]=mode==='lively'?[12000,6000,30000,12000]:mode==='peak'?[8000,4000,20000,8000]:[12000,6000,30000,12000];
  const unfinished=/(?:我分几条发|等一下|等我说完|还有|先别回|没说完)[\s，。！？]*$/.test(last.text||'');
  const finished=/(?:说完了|发完了|可以回答了)[\s，。！？]*$/.test(last.text||'');
  const wait=mode==='peak'?supplement:firstWait;
  return Math.max(nextAt,Math.min(first+maxWait,Math.max(first+firstWait,last.at+(finished?0:unfinished?unfinishedWait:wait))));
}
