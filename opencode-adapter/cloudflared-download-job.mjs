import fs from 'node:fs';
import path from 'node:path';
import {CloudflaredRuntime} from './cloudflared-runtime.mjs';
import {DownloadProgress} from './download-progress.mjs';
export async function runCloudflaredDownload(home,root){
 if(!home||!root||!path.isAbsolute(home)||!path.isAbsolute(root))throw Error('下载运行目录无效');
 const viewer=new DownloadProgress(path.join(path.dirname(root),'log','downloads'),{onCancel:()=>runtime.cancel()});
 const runtime=new CloudflaredRuntime(home,{onProgress:p=>viewer.update(p)});
 const result=await runtime.download();
 const file=path.join(root,'state','settings.json'),settings=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{};
 settings.cloudflaredExecutable=result.path;settings.cloudflaredAskOnStart=false;fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file+'.cloudflare.tmp',JSON.stringify(settings,null,2),{mode:0o600});fs.renameSync(file+'.cloudflare.tmp',file);return result;
}
