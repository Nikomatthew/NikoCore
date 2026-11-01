import test from 'node:test';
import assert from 'node:assert/strict';
import {executeFlow,validateFlow} from './game-packages/flow.mjs';
import {FPSRooms} from './game-packages/fps.mjs';
test('通用流程阶段、步骤上限和失败原子性',()=>{
 const flow={version:1,initial:'start',states:['start','end'],values:{v_energy:1},actions:[{command:'/工作',from:'start',to:'end',steps:[{op:'require',field:'v_energy',compare:'gte',value:1},{op:'add',field:'v_energy',value:-1}],reply:'体力{v_energy}'}]};const state={};assert.equal(executeFlow({flow},state,'/工作'),'体力0');assert.equal(state.flowPhase,'end');assert.throws(()=>executeFlow({flow},state,'/工作'));const failed={flowValues:{v_energy:0}};assert.throws(()=>executeFlow({flow},failed,'/工作'));assert.equal(failed.flowPhase,undefined);assert.throws(()=>validateFlow({...flow,actions:[{...flow.actions[0],steps:[{op:'shell',field:'v_energy'}]}]}));
});
test('FPS服务器限速、碰撞、射击冷却、命中和重生',()=>{
 let now=10000;const runtime=new FPSRooms({now:()=>now}),game={id:'arena'};let room=runtime.act(game,'a',{operation:'create'});runtime.act(game,'b',{operation:'join',room:room.id});const r=runtime.rooms[room.id],a=r.units.a,b=r.units.b;a.x=2.5;a.y=2.5;b.x=4.5;b.y=2.5;
 const input=(seq,fire=false)=>({operation:'input',room:r.id,seq,angle:0,forward:0,strafe:0,fire});runtime.act(game,'a',input(1,true));assert.equal(b.hp,75);runtime.act(game,'a',input(2,true));assert.equal(b.hp,75);now+=300;runtime.act(game,'a',input(3,true));assert.equal(b.hp,50);for(const seq of [4,5]){now+=300;runtime.act(game,'a',input(seq,true));}assert.equal(b.hp,0);assert.equal(a.kills,1);now+=3001;runtime.act(game,'b',{operation:'read',room:r.id});assert.equal(b.hp,100);const before=a.x;now+=100000;runtime.act(game,'a',{...input(6),forward:1});assert.ok(a.x-before<=.451);runtime.act(game,'a',{...input(6),forward:1});assert.ok(a.x-before<=.451);assert.throws(()=>runtime.act(game,'a',{...input(7),forward:100}));assert.throws(()=>runtime.act(game,'x',{operation:'read',room:r.id}));
 a.x=2.5;a.y=3.5;b.x=7.5;b.y=3.5;b.hp=100;now+=300;runtime.act(game,'a',input(8,true));assert.equal(b.hp,100);
});
