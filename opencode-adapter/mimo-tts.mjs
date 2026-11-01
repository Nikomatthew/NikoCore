import fs from 'node:fs';
import path from 'node:path';
export const mimoVoices=['mimo_default','冰糖','茉莉','苏打','白桦','Mia','Chloe','Milo','Dean'];
export function ttsSettings(input,old={}){
 const next={ttsEnabled:old.ttsEnabled===true,ttsVoice:old.ttsVoice||'mimo_default'};
 Object.assign(next,{ttsAutoReply:old.ttsAutoReply===true,ttsAutoMode:old.ttsAutoMode||'probability',ttsAutoProbability:old.ttsAutoProbability??.15});
 if(Object.hasOwn(input,'ttsAutoReply')){if(typeof input.ttsAutoReply!=='boolean')throw Error('自主语音开关无效');next.ttsAutoReply=input.ttsAutoReply;}
 if(Object.hasOwn(input,'ttsAutoMode')){if(!['probability','smart'].includes(input.ttsAutoMode))throw Error('自主语音策略无效');next.ttsAutoMode=input.ttsAutoMode;}
 if(Object.hasOwn(input,'ttsAutoProbability')){const value=Number(input.ttsAutoProbability);if(!Number.isFinite(value)||value<0||value>1)throw Error('语音概率需为0–1');next.ttsAutoProbability=value;}
 if(Object.hasOwn(input,'ttsEnabled')){if(typeof input.ttsEnabled!=='boolean')throw Error('语音开关无效');next.ttsEnabled=input.ttsEnabled;}
 if(Object.hasOwn(input,'ttsVoice')){if(!mimoVoices.includes(input.ttsVoice))throw Error('MiMo音色无效');next.ttsVoice=input.ttsVoice;}
 return next;
}
export class MiMoTTS{
 constructor(root,store,call,{fetcher=fetch}={}){Object.assign(this,{store,call,fetcher});this.file=path.join(root,'state','mimo-tts-secret.json');this.busy=false;this.seen=new Map();}
 configured(){return fs.existsSync(this.file);}
 setKey(key){if(typeof key!=='string'||key.length<10||key.length>512||/[\s\x00-\x1f]/.test(key))throw Error('MiMo API Key格式无效');fs.writeFileSync(this.file,JSON.stringify({key}),{mode:0o600});}
 async synthesize(text){
  if(!this.store.value.ttsEnabled)throw Error('语音生成未启用');if(typeof text!=='string'||!text.trim()||text.length>1000)throw Error('语音文本需为1–1000字');if(!this.configured())throw Error('请先配置MiMo TTS密钥');
  const key=JSON.parse(fs.readFileSync(this.file,'utf8')).key,voice=this.store.value.ttsVoice||'mimo_default';if(!mimoVoices.includes(voice))throw Error('音色无效');
  let response;try{response=await this.fetcher('https://api.xiaomimimo.com/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','api-key':key},body:JSON.stringify({model:'mimo-v2.5-tts',messages:[{role:'assistant',content:text.trim()}],audio:{format:'wav',voice},stream:false}),signal:AbortSignal.timeout(90000),redirect:'error'});}catch{throw Error('MiMo TTS连接失败或超时，未自动重试');}
  if(!response.ok)throw Error('MiMo TTS请求失败 HTTP '+response.status);
  let raw='';for await(const chunk of response.body){raw+=Buffer.from(chunk).toString('utf8');if(Buffer.byteLength(raw)>16*1048576)throw Error('语音响应超过预算');}
  let data;try{data=JSON.parse(raw).choices?.[0]?.message?.audio?.data;}catch{throw Error('MiMo TTS响应格式无效');}
  if(typeof data!=='string'||!data.length||data.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/.test(data))throw Error('MiMo TTS未返回有效音频');
  const bytes=Buffer.from(data,'base64');if(bytes.length<44||bytes.length>10*1048576||bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WAVE')throw Error('语音不是有效WAV或超过预算');
  if(bytes.readUInt32LE(4)+8!==bytes.length)throw Error('WAV长度校验失败');
  let format=false,audio=false;for(let offset=12;offset+8<=bytes.length;){const name=bytes.toString('ascii',offset,offset+4),size=bytes.readUInt32LE(offset+4),end=offset+8+size;if(end>bytes.length)throw Error('WAV数据不完整');if(name==='fmt '){if(size<16||![1,3].includes(bytes.readUInt16LE(offset+8))||bytes.readUInt16LE(offset+10)<1||bytes.readUInt32LE(offset+12)<8000)throw Error('WAV格式不支持');format=true;}if(name==='data'&&size>0)audio=true;offset=end+(size%2);}if(!format||!audio)throw Error('WAV缺少格式或音频数据');
  return bytes;
 }
 async receive(event){
  const text=(event.message||[]).filter(p=>p.type==='text').map(p=>p.data?.text||'').join('').trim();if(!/^\/语音(?:\s|$)/.test(text))return false;
  const c=this.store.value,user=String(event.user_id),group=event.message_type==='group';if(event.post_type!=='message'||!['group','private'].includes(event.message_type)||user!==c.ownerQQ||c.mode!=='reply'||group&&(!c.groupEnabled||!c.groups.includes(String(event.group_id))||(c.replyBlacklist||[]).includes(user)))return true;
  if(event.message_id==null)return true;const id=String(event.self_id)+':'+String(event.message_id);if(this.seen.has(id))return true;this.seen.set(id,Date.now());if(this.seen.size>1000)this.seen.delete(this.seen.keys().next().value);
  const target=group?String(event.group_id):user,send=message=>this.call(group?'send_group_msg':'send_private_msg',{[group?'group_id':'user_id']:Number(target),message});
  if(this.busy){await send([{type:'text',data:{text:'上一段语音仍在生成，请稍后再试'}}]);return true;}
  const revision=c.revision;this.busy=true;try{const bytes=await this.synthesize(text.replace(/^\/语音\s*/,''));const latest=this.store.value;if(latest.revision!==revision||latest.mode!=='reply'||latest.ownerQQ!==user||!latest.ttsEnabled||group&&(!latest.groupEnabled||!latest.groups.includes(target)||(latest.replyBlacklist||[]).includes(user)))return true;await send([{type:'record',data:{file:'base64://'+bytes.toString('base64')}}]);}catch(error){if(this.store.value.revision===revision)await send([{type:'text',data:{text:error.message}}]);}finally{this.busy=false;}return true;
 }
}
