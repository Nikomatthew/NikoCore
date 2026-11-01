import test from 'node:test';
import assert from 'node:assert/strict';
import {QQGameLogin} from './web-game-login.mjs';
import {route} from './core.mjs';
test('无私聊聊天权限的QQ仍可按网页登录白名单验证，不开放聊天',async()=>{
 const config={gamesEnabled:true,webGameLoginMode:'qq',webGameQQAllowlist:[],ownerQQ:'111111',privateQQ:[],groups:[],mode:'reply'},login=new QQGameLogin(()=>config),attempt=login.begin(),event={post_type:'message',message_type:'private',self_id:999999,user_id:222222,message:[{type:'text',data:{text:'/网页登录 '+attempt.code}}]};
 assert.equal(route(event,config),null);let reply='';assert.equal(await login.receive(event,async(target,text)=>{reply=text;}),true);assert.equal(login.poll(attempt.ticket).ready,true);assert.match(reply,/身份已验证/);assert.equal(login.get(login.complete(attempt.ticket).token).qq,'222222');assert.deepEqual(config.privateQQ,[]);
});
