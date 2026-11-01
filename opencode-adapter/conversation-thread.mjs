export function conversationSignal(r,channel,now=Date.now(),windowSec=120,joiningSec=windowSec){
  const quoted=r.replyID?(channel.messages||[]).find(m=>m.messageID===r.replyID):null;
  const botQuote=Boolean(r.replyID&&((channel.botMessageIDs||[]).includes(r.replyID)||quoted?.self));
  const replyToOther=Boolean(quoted&&!quoted.self);
  const direct=Boolean(r.direct||botQuote);
  const signal=threadSignal({...r,direct,replyToOther},channel,now,windowSec);
  if(now-(channel.thread?.lastBotAt||0)>joiningSec*1000)signal.joining=false;
  return {...signal,direct,replyToOther,replyUnknown:Boolean(r.replyID&&!botQuote&&!quoted),quotedContext:quoted?{user:quoted.user,self:quoted.self,text:quoted.text.slice(0,160)}:null};
}
export function threadSignal(r, channel, now = Date.now(), windowSec = 90) {
  if(!r.group||r.direct)return {followup:false,joining:false};
  const thread=channel.thread;
  if(!thread||now-thread.lastBotAt>windowSec*1000||now<(channel.closedUntil||0)||r.addressedOther||r.replyToOther)return {followup:false,joining:false};
  const followup=now-(thread.members?.[r.user]||0)<=windowSec*1000;
  const joining=!followup&&now-thread.lastBotAt<=windowSec*1000;
  return {followup,joining};
}
export function touchThread(channel,r,now=Date.now()) {
  if(!r.group||!/^\d{5,15}$/.test(r.user))return;
  const old=channel.thread||{};
  const members=Object.fromEntries(Object.entries(old.members||{}).filter(([,at])=>now-at<=5*60000));
  members[r.user]=now;channel.thread={lastBotAt:now,members};
}
