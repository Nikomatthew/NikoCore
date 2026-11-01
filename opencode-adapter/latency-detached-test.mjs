import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {gameLatencyClient} from './game-latency.mjs';
test('全屏移除标题节点后延迟仍更新浏览器标题',async()=>{
 const heading={textContent:'',isConnected:true,parentElement:{addEventListener(){}}},document={hidden:false,title:''};
 const context=vm.createContext({document,window:{addEventListener(){}},setInterval:()=>1,clearInterval(){},performance:{now:()=>20},AbortSignal:{timeout:()=>undefined},fetch:async()=>({ok:true,json:async()=>({ok:true})}),heading});
 vm.runInContext(gameLatencyClient,context);vm.runInContext("registerLatencyHeading(heading,'RPG');heading.isConnected=false;",context);await vm.runInContext('Promise.resolve().then(()=>Promise.resolve())',context);await vm.runInContext('measureLatency()',context);assert.match(document.title,/RPG - \d+ms/);
});
