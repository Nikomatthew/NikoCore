import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {WebCardRooms} from './web-card-rooms.mjs';
import {cardRank} from './game-packages/doudizhu.mjs';
test('斗地主三人房间私有手牌、叫分、出牌、请求去重及重载',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'niko-web-card-'));try{const rooms=new WebCardRooms(dir),game={id:'cards',kind:'doudizhu'};let r=rooms.act(game,'a',{operation:'create'});for(const user of ['b','c'])r=rooms.act(game,user,{operation:'join',room:r.id,requestID:'join-'+user+'-0001'});for(const user of ['a','b','c'])r=rooms.act(game,user,{operation:'ready',room:r.id,version:r.version,requestID:'ready-'+user+'-001'});assert.throws(()=>rooms.act(game,'b',{operation:'start',room:r.id,version:r.version,requestID:'start-bad'}));r=rooms.act(game,'a',{operation:'start',room:r.id,version:r.version,requestID:'start-good'});assert.equal(r.state.hand.length,17);assert.ok(!('hands'in r.state));assert.equal(r.state.bottom.length,0);assert.throws(()=>rooms.act(game,'x',{operation:'read',room:r.id}));r=rooms.act(game,'a',{operation:'bid',bid:3,room:r.id,version:r.version,requestID:'bid-three'});assert.equal(r.state.hand.length,20);const card=r.state.hand[0],request={operation:'play',cards:[card],room:r.id,version:r.version,requestID:'play-once'};r=rooms.act(game,'a',request);assert.equal(rooms.act(game,'a',request).version,r.version);const b=rooms.act(game,'b',{operation:'read',room:r.id});assert.equal(b.state.hand.length,17);assert.ok(!b.state.hand.includes(card));assert.equal(new WebCardRooms(dir).act(game,'a',{operation:'read',room:r.id}).state.hand.length,19);
 const sorted=[...r.state.hand].sort((a,b)=>cardRank(a)-cardRank(b));assert.equal(sorted.length,19);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
