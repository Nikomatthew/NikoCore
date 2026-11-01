import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {GameEngine} from './game-engine.mjs';
test('声明流程经审批发布后Bot执行并持久化，失败不推进存档',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'niko-flow-game-'));try{let now=10000;const engine=new GameEngine(root,{now:()=>now});const game={format:1,id:'adventure',kind:'flow',type:'bot',name:'探索',initialCoins:0,commands:[{name:'/探索',description:'探索',cooldownSeconds:1,action:{type:'flow'}},{name:'/休息',description:'休息',cooldownSeconds:1,action:{type:'flow'}}],flow:{version:1,initial:'awake',states:['awake','tired'],values:{v_energy:1,v_score:0},actions:[{command:'/探索',from:'awake',to:'tired',steps:[{op:'add',field:'v_score',value:10},{op:'set',field:'v_energy',value:0}],reply:'得分{v_score}'},{command:'/休息',from:'tired',to:'awake',steps:[{op:'set',field:'v_energy',value:1}],reply:'恢复'}]}};engine.publish(engine.draft(game));engine.configure('adventure',{enabled:true,players:['123456']});engine.join('private:123456','123456','adventure');assert.equal(engine.act('private:123456','123456','/探索'),'得分10');now+=2000;assert.throws(()=>engine.act('private:123456','123456','/探索'));const restored=new GameEngine(root);restored.load();assert.equal(restored.players['private:123456:123456'].saves.adventure.flowValues.v_score,10);assert.equal(engine.act('private:123456','123456','/休息'),'恢复');}finally{fs.rmSync(root,{recursive:true,force:true});}
});
