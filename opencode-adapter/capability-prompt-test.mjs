import test from 'node:test';
import assert from 'node:assert/strict';
import {capabilityPrompt} from './capability-prompt.mjs';
import {commandRecord} from './command-memory.mjs';
test('能力提示反映开关及当前身份，不暴露白名单或扩权',()=>{
 const text=capabilityPrompt({visionEnabled:true,gamesEnabled:true,mediaQQ:['123456','654321']},{user:'123456'});assert.match(text,/在识别白名单内/);assert.ok(!text.includes('654321'));assert.match(text,/不能批准/);assert.match(capabilityPrompt({},{user:'123456'}),/未启用图片理解/);
});
test('指令记忆仅保存请求类型，不记录参数密码或授权完成',()=>{
 const e={message_id:1,message:[{type:'text',data:{text:'/任务 密码 super-secret'}}]};const result=commandRecord(e,{},()=>({key:'private:123456',user:'123456'}));assert.ok(!result.text.includes('super-secret'));assert.match(result.text,/不代表获准或已完成/);assert.equal(commandRecord(e,{},()=>null),null);assert.equal(commandRecord({...e,message:[{type:'text',data:{text:'普通聊天'}}]}, {},()=>({})),null);
});
