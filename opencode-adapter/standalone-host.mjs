import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {inspectWebGamePackage} from './web-game-package.mjs';
import {standaloneSDK} from './standalone-sdk.mjs';
import {gameClientKit} from './game-client-kit.mjs';
import {game3DKit} from './game-3d-kit.mjs';
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.ico':'image/x-icon','.glb':'model/gltf-binary','.gltf':'model/gltf+json','.bin':'application/octet-stream','.ogg':'audio/ogg','.mp3':'audio/mpeg','.wav':'audio/wav','.woff':'font/woff','.woff2':'font/woff2','.txt':'text/plain','.md':'text/plain'};
export class StandaloneHost{
 constructor(service){this.service=service;this.launches=new Map();}
 launch(game,session,token,origin){
  const p=game.webPackage,root=path.join(this.service.packageRoot||this.service.engine.root,'web-packages',p.hash),archive=inspectWebGamePackage(root);
  if(archive.hash!==p.hash||archive.manifest.id!==game.id)throw Error('独立游戏包完整性检查失败');
  if(JSON.stringify(archive.manifest.toolkit)!==JSON.stringify(p.toolkit))throw Error('独立游戏包工具声明不一致');
  if(archive.manifest.server&&archive.manifest.backend!=='quickjs-v1')throw Error('本包声明自定义服务端，但未选择受限quickjs-v1协议，不能按纯客户端游戏启动');
  for(const [key,item]of this.launches)if(item.expires<Date.now())this.launches.delete(key);
  for(const [key,item]of this.launches)if(item.user===session.id&&item.game===game.id)this.launches.delete(key);
  if(this.launches.size>=128)throw Error('游戏启动会话过多');
  if([...this.launches.values()].reduce((total,item)=>total+item.totalBytes,0)+archive.totalBytes>256*1024*1024)throw Error('游戏资源会话内存预算已满，请稍后重试');
  const id=crypto.randomBytes(24).toString('hex');this.launches.set(id,{game:game.id,hash:p.hash,user:session.id,token,origin,expires:Date.now()+8*3600000,totalBytes:archive.totalBytes,files:new Map(archive.files.map(f=>[f.name,f.bytes]))});
  return {url:'/standalone/'+id+'/'+archive.manifest.entry};
 }
 serve(req,res,pathname){
  const match=pathname.match(/^\/standalone\/([a-f0-9]{48})\/(.+)$/);if(!match)return false;
  const launch=this.launches.get(match[1]),service=this.service;
  if(!launch||launch.expires<Date.now()){service.reply(res,403,{error:'游戏会话过期'});return true;}
  const session=service.session(launch.token);let game;try{game=service.engine.find(launch.game);}catch{}
  if(!session||session.id!==launch.user||!game?.enabled||game.webPackage?.hash!==launch.hash||!service.sessionMemberAllowed(game.id,session.id)){service.reply(res,403,{error:'游戏授权已失效'});return true;}
  let name;try{name=decodeURIComponent(match[2]);}catch{service.reply(res,400,{error:'资源路径无效'});return true;}
  let bytes=name==='niko-sdk.js'?Buffer.from(standaloneSDK):name==='niko-kit.mjs'?Buffer.from(gameClientKit):name==='niko-3d.mjs'?Buffer.from(game3DKit):launch.files.get(name);
  if(['three.module.js','three.core.js','rapier.mjs'].includes(name)){
   const directory=path.join(this.service.vendorHome||path.resolve('runtime'),'game-vendor'),manifest=JSON.parse(fs.readFileSync(path.join(directory,'manifest.json'),'utf8')),record=manifest.files.find(item=>item.name===name);bytes=fs.readFileSync(path.join(directory,name));if(!record||crypto.createHash('sha256').update(bytes).digest('hex')!==record.sha256){service.reply(res,500,{error:'3D运行库完整性检查失败'});return true;}
  }
  if(!bytes||name==='game.web.json'||name.startsWith('server/')){service.reply(res,404,{error:'游戏资源不存在'});return true;}
  res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Security-Policy',`default-src 'none'; script-src ${launch.origin} 'unsafe-inline' 'wasm-unsafe-eval'; style-src ${launch.origin} 'unsafe-inline'; img-src ${launch.origin} data: blob:; media-src ${launch.origin} blob:; font-src ${launch.origin}; connect-src ${launch.origin}/standalone/${match[1]}/; frame-src 'none'; worker-src 'none'; form-action 'none'; base-uri 'none'; frame-ancestors 'self'; sandbox allow-scripts allow-pointer-lock`);
  if(name.endsWith('.html')){
   const script='<script src="/standalone/'+match[1]+'/niko-sdk.js"></script>',html=bytes.toString('utf8');
   bytes=Buffer.from(/<head(?:\s[^>]*)?>/i.test(html)?html.replace(/<head(?:\s[^>]*)?>/i,head=>head+script):script+html);
  }
  res.writeHead(200,{'Content-Type':name==='niko-sdk.js'?'application/javascript':name.endsWith('.wasm')?'application/wasm':mime[path.posix.extname(name).toLowerCase()]||'application/octet-stream'});res.end(bytes);return true;
 }
 save(game,user,input){
  if(!game.webPackage.toolkit.includes('save'))throw Error('本游戏未声明存档工具');
  const dir=path.join(this.service.engine.root,'standalone-saves',game.id);fs.mkdirSync(dir,{recursive:true});
  const key=crypto.createHash('sha256').update(user).digest('hex'),file=path.join(dir,key+'.json'),previous=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{version:0,data:null};
  if(input.operation==='read')return {version:previous.version,data:previous.data,authority:'client-personal'};
  if(input.operation!=='write'||typeof input.requestID!=='string'||!/^[-a-z0-9]{8,100}$/i.test(input.requestID))throw Error('存档请求无效');
  const serialized=JSON.stringify(input.data);if(serialized===undefined||Buffer.byteLength(serialized)>4096)throw Error('个人存档超过4KiB预算');
  const data=JSON.parse(serialized),hash=crypto.createHash('sha256').update(serialized).digest('hex');
  if(previous.requestID===input.requestID){if(previous.requestHash!==hash)throw Error('重复请求内容不一致');return {version:previous.version,data:previous.data,authority:'client-personal'};}
  if(input.version!==previous.version)throw Error('存档已更新，请重新读取');
  const record={version:previous.version+1,data,requestID:input.requestID,requestHash:hash};
  fs.writeFileSync(file+'.tmp',JSON.stringify(record),{mode:0o600});fs.renameSync(file+'.tmp',file);return {version:record.version,data,authority:'client-personal'};
 }
 clear(){this.launches.clear();this.service.worlds?.close();this.service.worlds=null;}
}
