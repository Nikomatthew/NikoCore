import test from 'node:test';
import assert from 'node:assert/strict';
import {formatGameLatency,gameLatencyClient} from './game-latency.mjs';
test('游戏延迟毫秒/秒格式和十秒共用探测',()=>{
 assert.equal(formatGameLatency(30),'30ms');assert.equal(formatGameLatency(9000),'9s');assert.equal(formatGameLatency(1250),'1.3s');assert.equal(formatGameLatency(999),'999ms');assert.equal(formatGameLatency(NaN),'连接中断');assert.match(gameLatencyClient,/setInterval\(measureLatency,10000\)/);assert.match(gameLatencyClient,/document.hidden/);assert.doesNotThrow(()=>new Function(gameLatencyClient));
});
