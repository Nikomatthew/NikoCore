import test from 'node:test';
import assert from 'node:assert/strict';
import { MediaRecognition } from './media-recognition.mjs';
import { collectionDue } from './group-pacing.mjs';

const config = () => ({ mode: 'reply', ownerQQ: '123456', privateQQ: [], mediaQQ: ['123456'], groupEnabled: true, groups: ['345678'], revision: 1, seen: [] });
const event = (message, id = 1, user = 123456, group = 345678) => ({ post_type: 'message', message_type: 'group', group_id: group, user_id: user, self_id: 999999, message_id: id, message });
const request = () => event([{ type: 'at', data: { qq: '999999' } }, { type: 'text', data: { text: '帮我看看我发的视频' } }]);
const video = (id = 2, user, group) => event([{ type: 'file', data: { name: 'sample.mp4', url: 'https://example.qq.com/video' } }], id, user, group);
function harness() {
  const c = config(), logs = [], received = [];
  const host = { ready: false, output: { add: (...args) => logs.push(args) } };
  const runtime = { status: {}, send: async () => {}, record: () => {} };
  const media = new MediaRecognition('.', { value: c, save() {} }, host, runtime, async () => {}, r => received.push(r));
  return { media, c, logs, received };
}

test('先艾特请求再发文件：请求不交给普通聊天，媒体进入接收记录', async () => {
  const { media, received, logs } = harness();
  assert.equal(await media.receive(request()), true);
  await media.receive(video());
  assert.equal(received.length, 1);
  assert.ok(received[0].text.includes('视频'));
  assert.ok(logs.some(args => String(args[2]).includes('未就绪')));
});

test('媒体后续授权不跨人不跨群，单次使用，配置变化或过期失效', async () => {
  for (const variation of ['user', 'group', 'revision', 'expired', 'used']) {
    const { media, c, received } = harness();
    await media.receive(request());
    if (variation === 'revision') c.revision++;
    if (variation === 'expired') for (const value of media.pendingRequests.values()) value.expiresAt = 0;
    if (variation === 'used') { await media.receive(video()); received.length = 0; }
    await media.receive(video(3, variation === 'user' ? 234567 : 123456, variation === 'group' ? 456789 : 345678));
    assert.equal(received.filter(r => r.accepted).length, 0, variation);
  }
});

test('巅峰收集最快，畅聊多等补充，不改变节奏模式', () => {
  const items = [{ at: 100000, text: '说句话' }];
  assert.ok(collectionDue(items, 0, 'peak') < collectionDue(items, 0, 'lively'));
  assert.equal(collectionDue(items, 0, 'lively'), 112000);
  assert.equal(collectionDue(items, 0, 'paced'), 112000);
});
