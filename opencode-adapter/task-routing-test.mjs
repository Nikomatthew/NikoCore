import test from 'node:test';
import assert from 'node:assert/strict';
import { naturalTask, taskRequest, requestedDelivery } from './owner-tasks.mjs';

test('自然语言下载视频发群优先作为主人任务，查看视频不创建任务', () => {
  const c = { ownerQQ: '123456', privateQQ: [], groupEnabled: true, groups: ['345678'] };
  const event = text => ({ post_type: 'message', message_type: 'group', user_id: 123456, self_id: 999999, group_id: 345678, message: [{ type: 'at', data: { qq: '999999' } }, { type: 'text', data: { text } }] });
  const text = '下载这个视频发到群里https://www.youtube.com/watch?v=MUcax98VCiE';
  assert.equal(taskRequest(event(text), c).text, text);
  assert.equal(requestedDelivery(text, true), 'source-group');
  assert.equal(naturalTask('帮我下载这个视频https://youtu.be/test'), true);
  assert.equal(naturalTask('下载 https://youtu.be/test 发给我'), true);
  assert.equal(naturalTask('不要下载这个视频'), false);
  assert.equal(taskRequest(event('看看这个视频https://youtu.be/test'), c), null);
  assert.equal(taskRequest({ ...event(text), user_id: 234567 }, c).denied, true);
  assert.equal(taskRequest({ ...event(text), message: [{ type: 'text', data: { text } }] }, c).ignored, true);
  assert.equal(requestedDelivery('下载这个视频https://youtu.be/test', true), 'console');
});
