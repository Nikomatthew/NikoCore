import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {StandaloneRooms} from './standalone-rooms.mjs';
test('失联玩家重新加入有效独立房间后清除departed标记',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nikolink-rejoin-'));
 try{const runtime=new StandaloneRooms(dir),game={id:'demo',type:'web',kind:'standalone',webPackage:{toolkit:['rooms']},multiplayer:{enabled:true,maxPlayers:4}};let room=runtime.act(game,'a',{operation:'create'});runtime.act(game,'b',{operation:'join',room:room.id,requestID:'join-b-first'});const stored=runtime.rooms[room.id];stored.players=stored.players.filter(p=>p!=='a');stored.departed=['a'];room=runtime.act(game,'a',{operation:'join',room:room.id,requestID:'join-a-again'});assert.ok(room.players.includes('a'));assert.ok(!runtime.rooms[room.id].departed.includes('a'));}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
