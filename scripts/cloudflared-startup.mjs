import fs from 'node:fs';
import path from 'node:path';
import {execFileSync,spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {isSea} from 'node:sea';
import {CloudflaredRuntime,detectCloudflared} from '../opencode-adapter/cloudflared-runtime.mjs';
import {DownloadProgress} from '../opencode-adapter/download-progress.mjs';
export async function prepareCloudflaredStartup(home,root,{ask,download,launch=spawn}={}){
 const file=path.join(root,'state','settings.json');let settings=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{};
 const saveDisabled=()=>{settings=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{};if(settings.cloudflaredAskOnStart===false)return;settings.cloudflaredAskOnStart=false;fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file+'.cloudflare.tmp',JSON.stringify(settings,null,2),{mode:0o600});fs.renameSync(file+'.cloudflare.tmp',file);};
 if(detectCloudflared(home,settings)){saveDisabled();return {installed:true};}
 if(settings.cloudflaredAskOnStart===false||settings.gameNetworkMode==='custom')return {skipped:true};
 const confirm=ask||(()=>{const script="Add-Type -AssemblyName System.Windows.Forms;$r=[System.Windows.Forms.MessageBox]::Show('未检测到 Cloudflare Tunnel，是否下载到 runtime？选择否将直接进入控制台。','NikoLink',[System.Windows.Forms.MessageBoxButtons]::YesNo,[System.Windows.Forms.MessageBoxIcon]::Question);if($r -eq [System.Windows.Forms.DialogResult]::Yes){exit 0}else{exit 2}";try{execFileSync('powershell.exe',['-NoProfile','-STA','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],{windowsHide:true,stdio:'ignore'});return true;}catch{return false;}});
 if(!await confirm())return {declined:true};
 if(!download){const args=isSea()?['--cloudflared-download',root]:[fileURLToPath(new URL('./cloudflared-download-worker.mjs',import.meta.url)),home,root];const child=launch(process.execPath,args,{windowsHide:true,detached:true,stdio:'ignore'});child.once('error',()=>{});child.unref();return {started:true,background:true};}
 try{const viewer=new DownloadProgress(path.join(path.dirname(root),'log','downloads')),runtime=new CloudflaredRuntime(home,{onProgress:p=>viewer.update(p)});const result=await (download?download():runtime.download());if(result.path&&fs.existsSync(result.path)){settings=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{};settings.cloudflaredExecutable=result.path;settings.cloudflaredAskOnStart=false;fs.writeFileSync(file+'.cloudflare.tmp',JSON.stringify(settings,null,2),{mode:0o600});fs.renameSync(file+'.cloudflare.tmp',file);}else if(detectCloudflared(home,settings))saveDisabled();return result;}catch{return {failed:true};}
}
