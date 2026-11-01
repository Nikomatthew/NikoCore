export class AutoVoice{
 constructor(tts,store,{judge,send,random=Math.random,now=Date.now}={}){Object.assign(this,{tts,store,judge,send,random,now});this.last=0;this.busy=false;}
 async deliver(route,text,allowed){
  const c=this.store.value;
  if(!c.ttsEnabled||!c.ttsAutoReply||!this.tts.configured()||this.busy||this.now()-this.last<60000||!text.trim()||text.length>400||/https?:\/\/|```|\b(?:api[_-]?key|token|password)\b|\d{5,}/i.test(text)||/只[用发要].*文字|不要.*语音|别.*语音/.test(route.text||''))return {sent:false};
  if(!allowed())return {cancelled:true};
  const revision=c.revision;this.busy=true;
  try{
   if(c.ttsAutoMode==='smart'){try{if(!this.judge||!await this.judge(route,text))return {sent:false};}catch{return {sent:false};}}
   else if(this.random()>=(c.ttsAutoProbability??.15))return {sent:false};
   if(!allowed()||this.store.value.revision!==revision)return {cancelled:true};
   this.last=this.now();let bytes;
   try{bytes=await this.tts.synthesize(text);}catch{return {sent:false,generationFailed:true};}
   if(!allowed()||this.store.value.revision!==revision||!this.store.value.ttsAutoReply)return {cancelled:true};
   try{const result=await this.send(route,bytes);return {sent:true,result};}catch{throw Error('语音投递未确认，未自动补发文字或重试，以免重复');}
  }finally{this.busy=false;}
 }
}
