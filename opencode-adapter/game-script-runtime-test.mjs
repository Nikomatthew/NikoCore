import test from 'node:test';
import assert from 'node:assert/strict';
import {GameScriptRuntime} from './game-script-runtime.mjs';
test('受限QuickJS运行游戏专属逻辑但不暴露Node/文件/网络',async()=>{
 const script=await GameScriptRuntime.create('function update(state,input,dt){return {x:state.x+input.speed*dt,node:typeof process,files:typeof require,network:typeof fetch};}');
 try{assert.deepEqual(script.update({x:0},{speed:2},.05),{x:.1,node:'undefined',files:'undefined',network:'undefined'});assert.throws(()=>script.update({}, {},1),/步长/);}finally{script.dispose();}
});
test('死循环初始化和tick会被中断',async()=>{
 await assert.rejects(()=>GameScriptRuntime.create('while(true){}'),/超时/);
 const script=await GameScriptRuntime.create('function update(){while(true){}}');try{assert.throws(()=>script.update({}, {},.05),/超时/);}finally{script.dispose();}
});
