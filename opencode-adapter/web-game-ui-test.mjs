import test from 'node:test';
import assert from 'node:assert/strict';
import {validateGame} from './game-engine.mjs';
import {webGameAuthoringInstruction} from './web-game-ui.mjs';
test('网页生成协议校验按钮绑定，不使用任意脚本或HTML执行',()=>{
 const game={format:1,id:'web-demo',type:'web',name:'网页',initialCoins:0,commands:[{name:'/状态',description:'状态',cooldownSeconds:1,action:{type:'status'}}],webUI:{format:1,layout:'arcade',title:'二维游戏',description:'规则玩法',accent:'#8eb4f0',buttons:[{command:'/状态',label:'查看'}]}};assert.equal(validateGame(game).webUI.layout,'arcade');assert.throws(()=>validateGame({...game,webUI:{...game.webUI,buttons:[{command:'/删除',label:'坏按钮'}]}}));assert.match(webGameAuthoringInstruction(),/type/);
});
