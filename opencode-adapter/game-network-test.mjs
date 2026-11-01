import test from 'node:test';
import assert from 'node:assert/strict';
import {gameNetworkSettings} from './game-network.mjs';
import {validate,defaults} from './core.mjs';
test('游戏关闭时公网设置不阻止其他配置，开启时重新校验',()=>{
 const old={...defaults,model:'fixture/model',revision:0,gameNetworkMode:'custom',gamePublicURL:'https://game.example.com',webGamePort:18770,gamesEnabled:false};
 const next=validate({gamesEnabled:false,gameNetworkMode:'',gamePublicURL:'bad',webGamePort:-1,persona:'更新人设'},old);
 assert.equal(next.persona,'更新人设');assert.equal(next.gameNetworkMode,'custom');assert.equal(next.gamePublicURL,old.gamePublicURL);assert.equal(next.webGamePort,18770);
 assert.throws(()=>validate({gamesEnabled:true,gameNetworkMode:''},old),/公网方式无效/);
 assert.equal(validate({gamesEnabled:true},old).gameNetworkMode,'custom');
});
test('自备穿透使用配对映射，不再读取兼容单地址',()=>{
  assert.deepEqual(gameNetworkSettings(),{gameNetworkMode:'cloudflare',gamePublicURL:'',webGamePort:0,gamePortMappings:''});
  assert.equal(gameNetworkSettings({gameNetworkMode:'custom',webGamePort:18770}).webGamePort,18770);assert.throws(()=>gameNetworkSettings({gameNetworkMode:'custom',webGamePort:80}));
  assert.equal(gameNetworkSettings({gameNetworkMode:'custom',gamePublicURL:' https://game.example.com/ '}).gamePublicURL,'');
  for(const address of ['https://user:pass@example.com','https://example.com/game','https://example.com/?token=secret','https://localhost'])assert.throws(()=>gameNetworkSettings({gameNetworkMode:'custom',gamePortMappings:address+' 12334'}));
 assert.throws(()=>gameNetworkSettings({gameNetworkMode:'unknown'}));assert.equal(gameNetworkSettings({}, {gameNetworkMode:'custom',gamePublicURL:'https://game.example.com'}).gameNetworkMode,'custom');
});
