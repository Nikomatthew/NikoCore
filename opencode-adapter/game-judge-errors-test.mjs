import test from 'node:test';
import assert from 'node:assert/strict';
import {judgeFailure,publicJudgeError} from './game-judge-errors.mjs';
import {GameJudge} from './game-judge.mjs';
test('裁判错误分类保留401/429但不泄露上游消息或密钥',()=>{
const error=judgeFailure([{error:{type:'provider.auth',status:401,message:'secret key'}}]);assert.match(publicJudgeError(error,'fallback'),/401/);assert.ok(!error.message.includes('secret'));assert.match(judgeFailure([{error:{statusCode:429}}]).message,/429/);assert.equal(judgeFailure([]),null);assert.equal(publicJudgeError(Error('raw secret'),'safe'),'safe');
});
test('实际裁判会话返回provider.auth时显示401，不泄露服务商原始错误',async()=>{
 const host={workspace:'fixture',async start(){},async call(route){if(route==='/api/session')return {data:{id:'judge-session'}};if(route==='/api/session/judge-session')return {data:{agent:'game-judge',location:{directory:'fixture'},permissions:[{action:'*',effect:'deny'}]}};if(route.includes('/message?'))return {data:[{type:'assistant',error:{type:'provider.auth',status:401,message:'secret-provider-body'}}]};return {};}};
 const judge=new GameJudge(host,()=>({gameJudgeModel:'fixture/model'}));await assert.rejects(()=>judge.decide({id:'room',state:{surface:'fixture',answer:'secret'}},'问题'),error=>/401/.test(error.message)&&!error.message.includes('secret'));
});
