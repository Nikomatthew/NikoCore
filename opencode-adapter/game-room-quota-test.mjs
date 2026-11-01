import test from 'node:test';
import assert from 'node:assert/strict';
import {GameRoomQuota} from './game-room-quota.mjs';
test('跨游戏房间预留计入总限额，取消/结束释放，Bot纳入同一上限',()=>{
 let now=1000;const config={gameMaxRooms:2,gameMaxRunning:1},bot=[];const quota=new GameRoomQuota(()=>config,{now:()=>now,botRooms:()=>bot});const one=quota.reserve('one');assert.throws(()=>quota.reserve('two'));quota.commit('one',one.token,'room1');const two=quota.reserve('one');assert.throws(()=>quota.reserve('one'));quota.cancel('one',two.token);quota.finish('one','room1');bot.push({game:'bot',status:'playing'});assert.throws(()=>quota.reserve('one'));config.gameMaxRunning=2;const reservation=quota.reserve('one');now+=10001;assert.throws(()=>quota.commit('one',reservation.token,'late'));assert.equal(quota.counts().count,1);bot[0].status='closed';assert.equal(quota.counts().count,0);
});
