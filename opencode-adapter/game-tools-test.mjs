import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {GameRecords,checkedScores} from './game-records.mjs';
import {GameTools} from './game-tools.mjs';
test('通用游戏工具隔离收件人、评分校验、战绩持久化及重复结算',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'niko-game-tools-'));try{const records=new GameRecords(dir),sent=[];let room={id:'round-00001',game:'demo',scope:'group:123456',members:['111111','222222'],status:'finished',version:1,capabilities:['judge.score'],result:{winners:['111111']},publicEvidence:['正常发言记录']};const tools=new GameTools({room:()=>structuredClone(room),authorized:()=>true,send:async(...x)=>sent.push(x),records,judge:async()=>({scores:[{player:'111111',score:90},{player:'222222',score:80}]})});await assert.rejects(()=>tools.call('player.private',{player:'333333',text:'secret'}));await assert.rejects(()=>tools.call('room.public',{text:'secret',classification:'secret'}));await tools.call('player.private',{player:'111111',text:'private'});assert.equal(sent[0][0].group,false);const score=await tools.call('judge.score');assert.deepEqual(score.mvp,['111111']);await tools.call('records.settle',score);await tools.call('records.settle',score);assert.deepEqual(new GameRecords(dir).read('demo','group:123456','111111'),{played:1,wins:1,mvp:1});assert.equal(records.read('demo','group:654321','111111').played,0);assert.throws(()=>checkedScores(room.members,[{player:'111111',score:101},{player:'222222',score:0}]));assert.deepEqual(checkedScores(room.members,room.members.map(player=>({player,score:10}))),room.members);room.capabilities=[];await assert.rejects(()=>tools.call('judge.score'),/未授权/);}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
