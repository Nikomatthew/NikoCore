import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMediaProxy } from './media-proxy.mjs';

test('媒体代理读取系统代理及PAC关联配置，环境变量优先', () => {
  assert.equal(parseMediaProxy({}, { ProxyEnable: 1, ProxyServer: '127.0.0.1:7897' }), 'http://127.0.0.1:7897/');
  assert.equal(parseMediaProxy({}, { AutoConfigURL: 'http://localhost/proxy.pac', ProxyServer: 'http=localhost:1;https=localhost:2' }), 'http://localhost:2/');
  assert.equal(parseMediaProxy({ NIKOLINK_MEDIA_PROXY: 'socks5://localhost:9' }, { ProxyEnable: 1, ProxyServer: 'localhost:1' }), 'socks5://localhost:9');
  assert.equal(parseMediaProxy({}, { ProxyEnable: 0, ProxyServer: 'localhost:1' }), null);
  assert.throws(() => parseMediaProxy({ NIKOLINK_MEDIA_PROXY: 'file:///C:/x' }));
});
