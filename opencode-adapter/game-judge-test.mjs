import test from 'node:test';
import assert from 'node:assert/strict';
import {GameJudge} from './game-judge.mjs';
test('游戏裁判指定模型且拒绝泄密自由文本，不调用输出日志',async()=>{
 let model,prompt,interrupts=0;const host={workspace:'fixture',async start(){},async call(route,body){if(route==='/api/session'){assert.equal(body.agent,'game-judge');model=body.model;return {data:{id:'judge-session'}};}if(route==='/api/session/judge-session')return {data:{agent:'game-judge',location:{directory:'fixture'},permissions:[{action:'*',effect:'deny'}]}};if(route.endsWith('/prompt'))prompt=body.text;if(route.endsWith('/interrupt'))interrupts++;if(route.includes('/message?'))return {data:[{type:'assistant',content:[{type:'text',text:'{"verdict":"yes"}'}]}]};return {};}};
 const judge=new GameJudge(host,()=>({gameJudgeModel:'free/model'}));assert.equal(await judge.decide({id:'room',state:{surface:'汤面',answer:'秘密汤底',questions:[]}},'问题'),'yes');assert.equal(model.providerID,'free');assert.match(prompt,/秘密汤底/);assert.equal(interrupts,1);await assert.rejects(()=>new GameJudge(host,()=>({})).decide({id:'room'},'问题'),/配置/);
 host.call=async route=>route==='/api/session'?{data:{id:'bad'}}:route.includes('/message?')?{data:[{type:'assistant',content:[{type:'text',text:'汤底是秘密'}]}]}:{};
 await assert.rejects(()=>judge.decide({id:'another-room',state:{answer:'秘密'}},'问题'),/暂不可用/);
});
test('游戏裁判限频在创建模型会话前阻止重复消耗',()=>{
 let now=1000;const judge=new GameJudge({},()=>({}),{now:()=>now});judge.admit({id:'room'});assert.throws(()=>judge.admit({id:'room'}),/频繁/);now+=3001;judge.admit({id:'room'});now+=60001;judge.admit({id:'room'});
});
