import test from 'node:test';
import assert from 'node:assert/strict';
import {RoomActionQueue} from './room-action-queue.mjs';
import {webAuthoringPrompt} from './web-authoring-prompt.mjs';
import {botAuthoringWorkflow} from './bot-authoring-workflow.mjs';
test('同房两人重叠动作顺序执行，不丢失前一次状态',async()=>{
 const queue=new RoomActionQueue();let release,state=0;const gate=new Promise(resolve=>release=resolve);
 const first=queue.run('room',async()=>{await gate;state++;return state;});const second=queue.run('room',async()=>{state++;return state;});release();assert.deepEqual(await Promise.all([first,second]),[1,2]);assert.equal(queue.rooms.size,0);
});
test('队列限长且失败后后续操作仍执行',async()=>{
 const queue=new RoomActionQueue(1);let release;const first=queue.run('room',()=>new Promise(resolve=>release=resolve));await assert.rejects(()=>queue.run('room',async()=>{}),/队列已满/);release();await first;await assert.rejects(()=>queue.run('room',async()=>{throw Error('fixture');}));assert.equal(await queue.run('room',async()=>3),3);
});
test('作者可选多语言客户端且Bot遵守真实回复和改版规则',()=>{
 const text=webAuthoringPrompt();for(const name of ['Babylon.js','TypeScript','WebGPU','WebGL'])assert.ok(text.includes(name));assert.match(text,/不能让浏览器直接执行TS/);assert.match(botAuthoringWorkflow(),/回复应体现/);assert.match(botAuthoringWorkflow(),/存档字段/);
});
