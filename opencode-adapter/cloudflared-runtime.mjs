import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {githubDownloadURL} from './github-download.mjs';
export function detectCloudflared(home,settings={}){
 const selected=settings.cloudflaredExecutable||path.join(home,'runtime','cloudflared','cloudflared.exe');
 try{const stat=fs.lstatSync(selected);if(stat.isFile()&&!stat.isSymbolicLink()&&fs.realpathSync(selected)===path.resolve(selected))return selected;}catch{}
 return null;
}
export class CloudflaredRuntime{
  constructor(home,{request=fetch,arch=process.arch,onProgress=()=>{}}={}){this.home=home;this.request=request;this.arch=arch;this.onProgress=onProgress;this.pending=null;this.progress=null;}
  report(stage,message,received=0,total=0){this.progress={stage,message,received,total};try{this.onProgress(this.progress);}catch{}}
  cancel(){this.controller?.abort(Error('下载已取消'));}
  download(){if(this.pending)return this.pending;this.controller=new AbortController();this.report('metadata','Fetching official Cloudflare release information...');this.pending=this.install().then(result=>{this.report(result.existing?'existing':'complete',result.existing?'Cloudflare Tunnel is already installed.':'Download verified and saved. Cloudflare Tunnel is ready.');return result;},error=>{this.report(this.controller.signal.aborted?'cancelled':'failed',this.controller.signal.aborted?'Download cancelled.':'Download failed: '+error.message);throw error;}).finally(()=>{this.pending=null;});return this.pending;}
 async install(){
 const existing=detectCloudflared(this.home);if(existing)return {path:existing,existing:true};
 const assetName=({x64:'cloudflared-windows-amd64.exe',arm64:'cloudflared-windows-arm64.exe'})[this.arch];if(!assetName)throw Error('当前平台架构暂不支持自动下载，请手动选择');
  const signal=this.controller?.signal||new AbortController().signal;signal.throwIfAborted();
  const response=await this.request(githubDownloadURL('https://api.github.com/repos/cloudflare/cloudflared/releases/latest'),{headers:{Accept:'application/vnd.github+json'},signal:AbortSignal.any([signal,AbortSignal.timeout(20000)])});if(!response.ok)throw Error('无法通过GitHub代理获取Cloudflare发布信息');const release=await response.json(),asset=release.assets?.find(a=>a.name===assetName);
 if(!asset||!/^sha256:[a-f0-9]{64}$/i.test(asset.digest||'')||!Number.isSafeInteger(asset.size)||asset.size<1024||asset.size>100*1048576)throw Error('官方安装文件或SHA256信息缺失，请手动选择');
 const url=new URL(asset.browser_download_url);if(url.origin!=='https://github.com'||!url.pathname.startsWith('/cloudflare/cloudflared/releases/download/')||url.username||url.password||url.search||url.hash)throw Error('安装文件来源无效');
  this.report('downloading','Downloading '+assetName+' ...',0,asset.size);
   const download=await this.request(githubDownloadURL(url.href),{signal:AbortSignal.any([signal,AbortSignal.timeout(180000)])});if(!download.ok)throw Error('cloudflared代理下载失败');const chunks=[];let size=0;for await(const part of download.body){signal.throwIfAborted();size+=part.length;if(size>asset.size||size>100*1048576)throw Error('安装文件超过预期大小');chunks.push(Buffer.from(part));this.report('downloading','Downloading via gh-proxy.com: '+assetName+' ...',size,asset.size);}signal.throwIfAborted();this.report('verifying','Verifying file size and SHA256...',size,asset.size);signal.throwIfAborted();const bytes=Buffer.concat(chunks),hash=crypto.createHash('sha256').update(bytes).digest('hex');
 if(size!==asset.size||hash!==asset.digest.slice(7).toLowerCase()||bytes.toString('ascii',0,2)!=='MZ')throw Error('cloudflared安装文件完整性校验失败');
 const directory=path.join(this.home,'runtime','cloudflared');fs.mkdirSync(directory,{recursive:true});if(fs.realpathSync(directory)!==path.resolve(directory))throw Error('安装目录不允许链接');const file=path.join(directory,'cloudflared.exe');fs.writeFileSync(file,bytes,{flag:'wx'});fs.writeFileSync(path.join(directory,'download.json'),JSON.stringify({version:release.tag_name,url:url.href,sha256:hash,at:new Date().toISOString()}),{mode:0o600});return {path:file,version:release.tag_name,sha256:hash};
 }
}
