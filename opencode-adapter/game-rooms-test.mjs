import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {GameRooms} from './game-rooms.mjs';
test('多人房间版本去重、准备、回合与退出持久化',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nikolink-rooms-'));
 try{const rooms=new GameRooms(dir);let r=rooms.create('game','group:123456','111111');r=rooms.join(r.id,'222222',r.version,'request-join');assert.equal(rooms.join(r.id,'222222',0,'request-join').version,1);assert.throws(()=>rooms.ready(r.id,'111111',0,'request-stale'));assert.throws(()=>rooms.start(r.id,'111111',r.version,'request-start'));r=rooms.ready(r.id,'111111',r.version,'request-ready1');r=rooms.ready(r.id,'222222',r.version,'request-ready2');r=rooms.start(r.id,'111111',r.version,'request-start');assert.throws(()=>rooms.advance(r.id,'222222',r.version,'request-cheat'));r=rooms.advance(r.id,'111111',r.version,'request-turn');assert.equal(r.members[r.turn],'222222');r=rooms.leave(r.id,'111111',r.version,'request-leave');assert.equal(r.owner,'222222');assert.equal(new GameRooms(dir).get(r.id).owner,'222222');}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
