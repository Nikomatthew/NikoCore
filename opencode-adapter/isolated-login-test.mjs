import test from 'node:test';
import assert from 'node:assert/strict';
import { IsolatedLogin } from './isolated-login.mjs';
import { defaultAnswers } from './isolated-login.mjs';

test('隐藏默认表单可自动处理，快捷授权无需手填方法ID',async()=>{
 const form=[{key:'server',hidden:true,type:'string',default:'https://opencode.ai/console'}];
 assert.deepEqual(defaultAnswers(form),{server:'https://opencode.ai/console'});
 assert.throws(()=>defaultAnswers([{key:'tenant',required:true}]),/额外登录/);
 let sent;
 const host={ready:true,call:async(url,body)=>{if(url==='/api/integration')return {data:[{id:'opencode',methods:[{id:'device',type:'oauth',form}]}]};sent=body;return {data:{attemptID:'example',url:'https://example.com/login',mode:'auto',instructions:'Login'}};}};
 await new IsolatedLogin({chat:host}).begin('chat','opencode');
 assert.equal(sent.methodID,'device');assert.equal(sent.answer.server,'https://opencode.ai/console');
});

test('OAuth登录使用各实例官方接口，模型只返回启用项，不返回账号凭据',async()=>{
 const calls=[];const host={ready:true,call:async(url,body)=>{calls.push({url,body});if(url==='/api/integration')return {data:[{id:'openai',name:'OpenAI',methods:[{id:'browser',type:'oauth',label:'Browser'}],connections:[{access:'never-return'}]}]};if(url==='/api/model')return {data:[{providerID:'openai',id:'test',name:'Test',enabled:true},{providerID:'openai',id:'off',enabled:false}]};if(url.endsWith('/connect/oauth'))return {data:{attemptID:'attempt',url:'https://example.com/authorize',instructions:'test',mode:'auto'}};return {data:{status:'complete'}};}};
 const login=new IsolatedLogin({chat:host});const catalog=await login.catalog('chat');assert.equal(catalog.models.length,1);assert.ok(!JSON.stringify(catalog).includes('never-return'));
 const attempt=await login.begin('chat','openai','browser');assert.equal(attempt.mode,'auto');assert.equal((await login.action('chat',attempt.attemptID,'status')).status,'complete');await assert.rejects(login.action('task',attempt.attemptID,'status'));
});
