import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {browserGameCompat} from './browser-game-compat.mjs';
import {webGameClient} from './web-game-client.mjs';
test('HTTP浏览器缺少randomUUID时提供请求编号，不作为认证凭据',()=>{
 const crypto={getRandomValues:bytes=>{for(let i=0;i<bytes.length;i++)bytes[i]=i;return bytes;}},ctx=vm.createContext({crypto,Uint8Array,Math});vm.runInContext(browserGameCompat,ctx);assert.match(crypto.randomUUID(),/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
});
test('空响应启动可重试，建房写操作不自动重放',async()=>{
 let calls=0;const ctx=vm.createContext({crypto:{},Uint8Array,Math,AbortSignal:{timeout:()=>undefined},setTimeout:fn=>{fn();},fetch:async()=>{calls++;return {ok:true,text:async()=>calls===1?'':'{"url":"/standalone/fixture/index.html"}'};}});vm.runInContext(browserGameCompat,ctx);
 assert.equal((await vm.runInContext("gameJSONRequest('/api/standalone-launch',{},'csrf')",ctx)).url,'/standalone/fixture/index.html');assert.equal(calls,2);
 calls=0;await assert.rejects(()=>vm.runInContext("gameJSONRequest('/api/room',{operation:'create'},'csrf')",ctx),/网络返回为空/);assert.equal(calls,1);
});
test('移动端返回页面恢复验证轮询，不因单次网络错误取消',()=>{assert.match(webGameClient,/visibilitychange/);assert.match(webGameClient,/pageshow/);assert.match(webGameClient,/网络恢复后会继续检查/);assert.doesNotThrow(()=>new Function(webGameClient));});
