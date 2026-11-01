import {getQuickJS} from 'quickjs-emscripten';

export class GameScriptRuntime{
 static async create(source,{memoryBytes=8*1024*1024,timeoutMs=25}={}){
  if(typeof source!=='string'||Buffer.byteLength(source)>128000)throw Error('游戏后端源码超过预算');
  if(!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>100||!Number.isInteger(memoryBytes)||memoryBytes<1048576||memoryBytes>32*1048576)throw Error('游戏脚本预算无效');
  const module=await getQuickJS(),runtime=module.newRuntime();runtime.setMemoryLimit(memoryBytes);runtime.setMaxStackSize(256*1024);
  const context=runtime.newContext(),instance=new GameScriptRuntime();Object.assign(instance,{runtime,context,timeoutMs,closed:false,deadline:0});runtime.setInterruptHandler(()=>performance.now()>instance.deadline);
   try{instance.evaluate(`'use strict';\n${source}\n;if(typeof update!=='function')throw Error('后端必须定义update(state,input,dt)');`);return instance;}catch(error){instance.dispose();throw error;}
 }
 evaluate(code){
  if(this.closed)throw Error('游戏脚本已关闭');this.deadline=performance.now()+this.timeoutMs;
  const result=this.context.evalCode(code,'game-backend.js');
   if(result.error){let name='Error';try{name=this.context.dump(result.error)?.name||'Error';}finally{result.error.dispose();}const kind=performance.now()>this.deadline?'执行超时':name==='SyntaxError'?'语法错误':name==='ReferenceError'?'未定义变量或接口':name==='TypeError'?'类型错误':'脚本异常';throw Error('受限游戏脚本执行失败或超时（'+kind+'）');}
  try{return this.context.dump(result.value);}finally{result.value.dispose();}
 }
 update(state,input,dt){
  if(!Number.isFinite(dt)||dt<=0||dt>.1)throw Error('游戏步长无效');
  const payload=JSON.stringify({state,input,dt});if(Buffer.byteLength(payload)>64000)throw Error('游戏脚本输入超过预算');
  const output=this.evaluate(`JSON.stringify((()=>{const p=JSON.parse(${JSON.stringify(payload)});return update(p.state,p.input,p.dt);})())`);
  if(typeof output!=='string'||Buffer.byteLength(output)>64000)throw Error('游戏脚本输出无效或超过预算');
  return JSON.parse(output);
 }
 dispose(){if(this.closed)return;this.closed=true;this.context.dispose();this.runtime.dispose();}
}
