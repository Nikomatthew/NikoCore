import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyCards,beatsCards,newDoudizhu,bidDoudizhu,playDoudizhu,doudizhuView} from './game-packages/doudizhu.mjs';
test('斗地主牌型含顺子连对飞机炸弹王炸，禁止非法组合',()=>{
 assert.equal(classifyCards([52,53]).type,'rocket');assert.equal(classifyCards([0,1,2,3]).type,'bomb');assert.equal(classifyCards([0,4,8,12,16]).type,'straight');assert.equal(classifyCards([0,1,4,5,8,9]).type,'pair-straight');assert.equal(classifyCards([0,1,2,4,5,6,8,12]).type,'airplane-singles');assert.equal(classifyCards([0,1,2,3,4,5]).type,'four-singles');assert.throws(()=>classifyCards([48,44,40,36,32]));assert.throws(()=>classifyCards([0,0]));assert.equal(beatsCards(classifyCards([0,1,2,3]),classifyCards([48])),true);
});
test('斗地主服务端发牌隐藏他人手牌，叫分出牌与两次不出轮转',()=>{
 let state=newDoudizhu(['a','b','c'],Array.from({length:54},(_,i)=>i));assert.equal(state.hands.a.length,17);assert.equal(doudizhuView(state,'a').bottom.length,0);assert.ok(!('hands'in doudizhuView(state,'a')));assert.throws(()=>bidDoudizhu(state,'b',1));state=bidDoudizhu(state,'a',3);assert.equal(state.hands.a.length,20);assert.equal(state.landlord,'a');state=playDoudizhu(state,'a',[0]);assert.throws(()=>playDoudizhu(state,'b',[1]));state=playDoudizhu(state,'b',[]);state=playDoudizhu(state,'c',[]);assert.equal(state.turn,0);assert.equal(state.table,null);assert.throws(()=>playDoudizhu(state,'a',[]));
});
