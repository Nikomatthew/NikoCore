import test from 'node:test';
import assert from 'node:assert/strict';
import {validateGame} from './game-engine.mjs';
import {declaredGameTools,hasGameTool} from './game-tool-declarations.mjs';
test('评分作为显式可选Tool声明，旧字段兼容，默认没有评分权限',()=>{
 const base={format:1,id:'demo',name:'游戏',initialCoins:0,commands:[{name:'/状态',description:'状态',cooldownSeconds:1,action:{type:'status'}}]};
 assert.equal(validateGame(base).mvpEnabled,false);assert.equal(hasGameTool(base,'judge.score'),false);
 assert.equal(validateGame({...base,capabilities:['judge.score']}).mvpEnabled,true);
 assert.deepEqual(declaredGameTools({mvpEnabled:true}),['judge.score']);
 assert.throws(()=>validateGame({...base,capabilities:['shell']}));
 assert.throws(()=>validateGame({...base,mvpEnabled:false,capabilities:['judge.score']}));
 assert.throws(()=>declaredGameTools({capabilities:['judge.score','judge.score']}));
});
