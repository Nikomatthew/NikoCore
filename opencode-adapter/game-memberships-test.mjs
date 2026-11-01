import test from 'node:test';
import assert from 'node:assert/strict';
import {GameMemberships} from './game-memberships.mjs';
test('统一玩家房间租约跨游戏和Bot限制，五秒超时释放',()=>{
 let now=1000,bot=false;const registry=new GameMemberships({now:()=>now,botRoom:()=>bot?{}:null});registry.acquire('qq:123456','one');registry.touch('qq:123456','one','room1');assert.ok(registry.occupiedQQ('123456'));assert.throws(()=>registry.acquire('qq:123456','two','room2'));assert.throws(()=>registry.acquire('qq:123456','one'));registry.touch('qq:123456','one','room1');now+=5001;assert.equal(registry.occupiedQQ('123456'),null);registry.acquire('qq:123456','two','room2');registry.release('qq:123456','two','room2');bot=true;assert.throws(()=>registry.acquire('qq:123456','two','room2'));registry.acquire('12345678-abcd-abcd-abcd-123456789abc','one');registry.touch('12345678-abcd-abcd-abcd-123456789abc','one','room');registry.removeGame('one');assert.equal(registry.entries.size,0);
});
