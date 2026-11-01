import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {WebFlowRooms} from './web-flow-rooms.mjs';
test('网页真实队伍共享成员、版本校验、退出转交队长及重载',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'niko-party-'));try{const game={id:'rpg',kind:'flow',type:'web',multiplayer:{enabled:true,maxPlayers:8,party:{enabled:true,maxMembers:4}},flow:{values:{v_hp:100}}},runtime=new WebFlowRooms(dir);let r=runtime.act(game,'a',{operation:'create'});r=runtime.act(game,'b',{operation:'join',room:r.id,requestID:'join-b-0001'});r=runtime.act(game,'a',{operation:'party-create',room:r.id,version:r.version,requestID:'party-create-1'});const party=r.party.id;assert.deepEqual(r.party.members,['a']);assert.throws(()=>runtime.act(game,'b',{operation:'party-join',room:r.id,party,version:0,requestID:'party-stale'}));r=runtime.act(game,'b',{operation:'party-join',room:r.id,party,version:r.version,requestID:'party-join-1'});assert.deepEqual(r.party.members,['a','b']);assert.deepEqual(runtime.act(game,'a',{operation:'read',room:r.id}).party.members,['a','b']);assert.throws(()=>runtime.act(game,'x',{operation:'party-join',room:r.id,party,version:r.version,requestID:'party-outsider'}));r=runtime.act(game,'a',{operation:'party-leave',room:r.id,version:r.version,requestID:'party-leave-1'});assert.equal(r.party,null);assert.equal(new WebFlowRooms(dir).act(game,'b',{operation:'read',room:r.id}).party.leader,'b');assert.equal(r.own.flowValues.v_hp,100);}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
