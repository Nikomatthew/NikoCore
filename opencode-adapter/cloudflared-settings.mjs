import path from 'node:path';
import {detectCloudflared} from './cloudflared-runtime.mjs';
export function cloudflaredSettings(input,old,home){
 const selected=input.cloudflaredExecutable??old.cloudflaredExecutable??'';
 if(typeof selected!=='string'||selected.includes('\0')||selected.length>2048||selected&&!path.isAbsolute(selected))throw Error('Cloudflare路径无效');
 const ask=input.cloudflaredAskOnStart??old.cloudflaredAskOnStart??true;if(typeof ask!=='boolean')throw Error('Cloudflare启动询问开关无效');
 return {cloudflaredExecutable:selected.trim(),cloudflaredAskOnStart:detectCloudflared(home,{cloudflaredExecutable:selected.trim()})?false:ask};
}
