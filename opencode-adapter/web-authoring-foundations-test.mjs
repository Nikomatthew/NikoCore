import test from 'node:test';
import assert from 'node:assert/strict';
import {checkGeneratedGame} from './game-generation-check.mjs';
import {gameDesignInstruction} from './game-design.mjs';
import {scene3DInstruction} from './scene3d.mjs';
import {webGameClient} from './web-game-client.mjs';
test('网页生成要求真实队伍时不能交付个人标记，3D需求不能只换名',()=>{
 const game={format:1,id:'rpg',name:'冒险',type:'web',initialCoins:0,commands:[{name:'/探索',description:'探索',cooldownSeconds:1,action:{type:'earn',min:1,max:5}}]};
 assert.throws(()=>checkGeneratedGame(game,{text:'可以和队友组队的RPG'}),/真实组队/);assert.throws(()=>checkGeneratedGame(game,{text:'制作一个3D冒险'}),/3D表现/);
 assert.match(gameDesignInstruction(),/核心循环|loop/);assert.match(gameDesignInstruction(),/决策|decisions/);assert.match(scene3DInstruction(),/不.*物理/);assert.doesNotThrow(()=>new Function(webGameClient));assert.match(webGameClient,/function renderGameStats/);
});
