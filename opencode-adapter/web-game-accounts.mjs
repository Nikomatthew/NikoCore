import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {scrypt as derive} from 'node:crypto';
import {promisify} from 'node:util';
const scrypt=promisify(derive);
export class WebGameAccounts{
 constructor(directory,{now=Date.now}={}){fs.mkdirSync(directory,{recursive:true});this.file=path.join(directory,'accounts.json');this.accounts=Object.assign(Object.create(null),fs.existsSync(this.file)?JSON.parse(fs.readFileSync(this.file,'utf8')):{});this.sessions=new Map();this.now=now;this.failures=new Map();}
 save(){fs.writeFileSync(this.file+'.tmp',JSON.stringify(this.accounts),{mode:0o600});fs.renameSync(this.file+'.tmp',this.file);}
 async create(username,password,games){if(typeof username!=='string'||!/^[-a-zA-Z0-9_]{3,32}$/.test(username)||Object.hasOwn(this.accounts,username))throw Error('账号名称无效或已存在');if(typeof password!=='string'||password.length<10||password.length>128)throw Error('密码需为10–128字符');if(!Array.isArray(games)||games.length>100||games.some(g=>typeof g!=='string'||!/^[-a-z0-9]{1,40}$/.test(g)))throw Error('游戏授权无效');const salt=crypto.randomBytes(24).toString('hex'),hash=Buffer.from(await scrypt(password,salt,64)).toString('hex');if(Object.hasOwn(this.accounts,username))throw Error('账号已存在');this.accounts[username]={id:crypto.randomUUID(),salt,hash,games:[...new Set(games)],enabled:true};try{this.save();}catch(e){delete this.accounts[username];throw e;}}
 async login(username,password){if(typeof username!=='string'||typeof password!=='string'||username.length>32||password.length>128)throw Error('账号或密码错误');const now=this.now();for(const [key,value]of this.failures)if(now-value.since>600000)this.failures.delete(key);const rate=this.failures.get(username)||{count:0,since:now};if(rate.count>=5||this.failures.size>=2000&&!this.failures.has(username))throw Error('登录尝试过多，请稍后再试');rate.count++;this.failures.set(username,rate);const account=Object.hasOwn(this.accounts,username)?this.accounts[username]:null;const actual=Buffer.from(await scrypt(password,account?.salt||'invalid-account-dummy-salt',64));if(!account?.enabled||!crypto.timingSafeEqual(actual,Buffer.from(account.hash,'hex')))throw Error('账号或密码错误');this.failures.delete(username);for(const [key,s]of this.sessions)if(s.expires<now)this.sessions.delete(key);if(this.sessions.size>=1000)throw Error('在线会话已满');const token=crypto.randomBytes(32).toString('hex'),csrf=crypto.randomBytes(24).toString('hex');this.sessions.set(token,{username,csrf,expires:now+8*3600000});return {token,csrf};}
 get(token){const session=this.sessions.get(token);if(!session||session.expires<this.now()){this.sessions.delete(token);return null;}const account=this.accounts[session.username];if(!account?.enabled)return null;return {...session,id:account.id,games:account.games};}
 logout(token){this.sessions.delete(token);}
 list(){return Object.entries(this.accounts).map(([username,{id,games,enabled}])=>({username,id,games,enabled}));}
 disable(username){if(!Object.hasOwn(this.accounts,username))throw Error('账号不存在');this.accounts[username].enabled=false;this.save();for(const [key,s]of this.sessions)if(s.username===username)this.sessions.delete(key);}
}
