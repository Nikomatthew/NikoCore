import test from 'node:test';
import assert from 'node:assert/strict';
import {QQGameLogin,webLoginSettings} from './web-game-login.mjs';
import {commandRecord} from './command-memory.mjs';
test('QQ验证短期单次、白名单空为开放、登录方式变更立即撤销访问',()=>{
 let now=1000;const c={gamesEnabled:true,webGameLoginMode:'both',webGameQQAllowlist:[]},login=new QQGameLogin(()=>c,{now:()=>now});const a=login.begin();assert.equal(login.poll(a.ticket).ready,false);login.verify('123456',a.code);assert.equal(login.poll(a.ticket).ready,true);const s=login.complete(a.ticket);assert.equal(login.get(s.token).qq,'123456');assert.throws(()=>login.complete(a.ticket));c.webGameQQAllowlist=['999999'];assert.equal(login.get(s.token),null);c.webGameQQAllowlist=[];const b=login.begin();now+=120001;assert.throws(()=>login.verify('123456',b.code));c.webGameLoginMode='password';assert.throws(()=>login.begin());assert.equal(login.get(s.token),null);assert.throws(()=>webLoginSettings({webGameLoginMode:'invalid'}));assert.equal(commandRecord({message_id:1,message:[{type:'text',data:{text:'/网页登录 123456ABCDEF'}}]}, {},()=>({})),null);
});
test('QQ验证码只接受私聊且只向验证者回复，不在群里处理',async()=>{
 const login=new QQGameLogin(()=>({gamesEnabled:true,webGameLoginMode:'qq'})),a=login.begin(),sent=[];const event={post_type:'message',message_type:'group',user_id:123456,self_id:999999,message:[{type:'text',data:{text:'/网页登录 '+a.code}}]};await login.receive(event,async(...args)=>sent.push(args));assert.equal(sent.length,0);assert.equal(login.poll(a.ticket).ready,false);await login.receive({...event,message_type:'private'},async(...args)=>sent.push(args));assert.equal(sent[0][0].target,'123456');assert.equal(login.poll(a.ticket).ready,true);assert.ok(!sent[0][1].includes(a.code));
});
