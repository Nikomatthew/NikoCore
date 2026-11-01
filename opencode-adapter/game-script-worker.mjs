import {parentPort,workerData} from 'node:worker_threads';
import {GameScriptRuntime} from './game-script-runtime.mjs';
let script;
async function start(){
try{script=await GameScriptRuntime.create(workerData.source);parentPort.postMessage({ready:true});}catch(error){const reason=/（([^）]+)）/.exec(String(error.message))?.[1]||'运行库加载或资源预算错误';parentPort.postMessage({error:'后端初始化失败（'+reason+'）'});parentPort.close();}
if(script)parentPort.on('message',message=>{
 try{parentPort.postMessage({id:message.id,result:script.update(message.state,message.input,message.dt)});}
 catch{parentPort.postMessage({id:message.id,error:'受限后端执行失败'});}
});
}
void start();
