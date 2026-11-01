import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {detectCloudflared} from './cloudflared-runtime.mjs';
export class NamedGameTunnel{
 constructor(home,file,{launch=spawn,settings=()=>({})}={}){Object.assign(this,{home,file,launch,settings});this.child=null;this.ready=false;}
 configured(){return fs.existsSync(this.file);}
 setToken(token){if(this.child)throw Error('请先停止所有Cloudflare游戏后台再更换Token');if(typeof token!=='string'||token.length<20||token.length>8192||/\s/.test(token))throw Error('隧道Token格式无效');fs.mkdirSync(path.dirname(this.file),{recursive:true});fs.writeFileSync(this.file,JSON.stringify({token}),{mode:0o600});}
 async start(){if(this.starting)return this.starting;this.starting=this.connect();try{return await this.starting;}finally{this.starting=null;}}
 async connect(){
  if(this.child){if(!this.ready)throw Error('Cloudflare连接器正在连接');return;}
  if(!this.configured())throw Error('请先保存Cloudflare隧道Token');const exe=detectCloudflared(this.home,this.settings());if(!exe)throw Error('未检测到cloudflared');
  const token=JSON.parse(fs.readFileSync(this.file,'utf8')).token;
  const child=this.launch(exe,['tunnel','--protocol','http2','--no-autoupdate','run'],{windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,TUNNEL_TOKEN:token}});this.child=child;this.ready=false;
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.stop();reject(Error('Cloudflare连接器就绪超时'));},20000);let settled=false;
   const fail=()=>{if(this.child===child){this.child=null;this.ready=false;}if(!settled){settled=true;clearTimeout(timer);reject(Error('Cloudflare连接器未确认就绪'));}};
   const read=chunk=>{if(String(chunk).includes('Registered tunnel connection')&&!settled){settled=true;clearTimeout(timer);this.ready=true;resolve();}};
   child.stdout.on('data',read);child.stderr.on('data',read);child.once('error',fail);child.once('exit',fail);
  });
 }
 stop(){const child=this.child;this.child=null;this.ready=false;child?.kill();}
 view(){return {running:Boolean(this.child),ready:this.ready,configured:this.configured(),publicReachabilityVerified:false};}
}
