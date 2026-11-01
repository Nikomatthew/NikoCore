import test from 'node:test';
import assert from 'node:assert/strict';
import {gameRatePolicy} from './game-http-rate.mjs';
import {WebRoomPresence} from './web-room-presence.mjs';
test('游戏动作限频与房间管理分桶，不耗尽每分钟房间请求额度',()=>{const world=gameRatePolicy('/api/world',{id:'a'}),room=gameRatePolicy('/api/room',{id:'a'});assert.notEqual(world.bucket,room.bucket);assert.equal(world.window,1000);assert.equal(world.limit,25);assert.equal(room.limit,120);});
test('独立房间最后一人超时后关闭，避免空房占用创建配额',()=>{let now=0;const presence=new WebRoomPresence({now:()=>now}),room={id:'123456',game:'demo',players:['a'],status:'playing',version:0,owner:'a'},runtime={entry:()=>({runtime:{save(){}},rooms:()=>({'123456':room})})};presence.touch('a',{id:'demo',kind:'standalone'},{id:room.id});now=5001;presence.sweep(runtime);assert.equal(room.status,'closed');assert.deepEqual(room.players,[]);});
