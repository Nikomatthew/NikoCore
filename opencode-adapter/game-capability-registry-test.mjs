import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {GameCapabilityDrafts} from './game-capability-drafts.mjs';
import {GameEngine} from './game-engine.mjs';
test('能力草稿批准安装后可被Bot和网页复用，绑定摘要且不覆盖旧版',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'niko-cap-registry-'));try{const engine=new GameEngine(root),drafts=new GameCapabilityDrafts(path.join(root,'drafts'));const receipt=drafts.save({format:1,id:'custom.score',description:'得分',operations:[{type:'add',field:'v_score',value:10}]});const game={format:1,id:'demo',name:'测试',initialCoins:0,commands:[{name:'/得分',description:'得分',cooldownSeconds:1,action:{type:'custom.score',hash:receipt.hash}}]};assert.throws(()=>engine.draft(game));drafts.install(receipt.hash,engine.registry.directory);engine.registry.load();engine.publish(engine.draft(game));engine.configure('demo',{enabled:true,players:['123456']});engine.join('private:123456','123456','demo');engine.act('private:123456','123456','/得分');assert.equal(engine.players['private:123456:123456'].saves.demo.v_score,10);const state={};engine.webAction(game,game.commands[0],state);assert.equal(state.v_score,10);assert.throws(()=>drafts.install(receipt.hash,engine.registry.directory));assert.throws(()=>engine.draft({...game,commands:[{...game.commands[0],action:{type:'custom.score',hash:'bad'}}]}));}finally{fs.rmSync(root,{recursive:true,force:true});}
});
