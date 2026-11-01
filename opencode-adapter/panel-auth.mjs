import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { promisify } from 'node:util';

const derive=promisify(crypto.scrypt);
export class PanelAuth {
  constructor(directory,now=Date.now){this.file=path.join(directory,'panel-auth.json');this.now=now;this.sessions=new Map();this.attempts=[];this.pending=false;this.temporary=null;}
  issueTemporary(home){
    if(!this.configured())throw Error('请先设置控制台密码');const file=path.join(home,'登录凭证.txt');
    if(fs.existsSync(file))throw Error('根目录已存在登录凭证.txt，请先移走旧文件');
    const value=crypto.randomBytes(24).toString('hex');fs.writeFileSync(file,value,{flag:'wx',mode:0o600});this.temporary={file,hash:crypto.createHash('sha256').update(value).digest(),expires:this.now()+600000};return {expiresIn:600};
  }
  loginTemporary(value){
    this.attempts=this.attempts.filter(at=>this.now()-at<60000);if(this.attempts.length>=5)throw Error('尝试次数过多，请一分钟后重试');this.attempts.push(this.now());
    const item=this.temporary;if(!item||item.expires<=this.now())throw Error('临时登录凭证不存在或已过期');
    if(typeof value!=='string'||value.length>256)throw Error('临时登录凭证无效');const hash=crypto.createHash('sha256').update(value.trim()).digest();if(!crypto.timingSafeEqual(hash,item.hash))throw Error('临时登录凭证无效');
    fs.unlinkSync(item.file);this.temporary=null;this.attempts=[];if(this.sessions.size>=32)this.sessions.delete(this.sessions.keys().next().value);const token=crypto.randomBytes(32).toString('hex');this.sessions.set(token,this.now()+8*3600000);return token;
  }
  async changePassword(current,password,confirmation){
    const token=await this.login(current);this.logout(token);if(typeof password!=='string'||[...password].length<5||Buffer.byteLength(password)>1024||password!==confirmation)throw Error('新密码至少5位且两次输入必须一致');
    const salt=crypto.randomBytes(32).toString('hex'),hash=Buffer.from(await derive(password,salt,64)).toString('hex');fs.writeFileSync(this.file+'.tmp',JSON.stringify({version:1,salt,hash}),{mode:0o600});fs.renameSync(this.file+'.tmp',this.file);this.sessions.clear();if(this.temporary){fs.unlinkSync(this.temporary.file);this.temporary=null;}
  }
  configured(){return fs.existsSync(this.file);}
  async login(password,confirmation,setup=false){
    this.attempts=this.attempts.filter(at=>this.now()-at<60000);
    if(this.attempts.length>=5)throw Error('尝试次数过多，请一分钟后重试');
    if(this.pending)throw Error('正在验证，请稍后重试');
    this.attempts.push(this.now());
    if(typeof password!=='string'||[...password].length<5||Buffer.byteLength(password)>1024)throw Error('密码至少5位，且不能超过1024字节');
    this.pending=true;
    try{
      if(setup){
        if(this.configured())throw Error('密码已设置，请登录');
        if(password!==confirmation)throw Error('两次输入的密码不一致');
        const salt=crypto.randomBytes(32).toString('hex');
        const hash=Buffer.from(await derive(password,salt,64)).toString('hex');
        fs.mkdirSync(path.dirname(this.file),{recursive:true});
        fs.writeFileSync(this.file,JSON.stringify({version:1,salt,hash}),{mode:0o600,flag:'wx'});
      }else{
        if(!this.configured())throw Error('请先设置控制台密码');
        const value=JSON.parse(fs.readFileSync(this.file,'utf8'));
        const actual=Buffer.from(await derive(password,value.salt,64)),expected=Buffer.from(value.hash,'hex');
        if(expected.length!==actual.length||!crypto.timingSafeEqual(expected,actual))throw Error('密码错误');
      }
      for(const [key,expiry] of this.sessions)if(expiry<this.now())this.sessions.delete(key);
      if(this.sessions.size>=32)this.sessions.delete(this.sessions.keys().next().value);
      this.attempts=[];const token=crypto.randomBytes(32).toString('hex');this.sessions.set(token,this.now()+8*3600000);return token;
    }finally{this.pending=false;}
  }
  authorized(header){const token=String(header||'').replace(/^Bearer /,'');const expires=this.sessions.get(token);if(!expires||expires<=this.now()){this.sessions.delete(token);return false;}return true;}
  logout(token){if(typeof token==='string')this.sessions.delete(token);}
}
