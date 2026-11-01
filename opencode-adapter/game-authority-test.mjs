import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {GameAuthorityStore} from './game-authority-store.mjs';
import {AuthoritativeWorld} from './game-authoritative-world.mjs';
test('权威世界共享敌人和服务端奖励，不接受客户端伤害/金币，事务幂等',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'niko-authority-')),store=new GameAuthorityStore(dir);
 try{const world=new AuthoritativeWorld({game:'demo',room:'123456',store});world.join('a');world.join('b');world.spawnEnemy('enemy',1,0);assert.throws(()=>world.input('a',{sequence:1,x:0,z:0,attack:true,damage:999}),/无效/);assert.throws(()=>world.input('outsider',{sequence:1,x:0,z:0,attack:true}),/成员/);assert.equal(world.input('a',{sequence:1,x:0,z:0,attack:true}),true);assert.equal(world.input('a',{sequence:1,x:1,z:0,attack:false}),false);for(let i=0;i<35;i++)world.step(.05);assert.equal(world.snapshot().enemies[0].hp,0);assert.equal(store.balance('demo','a'),5);assert.equal(store.reward('demo','event','b',7).duplicate,false);assert.equal(store.reward('demo','event','b',7).duplicate,true);assert.equal(store.balance('demo','b'),7);assert.throws(()=>store.reward('demo','event','a',7),/冲突/);}finally{store.close();fs.rmSync(dir,{recursive:true,force:true});}
});
