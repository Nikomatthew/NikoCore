import test from 'node:test';
import assert from 'node:assert/strict';
import { allowWebRequest } from './web-permissions.mjs';

test('原生搜索接受50字公开查询，不因旧48字限制中断整轮', async () => {
  assert.equal(await allowWebRequest({ action: 'websearch', resources: ['公开游戏攻略'.repeat(8) + '问题'] }), true);
  assert.equal(await allowWebRequest({ action: 'websearch', resources: ['公开资料'.repeat(9) + '查询词'] }), true);
  assert.equal(await allowWebRequest({ action: 'websearch', resources: ['a'.repeat(121)] }), false);
  assert.equal(await allowWebRequest({ action: 'websearch', resources: ['公开资料 1234567890'] }), false);
  assert.equal(await allowWebRequest({ action: 'shell', resources: ['echo hello'] }), false);
});
