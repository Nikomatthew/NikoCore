import test from 'node:test';
import assert from 'node:assert/strict';
import {GameTools} from './game-tools.mjs';
test('评分结算拒绝伪造分数、跨局凭证和评分期间撤权',async()=>{
 let room={id:'round-0001',game:'demo',scope:'group:123456',version:1,status:'finished',members:['111111','222222'],capabilities:['judge.score'],result:{winners:['111111']}};
 let awards=0;const tools=new GameTools({room:()=>structuredClone(room),authorized:()=>true,send:async()=>{},judge:async()=>({scores:[{player:'111111',score:10},{player:'222222',score:90}]}),records:{settle:()=>({}),awardMVP:({scores})=>{awards++;assert.equal(scores[1].score,90);return {};}}});
 await assert.rejects(()=>tools.call('records.settle',{scores:[{player:'111111',score:100}]}),/凭证/);
 const rating=await tools.call('judge.score');rating.scores[1].score=0;await tools.call('records.settle',rating);assert.equal(awards,1);
 room.id='round-0002';await assert.rejects(()=>tools.call('records.settle',rating),/凭证/);
 tools.judge=async()=>{room.capabilities=[];return {scores:[{player:'111111',score:10},{player:'222222',score:90}]};};await assert.rejects(()=>tools.call('judge.score'),/权限/);
});
