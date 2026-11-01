import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {newGomoku,moveGomoku} from './game-packages/gomoku.mjs';
import {WebGameRooms} from './web-game-rooms.mjs';
test('五子棋服务端轮次、占位及五连胜负，原状态不变',()=>{
 let state=newGomoku(['a','b']);const original=structuredClone(state);assert.throws(()=>moveGomoku(state,'b',0,0));for(let x=0;x<4;x++){state=moveGomoku(state,'a',x,0);state=moveGomoku(state,'b',x,1);}state=moveGomoku(state,'a',4,0);assert.equal(state.winner,'a');assert.equal(original.moves,0);assert.throws(()=>moveGomoku(state,'b',4,1));
});
test('网页房间存档与操作去重，非成员不能读盘',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'niko-gomoku-'));try{const rooms=new WebGameRooms(dir),game={id:'gomoku',kind:'gomoku'};let r=rooms.act(game,'a',{operation:'create'});assert.throws(()=>rooms.act(game,'x',{operation:'read',room:r.id}));r=rooms.act(game,'b',{operation:'join',room:r.id,requestID:'join-0001'});const input={operation:'move',room:r.id,x:0,y:0,version:r.version,requestID:'move-0001'};r=rooms.act(game,'a',input);assert.equal(rooms.act(game,'a',input).version,r.version);assert.equal(new WebGameRooms(dir).act(game,'a',{operation:'read',room:r.id}).state.board[0],1);}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('五子棋离房只允许本局成员，进行中退出判对手胜且去重',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'niko-chess-leave-'));try{const rooms=new WebGameRooms(dir),game={id:'chess',kind:'gomoku'};let room=rooms.act(game,'a',{operation:'create'});room=rooms.act(game,'b',{operation:'join',room:room.id,requestID:'join-0001'});assert.throws(()=>rooms.act(game,'x',{operation:'leave',room:room.id,version:room.version,requestID:'leave-bad'}));const request={operation:'leave',room:room.id,version:room.version,requestID:'leave-0001'};room=rooms.act(game,'a',request);assert.equal(room.status,'finished');assert.deepEqual(room.result.winners,['b']);assert.equal(rooms.act(game,'a',request).version,room.version);}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
