import crypto from 'node:crypto';
export function webLoginSettings(input={},old={}){
 const mode=input.webGameLoginMode??old.webGameLoginMode??'password';if(!['password','qq','both'].includes(mode))throw Error('网页登录方式无效');
 const list=input.webGameQQAllowlist??old.webGameQQAllowlist??[];if(!Array.isArray(list)||list.length>1000||list.some(id=>typeof id!=='string'||!/^\d{5,15}$/.test(id)))throw Error('网页QQ验证名单无效');
 return {webGameLoginMode:mode,webGameQQAllowlist:[...new Set(list)]};
}
export class QQGameLogin{
 constructor(config,{now=Date.now}={}){this.config=config;this.now=now;this.attempts=new Map();this.rates=new Map();this.sessions=new Map();}
 enabled(){const c=this.config();return c.gamesEnabled&&['qq','both'].includes(c.webGameLoginMode);}
 allowed(qq){const c=this.config();return this.enabled()&&(!(c.webGameQQAllowlist||[]).length||c.webGameQQAllowlist.includes(qq));}
 prune(){const now=this.now();for(const [id,a]of this.attempts)if(a.expires<=now)this.attempts.delete(id);for(const [id,s]of this.sessions)if(s.expires<=now)this.sessions.delete(id);for(const [id,r]of this.rates)if(now-r.at>60000)this.rates.delete(id);}
 begin(){this.prune();if(!this.enabled())throw Error('QQ验证未开启');if(this.attempts.size>=200)throw Error('登录请求过多');const ticket=crypto.randomBytes(32).toString('hex');let code;do{code=crypto.randomBytes(6).toString('hex').toUpperCase();}while([...this.attempts.values()].some(a=>a.code===code));this.attempts.set(ticket,{code,expires:this.now()+120000,qq:null});return {ticket,code,expiresIn:120};}
 verify(qq,code){this.prune();if(!/^\d{5,15}$/.test(qq)||!this.allowed(qq))throw Error('当前QQ未获准网页登录');const rate=this.rates.get(qq)||{count:0,at:this.now()};if(++rate.count>5)throw Error('验证过于频繁');this.rates.set(qq,rate);const attempt=[...this.attempts.values()].find(a=>a.code===code&&!a.qq);if(!attempt)throw Error('验证码无效或已使用');attempt.qq=qq;return true;}
 poll(ticket){this.prune();const a=this.attempts.get(ticket);if(!a||!this.enabled())throw Error('登录请求已失效');if(!a.qq)return {ready:false};if(!this.allowed(a.qq))throw Error('QQ权限已撤销');return {ready:true,qq:a.qq.slice(0,2)+'***'+a.qq.slice(-2)};}
 complete(ticket){this.prune();const a=this.attempts.get(ticket);if(!a?.qq||!this.allowed(a.qq))throw Error('登录未验证或权限失效');if(this.sessions.size>=1000)throw Error('在线会话已满');this.attempts.delete(ticket);const token=crypto.randomBytes(32).toString('hex'),csrf=crypto.randomBytes(24).toString('hex');this.sessions.set(token,{id:'qq:'+a.qq,qq:a.qq,csrf,expires:this.now()+8*3600000});return {token,csrf};}
 get(token){this.prune();const s=this.sessions.get(token);return s&&this.allowed(s.qq)?{...s}:null;}
 logout(token){this.sessions.delete(token);}
 async receive(event,send){const parts=Array.isArray(event.message)?event.message:[],text=parts.filter(p=>p.type==='text').map(p=>p.data?.text||'').join('').trim();if(!/^\/网页登录(?:\s|$)/.test(text))return false;
  if(event.post_type!=='message'||event.message_type!=='private'||String(event.user_id)===String(event.self_id)||parts.some(p=>p.type!=='text'))return true;
  let reply;try{const match=text.match(/^\/网页登录\s+([A-Fa-f0-9]{12})$/);if(!match)throw Error('用法：/网页登录 网页显示的验证码');this.verify(String(event.user_id),match[1].toUpperCase());reply='身份已验证，请回到发起登录的网页核对QQ并确认登录。不要为他人提供的验证码验证。';}catch(error){reply=error.message;}
  await send({group:false,target:String(event.user_id)},reply,'text');return true;
 }
}
