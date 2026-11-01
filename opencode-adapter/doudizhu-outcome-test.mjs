import test from 'node:test';
import assert from 'node:assert/strict';
import {newDoudizhu,bidDoudizhu,playDoudizhu,classifyCards,beatsCards} from './game-packages/doudizhu.mjs';
test('地主与农民胜方按服务端阵营结算，全不叫不伪造赢家',()=>{
 let state=newDoudizhu(['a','b','c'],Array.from({length:54},(_,i)=>i));state=bidDoudizhu(state,'a',0);state=bidDoudizhu(state,'b',0);state=bidDoudizhu(state,'c',0);assert.equal(state.phase,'finished');assert.deepEqual(state.winners,[]);assert.equal(state.reason,'no-bid');
 const base={...newDoudizhu(['a','b','c']),phase:'playing',turn:0,landlord:'a',hands:{a:[0],b:[4],c:[8]},table:null,passes:0};
 const landlord=playDoudizhu(base,'a',[0]);assert.deepEqual(landlord.winners,['a']);assert.equal(base.hands.a.length,1);assert.throws(()=>playDoudizhu(landlord,'b',[4]));
 const farmer=playDoudizhu({...base,turn:1},'b',[4]);assert.deepEqual(farmer.winners,['b','c']);
});
test('牌型比较要求同类型同长度，炸弹不可压王炸，顺子不可带2',()=>{
 const straight=classifyCards([0,4,8,12,16]),longer=classifyCards([0,4,8,12,16,20]);assert.equal(beatsCards(longer,straight),false);assert.equal(beatsCards(classifyCards([4,5]),classifyCards([0,1,2])),false);assert.equal(beatsCards(classifyCards([0,1,2,3]),classifyCards([52,53])),false);assert.throws(()=>classifyCards([32,36,40,44,48]));
});
