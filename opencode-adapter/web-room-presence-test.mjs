import test from 'node:test';
import assert from 'node:assert/strict';
import {WebRoomPresence} from './web-room-presence.mjs';
test('网页五秒有效数据保活，过期不停止房间，重新读取可恢复',()=>{
 let now=1000;const presence=new WebRoomPresence({now:()=>now});const room={id:'room',game:'demo',status:'playing',players:['a','b'],owner:'a',state:{hp:100},version:1};let saves=0;const runtime={entry:()=>({kind:'gomoku',runtime:{save(){saves++;}},rooms:()=>({room})})};presence.touch('a',{id:'demo',kind:'gomoku'},room);assert.throws(()=>presence.check('a','other',null,'create'),/退出/);now+=5000;presence.sweep(runtime);assert.equal(presence.entries.has('a'),true);now++;presence.sweep(runtime);assert.equal(presence.entries.has('a'),false);assert.equal(room.status,'playing');assert.equal(room.state.hp,100);assert.ok(room.departed.includes('a'));assert.equal(saves,1);presence.touch('a',{id:'demo',kind:'gomoku'},room);assert.equal(presence.entries.has('a'),true);
});
test('超时退出不能继续操作，重新加入恢复座位但不销毁其他人的对局',()=>{
 let now=1000;const presence=new WebRoomPresence({now:()=>now}),room={id:'room',game:'demo',status:'playing',members:['a','b'],owner:'a',state:{kind:'undercover',words:{a:'秘密'}},version:1};let saved=0;const runtime={entry:()=>({kind:'undercover',runtime:{rooms:{save(){saved++;}}},rooms:()=>({room})})};presence.touch('a',{id:'demo',kind:'undercover'},room);now+=5001;presence.sweep(runtime);assert.equal(presence.departed(runtime,{id:'demo'},'room','a'),true);assert.equal(room.status,'playing');assert.equal(saved,1);assert.equal(presence.rejoin(runtime,{id:'demo'},'room','a'),true);assert.equal(presence.departed(runtime,{id:'demo'},'room','a'),false);assert.equal(room.state.words.a,'秘密');assert.equal(saved,2);
});
