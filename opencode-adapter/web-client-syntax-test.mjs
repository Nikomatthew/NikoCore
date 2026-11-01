import test from 'node:test';
import assert from 'node:assert/strict';
import {webGameClient} from './web-game-client.mjs';
test('最终发送的网页脚本包含FPS函数且能解析，不只校验模板模块语法',()=>{
 assert.doesNotThrow(()=>new Function(webGameClient));assert.match(webGameClient,/function fpsUI/);assert.match(webGameClient,/fps-socket/);assert.match(webGameClient,/function socialUI/);
});
