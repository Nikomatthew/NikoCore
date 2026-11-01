import test from 'node:test';
import assert from 'node:assert/strict';
import {validateGamePackage} from './game-packages/catalog.mjs';
import {validateGame} from './game-engine.mjs';
test('未安装流程包不能以任意kind冒充支持，内置包按类型校验',()=>{
 assert.equal(validateGamePackage({type:'web',kind:'doudizhu'}).id,'doudizhu');assert.throws(()=>validateGamePackage({type:'bot',kind:'gomoku'}));assert.equal(validateGamePackage({type:'web',kind:'fps'}).id,'fps');const game={format:1,id:'demo',name:'游戏',type:'web',initialCoins:0,commands:[{name:'/状态',description:'查看',cooldownSeconds:1,action:{type:'status'}}]};assert.throws(()=>validateGame({...game,kind:'made-up'}));assert.equal(validateGame(game).type,'web');
});
