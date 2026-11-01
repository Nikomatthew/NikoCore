import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {GameEngine} from './game-engine.mjs';
test('规则更新和回退保留存档权限，默认关闭，不接受游戏身份替换',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'nikolink-game-version-'));try{const e=new GameEngine(root),g={format:1,id:'demo',name:'原游戏',initialCoins:0,commands:[{name:'/赚钱',description:'工作',cooldownSeconds:1,action:{type:'earn',min:1,max:1}}]};e.publish(e.draft(g));e.configure('demo',{enabled:true,players:['123456']});e.join('private:123456','123456','demo');e.act('private:123456','123456','/赚钱');const before=JSON.stringify(e.players);const backup=e.updateDraft('demo',e.draft({...g,name:'更新游戏'}));assert.equal(e.find('demo').enabled,false);assert.deepEqual(e.find('demo').players,['123456']);assert.equal(JSON.stringify(e.players),before);assert.equal(e.versions('demo').length,1);e.rollback('demo',backup);assert.equal(e.find('demo').name,'原游戏');assert.equal(JSON.stringify(e.players),before);assert.throws(()=>e.replace('demo',{...g,id:'other'}));assert.throws(()=>e.rollback('demo','../bad'));}finally{fs.rmSync(root,{recursive:true,force:true});}
});
