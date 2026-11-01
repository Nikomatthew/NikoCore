import test from 'node:test';
import assert from 'node:assert/strict';
import {GameTools} from './game-tools.mjs';
test('通用判题Tool仅受授权成员可调用，固定判定且不自动发消息',async()=>{
 let room={id:'room-0001',game:'soup',scope:'group:123456',version:1,status:'playing',members:['111111'],capabilities:[]};let calls=0,sent=0;
 const tools=new GameTools({room:()=>structuredClone(room),authorized:()=>true,send:async()=>{sent++;},records:{},judge:{async decide(){calls++;return 'yes';}}});
 await assert.rejects(()=>tools.call('judge.decide',{player:'111111',question:'问题'}),/未授权/);assert.equal(calls,0);room.capabilities=['judge.decide'];
 await assert.rejects(()=>tools.call('judge.decide',{player:'222222',question:'问题'}));assert.equal(calls,0);
 assert.deepEqual(await tools.call('judge.decide',{player:'111111',question:'问题'}),{verdict:'yes'});assert.equal(sent,0);
 tools.judge.decide=async()=>{room.version++;return 'yes';};await assert.rejects(()=>tools.call('judge.decide',{player:'111111',question:'问题'}),/状态或权限/);
 tools.judge.decide=async()=> '秘密汤底';await assert.rejects(()=>tools.call('judge.decide',{player:'111111',question:'问题'}),/格式/);
});
