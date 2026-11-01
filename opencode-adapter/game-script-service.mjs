import {Worker} from 'node:worker_threads';
import fs from 'node:fs';
import path from 'node:path';
import {isSea} from 'node:sea';
export function scriptWorkerEntry(){
 if(!isSea()&&process.env.NIKOLINK_PACKAGED_WORKER!=='1')return new URL('./game-script-worker.mjs',import.meta.url);
 const home=process.env.NIKOLINK_HOME,installed=home&&path.join(home,'runtime','game-worker','script-worker.cjs');
 if(installed&&fs.existsSync(installed))return installed;
 if(isSea()||process.env.NIKOLINK_PACKAGED_WORKER==='1')throw Error('受限后端辅助入口缺失，请修复安装');
 return new URL('./game-script-worker.mjs',import.meta.url);
}
export class GameScriptService{
 static async create(source){
  const service=new GameScriptService();service.pending=new Map();service.serial=0;service.closed=false;
    const worker=new Worker(scriptWorkerEntry(),{execArgv:[],workerData:{source},resourceLimits:{maxOldGenerationSizeMb:64,maxYoungGenerationSizeMb:16,stackSizeMb:2}});service.worker=worker;
  const ready=new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>{service.close();reject(Error('后端初始化超时'));},10000);
   worker.on('message',message=>{if(message.ready){clearTimeout(timer);resolve();}else if(!message.id&&message.error){clearTimeout(timer);reject(Error(message.error));}else{const pending=service.pending.get(message.id);if(pending){clearTimeout(pending.timer);service.pending.delete(message.id);message.error?pending.reject(Error(message.error)):pending.resolve(message.result);}}});
   worker.on('error',()=>{clearTimeout(timer);reject(Error('后端工作线程异常'));service.close();});worker.on('exit',()=>{clearTimeout(timer);reject(Error('后端工作线程已退出'));service.close();});
  });
  try{await ready;return service;}catch(error){service.close();throw error;}
 }
 update(state,input,dt){if(this.closed)return Promise.reject(Error('后端已关闭'));if(this.pending.size>=1)return Promise.reject(Error('后端正在计算'));return new Promise((resolve,reject)=>{const id=++this.serial,timer=setTimeout(()=>{this.pending.delete(id);reject(Error('后端响应超时，已终止'));this.close();},250);this.pending.set(id,{resolve,reject,timer});this.worker.postMessage({id,state,input,dt});});}
 close(){if(this.closed)return;this.closed=true;for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(Error('后端已终止'));}this.pending.clear();void this.worker.terminate();}
}
