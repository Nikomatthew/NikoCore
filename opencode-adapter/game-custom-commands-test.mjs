import test from 'node:test';
import assert from 'node:assert/strict';
import {validateGame} from './game-engine.mjs';
import {gameAuthoringInstruction} from './game-authoring.mjs';
test('生成指令支持玩法自定义名称但不可覆盖系统入口',()=>{
 const game={format:1,id:'adventure',name:'冒险',initialCoins:0,commands:[{name:'/探索',description:'探索',cooldownSeconds:1,action:{type:'earn',min:1,max:5}},{name:'/背包',description:'背包',cooldownSeconds:1,action:{type:'status'}}]};assert.equal(validateGame(game).commands[0].name,'/探索');for(const name of ['/游戏退出','/开始游戏','/网页游戏停止','/提交故事'])assert.throws(()=>validateGame({...game,commands:[{...game.commands[0],name}]}));assert.match(gameAuthoringInstruction(),/不固定使用/);
});
