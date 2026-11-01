import test from 'node:test';
import assert from 'node:assert/strict';
import { GroupSourceNotice } from './group-source-notice.mjs';

test('群来源声明首次与新增群单独发送，重启和配置刷新不重复', async () => {
  const store = { value: { groupEnabled: true, groups: ['123456'], connectionNoticeEnabled: false }, save() {} };
  const sent = [], notice = new GroupSourceNotice(store, async group => sent.push(group));
  await notice.open(); await notice.check(); await notice.open();
  assert.deepEqual(sent, ['123456']);
  store.value.groups.push('234567'); await notice.check();
  assert.deepEqual(sent, ['123456', '234567']);
  store.value.groupEnabled = false; store.value.groups.push('345678'); await notice.check();
  assert.equal(sent.length, 2);
});

test('群通知失败不记成功，断线后不发送，下次连接重试', async () => {
  const store = { value: { groupEnabled: true, groups: ['123456'] }, save() {} };
  let fail = true, count = 0;
  const notice = new GroupSourceNotice(store, async () => { count++; if (fail) throw Error(); });
  await notice.open(); await notice.check(); assert.equal(count, 1);
  assert.equal(store.value.sourceNoticeGroups, undefined);
  notice.close(); fail = false; await notice.check(); assert.equal(count, 1);
  await notice.open(); assert.deepEqual(store.value.sourceNoticeGroups, ['123456']);
});
