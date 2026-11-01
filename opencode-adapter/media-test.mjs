import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { mediaAllowed } from './media-access.mjs';
import { mediaInput } from './media-recognition.mjs';
import { pickFrameTimes } from './video-storyboard.mjs';

test('识别白名单独立、主人无隐式授权，群里必须艾特', () => {
  const config = { mode: 'reply', ownerQQ: '123456', privateQQ: ['234567'], mediaQQ: ['234567'], groupEnabled: true, groups: ['345678'] };
  const event = { post_type: 'message', self_id: 999999, user_id: 234567, message_type: 'private', message: [] };
  assert.equal(mediaAllowed(event, config), true);
  assert.equal(mediaAllowed({ ...event, user_id: 123456 }, config), false);
  assert.equal(mediaAllowed(event, { ...config, mediaQQ: [] }), false);
  const group = { ...event, message_type: 'group', group_id: 345678 };
  assert.equal(mediaAllowed(group, config), false);
  assert.equal(mediaAllowed({ ...group, message: [{ type: 'at', data: { qq: '999999' } }] }, config), true);
  assert.equal(mediaAllowed({ ...group, group_id: 111111, message: [{ type: 'at', data: { qq: '999999' } }] }, config), false);
  assert.equal(mediaAllowed(event, { ...config, mode: 'paused' }), false);
});

test('媒体入口只接受QQ媒体或指定平台，不接受伪造域名', () => {
  const event = text => ({ message: [{ type: 'text', data: { text } }] });
  assert.equal(mediaInput(event('https://youtu.be/abc')).kind, 'video');
  assert.equal(mediaInput(event('https://www.bilibili.com/video/BVabc')).kind, 'video');
  assert.equal(mediaInput(event('https://youtube.com.evil.example/a')), null);
  assert.equal(mediaInput(event('https://127.0.0.1/a')), null);
  assert.equal(mediaInput({ message: [{ type: 'record', data: { file: 'a' } }] }).kind, 'audio');
});

test('关键帧覆盖九个时间区间，场景切换后取帧，最多五分钟', () => {
  const times = pickFrameTimes(900, [12, 40, 150]);
  assert.equal(times.length, 9);
  assert.ok(times.every((time, index) => time >= index * 300 / 9 && time < (index + 1) * 300 / 9));
  assert.equal(pickFrameTimes(90, [5])[0], 5.2);
  assert.ok(pickFrameTimes(0.01).every(time => time >= 0 && time < 0.01));
  assert.throws(() => pickFrameTimes(NaN));
});

test('视频处理不依赖第三方插件运行时', () => {
  const source = fs.readFileSync(new URL('./media-recognition.mjs', import.meta.url), 'utf8');
  assert.ok(!source.includes('vendor'));
  assert.ok(source.includes('buildStoryboard'));
});
