import fs from 'node:fs';
import path from 'node:path';
import {spawn,execFileSync} from 'node:child_process';
export class ManagedSnowLuma{
 constructor({launch=spawn,inspect=execFileSync,log=()=>{}}={}){this.launch=launch;this.inspect=inspect;this.log=log;this.child=null;this.directory=null;}
 start(directory){
  if(!directory)return {started:false,reason:'请配置SnowLuma路径'};
  const dir=fs.realpathSync(directory),exe=path.join(dir,'node.exe'),entry=path.join(dir,'index.mjs');
  if(this.child){if(this.directory!==dir)throw Error('请先停用旧SnowLuma再更换路径');return {started:false,owned:true};}
  for(const file of [exe,entry])if(!fs.statSync(file).isFile())throw Error('SnowLuma缺少node.exe或index.mjs');
  const script="$ErrorActionPreference='Stop';$p=@(Get-CimInstance Win32_Process | Where-Object {$_.ExecutablePath -and $_.ExecutablePath.Equals($env:NIKO_SNOW_EXE,[StringComparison]::OrdinalIgnoreCase)});if($p.Count){'active'}else{'absent'}";
  const active=this.inspect('powershell.exe',['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],{env:{...process.env,NIKO_SNOW_EXE:exe},windowsHide:true,encoding:'utf8',timeout:10000}).trim();
  if(active==='active'){this.log('info','检测到该目录SnowLuma已运行，仅连接，不接管');return {started:false,owned:false};}
  if(active!=='absent')throw Error('SnowLuma进程检测结果无效，未重复启动');
  const child=this.launch(exe,[entry],{cwd:dir,windowsHide:true,stdio:'ignore'});this.child=child;this.directory=dir;
  child.once('error',()=>{if(this.child===child){this.child=null;this.log('error','SnowLuma后台启动失败');}});
  child.once('exit',code=>{if(this.child===child){this.child=null;this.log('warning',`SnowLuma后台已退出，退出码${code}`);}});
  this.log('info','已请求在后台启动SnowLuma，QQ登录与接口就绪状态以连接结果为准');return {started:true,owned:true};
 }
 stop(){const child=this.child;this.child=null;if(child)child.kill();}
}
