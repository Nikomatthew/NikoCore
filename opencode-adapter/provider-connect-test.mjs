import test from 'node:test';
import assert from 'node:assert/strict';
import { connectProvider } from './provider-connect.mjs';

test('模型授权通过V2连接接口保存到两个实例，不读取数据库或返回密钥',async()=>{
 const calls=[];const host={ready:true,call:async(...args)=>calls.push(args)};
 const result=await connectProvider([['聊天',host],['任务',host]],'opencode','fixture-key');
 assert.equal(calls.length,2);assert.equal(calls[0][0],'/api/integration/opencode/connect/key');
 assert.equal(calls[0][1].key,'fixture-key');assert.ok(!JSON.stringify(result).includes('fixture-key'));
 await assert.rejects(connectProvider([],'../bad','secret'));
});

test('授权错误不向页面暴露上游可能携带密钥的异常',async()=>{
 const result=await connectProvider([['聊天',{ready:true,call:async()=>{throw Error('secret-value')}}]],'deepseek','secret-value');
 assert.equal(result.results[0].connected,false);assert.ok(!JSON.stringify(result).includes('secret-value'));
});
