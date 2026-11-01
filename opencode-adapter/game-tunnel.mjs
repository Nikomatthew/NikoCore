import path from 'node:path';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {detectCloudflared} from './cloudflared-runtime.mjs';
export class GameTunnel{
  constructor(home,{launch=spawn,settings=()=>({})}={}){this.home=home;this.settings=settings;this.executable=path.join(home,'runtime','cloudflared','cloudflared.exe');this.launch=launch;this.child=null;this.url=null;this.status='未启动';}
 start(address){
   if(this.child)throw Error('游戏隧道已在运行');const url=new URL(address);if(url.protocol!=='http:'||url.hostname!=='127.0.0.1'||!url.port||url.pathname!=='/'||url.username||url.password||url.search||url.hash)throw Error('只允许独立本机游戏端口');
   this.executable=detectCloudflared(this.home,this.settings())||this.executable;
  const stat=fs.lstatSync(this.executable);if(!stat.isFile()||stat.isSymbolicLink()||fs.realpathSync(this.executable)!==path.resolve(this.executable))throw Error('cloudflared入口无效');
   const env={...process.env};delete env.TUNNEL_TOKEN;delete env.TUNNEL_TOKEN_FILE;
   const child=this.launch(this.executable,['tunnel','--protocol','http2','--no-autoupdate','--url',url.origin],{windowsHide:true,stdio:['ignore','pipe','pipe'],env});this.child=child;this.url=null;this.status='正在创建临时链接';let buffer='';
  const read=chunk=>{buffer=(buffer+chunk.toString()).slice(-16000);const matches=[...buffer.matchAll(/https:\/\/([a-z0-9]+(?:-[a-z0-9]+)*\.trycloudflare\.com)\b/g)];if(matches.length){this.url='https://'+matches.at(-1)[1];this.status='临时链接已获取，登录与访问仍受游戏权限限制';}};
  child.stdout.on('data',read);child.stderr.on('data',read);child.once('error',()=>{if(this.child===child){this.status='隧道启动失败';this.child=null;this.url=null;}});child.once('exit',()=>{if(this.child===child){this.status='隧道已退出';this.child=null;this.url=null;}});
  return this.view();
 }
 view(){return {running:Boolean(this.child),url:this.url,status:this.status,installed:fs.existsSync(this.executable)};}
 stop(){const child=this.child;this.child=null;this.url=null;this.status='已停止';child?.kill();}
}
