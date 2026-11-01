import test from 'node:test';
import assert from 'node:assert/strict';
import {checkGeneratedGame} from './game-generation-check.mjs';
test('多人产物不能仅声明名义排行榜，无状态更新/不可达动作/类型变更拒绝',()=>{
 const game={format:1,id:'draw',name:'数字',type:'web',kind:'flow',initialCoins:0,multiplayer:{enabled:true,maxPlayers:8,leaderboardField:'v_score'},commands:[{name:'/抽签',description:'抽签',cooldownSeconds:1,action:{type:'flow'}}],flow:{version:1,initial:'start',states:['start'],values:{v_score:0},actions:[{command:'/抽签',from:'start',to:'start',steps:[{op:'add',field:'v_score',value:1}],reply:'{v_score}'}]}};
 assert.equal(checkGeneratedGame(game,{text:'多人排行榜在线人数'}).id,'draw');assert.throws(()=>checkGeneratedGame({...game,flow:{...game.flow,actions:[{...game.flow.actions[0],steps:[]}]}},{text:'多人排行榜'}),/没有任何可更新/);assert.throws(()=>checkGeneratedGame(game,{gameType:'bot'}),/类型/);assert.throws(()=>checkGeneratedGame({...game,flow:{...game.flow,states:['start','lost'],actions:[{...game.flow.actions[0],from:'lost'}]}}),/无法.*到达/);
});
