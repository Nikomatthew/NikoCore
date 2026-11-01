import test from 'node:test';
import assert from 'node:assert/strict';
import { ConnectionNotice } from './connection-notice.mjs';

test('首次声明不受关闭开关影响，成功后遵守开关，填写主人后触发', async () => {
  const store = { value: { ownerQQ: '', connectionNoticeEnabled: false }, save() {} };
  const sent = [];
  const notice = new ConnectionNotice(store, async (owner, text) => sent.push({ owner, text }));
  await notice.open(); assert.equal(sent.length, 0);
  store.value.ownerQQ = '1234567890';
  await notice.check(); assert.equal(sent.length, 1);
  await notice.check(); await notice.open(); assert.equal(sent.length, 1);
  assert.deepEqual(store.value.connectionNoticeOwners, ['1234567890']);
  store.value.ownerQQ = '9876543210'; await notice.check(); assert.equal(sent.length, 2);
});

test('默认开启且重连防刷，发送失败不记为首次成功', async () => {
  let now = 100000, fail = true;
  const store = { value: { ownerQQ: '1234567890' }, save() {} }, sent = [];
  const notice = new ConnectionNotice(store, async () => { if (fail) throw Error('offline'); sent.push(1); }, () => {}, () => now);
  await notice.open(); assert.equal(store.value.connectionNoticeOwners, undefined);
  fail = false; await notice.open(); assert.equal(sent.length, 1);
  await notice.open(); assert.equal(sent.length, 1);
  now += 61000; await notice.open(); assert.equal(sent.length, 2);
});
