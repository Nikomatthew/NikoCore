import test from 'node:test';
import assert from 'node:assert/strict';
import {runCapability,validateCapability} from './game-capability-drafts.mjs';
test('能力草稿只能执行受限数值步骤，失败不改原状态',()=>{
 const value={format:1,id:'custom.work',description:'工作',operations:[{type:'require',field:'v_energy',compare:'gte',value:1},{type:'add',field:'v_energy',value:-1},{type:'add',field:'v_score',value:10}]};
 const state={v_energy:2,v_score:0};assert.deepEqual(runCapability(value,state),{v_energy:1,v_score:10});assert.equal(state.v_energy,2);assert.throws(()=>runCapability(value,{v_energy:0}));assert.throws(()=>validateCapability({...value,operations:[{type:'shell',field:'v_x',value:0}]}));
});
