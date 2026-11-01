import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {GameRooms} from './game-rooms.mjs';
import {submitSoupSolution,validateSolutionVerdict} from './soup-solution.mjs';
test('故事还原匹配后结束并保存胜因，未猜中不泄露裁判自由文本',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'niko-soup-solve-'));try{const rooms=new GameRooms(dir);let r=rooms.create('soup','group:123456','111111',10);r=rooms.change(r.id,'111111',r.version,'start-test',x=>{x.status='playing';x.state={kind:'turtle-soup',answer:'秘密答案',keyFacts:['原因']};});const base={rooms,room:r,user:'111111',story:'整理的完整故事',authorized:()=>true};r=await submitSoupSolution({...base,requestID:'solve-wrong',judge:{solve:async()=>({solved:false,reason:'泄露秘密答案'})}});assert.equal(r.status,'playing');assert.ok(!r.state.solutions[0].reason.includes('秘密答案'));r=await submitSoupSolution({...base,room:r,requestID:'solve-right',judge:{solve:async()=>({solved:true,reason:'关键原因与行动相符'})}});assert.equal(r.status,'finished');assert.deepEqual(r.result.winners,['111111']);assert.match(r.result.explanation,/关键原因/);assert.throws(()=>validateSolutionVerdict({solved:'yes',reason:'bad'}));}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('故事判定期间撤权不结算',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'niko-soup-solve-auth-'));try{const rooms=new GameRooms(dir);let r=rooms.create('soup','group:123456','111111');r=rooms.change(r.id,'111111',r.version,'start-test',x=>{x.status='playing';x.state={kind:'turtle-soup',answer:'秘密'};});await assert.rejects(()=>submitSoupSolution({rooms,room:r,user:'111111',story:'故事',requestID:'solve-auth',judge:{solve:async()=>({solved:true,reason:'相符'})},authorized:()=>false}),/权限改变/);assert.equal(rooms.get(r.id).status,'playing');}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
