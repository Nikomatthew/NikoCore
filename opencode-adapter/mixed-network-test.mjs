import test from 'node:test';
import assert from 'node:assert/strict';
import {selectGameRoute} from './game-route-allocation.mjs';
test('两条自备映射分配后自动回退Cloudflare，释放后复用',()=>{
 const config={gameNetworkMode:'custom',gamePortMappings:'game.example.com 12334\nexample.com:21000 23122'},claims=new Map();
 const first=selectGameRoute(config,claims);assert.equal(first.port,12334);claims.set('a',first.port);
 const second=selectGameRoute(config,claims);assert.equal(second.port,23122);claims.set('b',second.port);
 assert.equal(selectGameRoute(config,claims),null);claims.delete('a');assert.equal(selectGameRoute(config,claims).port,12334);
 assert.equal(selectGameRoute({gameNetworkMode:'cloudflare',gamePortMappings:'invalid'},claims),null);
});
