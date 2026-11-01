import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {purposeHost,modelPurposeFields} from './model-purpose.mjs';
import {IsolatedLogin} from './isolated-login.mjs';
test('聊天与游戏直接复用同Host，任务仅共享转发，三个目录一致',async()=>{
 let starts=0;const shared={ready:false,async start(){starts++;this.ready=true;},async call(route){return {data:route==='/api/model'?[{id:'fixture',providerID:'provider',name:'model',enabled:true,type:'chat'}]:[]};}};const task={get ready(){return shared.ready;},start:()=>shared.start(),call:route=>shared.call(route),service:shared};const hosts={chat:shared,task,game:shared},login=new IsolatedLogin(hosts);
 assert.equal(purposeHost(hosts,'game'),purposeHost(hosts,'chat'));assert.equal(purposeHost(hosts,'task').service,shared);const catalogs=await Promise.all(['chat','task','game'].map(p=>login.catalog(p)));assert.deepEqual(catalogs[0].models,catalogs[2].models);assert.equal(starts,1);assert.equal(modelPurposeFields.game,'gameJudgeModel');await assert.rejects(()=>login.catalog('__proto__'));assert.throws(()=>purposeHost(hosts,'unknown'));
 const html=fs.readFileSync(new URL('../public/console-opencode.html',import.meta.url),'utf8');assert.match(html,/<option value="game">游戏<\/option>/);
});
