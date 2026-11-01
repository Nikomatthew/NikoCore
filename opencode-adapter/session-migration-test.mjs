import test from 'node:test';
import assert from 'node:assert/strict';
import { Host } from './host.mjs';
import { defaults } from './core.mjs';

test('迁移后不复用旧目录会话，新会话仍必须通过隔离检查', async () => {
  const c = { ...structuredClone(defaults), revision: 1, sessions: { 'group:123456': { id: 'old', revision: 1 } } };
  const host = new Host('.', { value: c, save() {} });
  host.ready = true; host.workspace = 'new-workspace';
  const calls = [];
  host.call = async (url, body) => {
    calls.push(url);
    if (url === '/api/session/old') return { data: { agent: 'nikolink-chat', location: { directory: 'old-workspace' } } };
    if (url === '/api/session' && body) return { data: { id: 'new' } };
    if (url === '/api/session/new') return { data: { agent: 'wrong-agent', location: { directory: host.workspace }, permissions: [{ action: '*', effect: 'deny' }] } };
    throw Error('unexpected API');
  };
  await assert.rejects(host.modelReply({ key: 'group:123456', group: true }, c), /会话隔离校验失败/);
  assert.equal(c.sessions['group:123456'].id, 'new');
  assert.ok(calls.includes('/api/session'));
  assert.ok(!calls.some(url => url.endsWith('/prompt')));
});
