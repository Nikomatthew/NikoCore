import test from 'node:test';
import assert from 'node:assert/strict';
import {validate,defaults} from './core.mjs';
test('网页登录方式与QQ名单保存，关闭游戏时不阻碍其他设置',()=>{
 const old={...defaults,model:'fixture/model',revision:0};const next=validate({gamesEnabled:true,webGameLoginMode:'both',webGameQQAllowlist:['123456','123456']},old);assert.equal(next.webGameLoginMode,'both');assert.deepEqual(next.webGameQQAllowlist,['123456']);assert.throws(()=>validate({gamesEnabled:true,webGameLoginMode:'qq',webGameQQAllowlist:['bad']},old));assert.equal(validate({gamesEnabled:false,webGameLoginMode:'',persona:'test'},old).persona,'test');assert.deepEqual(validate({gamesEnabled:true,webGameLoginMode:'qq',webGameQQAllowlist:[]},old).webGameQQAllowlist,[]);
});
