import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {GameEngine,validateGame} from './game-engine.mjs';
test('游戏规则受限，玩家分区存档独立，冷却与固定退出可用',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'nikolink-games-'));let now=1000;
 try{const engine=new GameEngine(root,{random:()=>0,now:()=>now});const game={format:1,id:'tycoon',name:'大亨',enabled:true,players:['111111','222222'],initialCoins:0,commands:[{name:'/赚钱',description:'工作',cooldownSeconds:5,action:{type:'earn',min:10,max:10}}]};engine.games.set(game.id,validateGame(game));engine.join('group:123456','111111','tycoon');engine.join('group:123456','222222','tycoon');assert.throws(()=>engine.join('group:123456','333333','tycoon'));assert.match(engine.act('group:123456','111111','/赚钱'),/余额10/);assert.match(engine.act('group:123456','111111','/赚钱'),/冷却/);assert.equal(engine.players['group:123456:222222'].saves.tycoon.coins,0);assert.match(engine.act('group:123456','111111','/结束'),/存档保留/);assert.equal(engine.act('group:123456','111111','/赚钱'),null);assert.throws(()=>validateGame({...game,commands:[{...game.commands[0],action:{type:'shell'}}]}));assert.throws(()=>validateGame({...game,commands:[{...game.commands[0],name:'/结束'}]}));const draft=engine.draft(game);engine.publish(draft);assert.equal(engine.games.get('tycoon').enabled,false);engine.configure('tycoon',{enabled:true,players:['111111']});assert.throws(()=>engine.join('group:123456','222222','tycoon'));}finally{fs.rmSync(root,{recursive:true,force:true});}
});
