import test from 'node:test';
import assert from 'node:assert/strict';
import {standaloneHostClient} from './standalone-sdk.mjs';
import {webGameClient} from './web-game-client.mjs';
test('独立游戏单游戏登录后自动铺满窗口，不取消隔离或强制浏览器全屏',()=>{
 assert.match(webGameClient,/autoLaunch:data.games.length===1/);
 assert.match(standaloneHostClient,/if\(game.autoLaunch\)void start.onclick\(\)/);
 assert.match(standaloneHostClient,/section.replaceChildren\(frame\)/);
 assert.match(standaloneHostClient,/position:fixed;inset:0;width:100%;height:100dvh/);
 assert.match(standaloneHostClient,/allowfullscreen/);
 assert.match(standaloneHostClient,/sandbox','allow-scripts allow-pointer-lock/);
 assert.doesNotThrow(()=>new Function(webGameClient));
});
