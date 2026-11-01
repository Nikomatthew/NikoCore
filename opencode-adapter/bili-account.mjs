import fs from 'node:fs';
import path from 'node:path';
import QRCode from 'qrcode';

const base = 'https://passport.bilibili.com';
export function validLoginURL(raw) {
  const url = new URL(raw);
  if (url.protocol !== 'https:' || url.username || url.password || url.port && url.port !== '443') return false;
  return ['passport.bilibili.com', 'passport.bilibili.com.cn'].includes(url.hostname) || url.hostname === 'account.bilibili.com' && url.pathname === '/h5/account-h5/auth/scan-web';
}
export class BiliAccount {
  constructor(dir, request = fetch) { this.file = path.join(dir, 'bili-account.json'); this.request = request; this.pending = null; this.polling = false; this.value = fs.existsSync(this.file) ? JSON.parse(fs.readFileSync(this.file, 'utf8')) : {}; }
  cookie() { return typeof this.value.sessdata === 'string' && /^[^;\r\n]+$/.test(this.value.sessdata) ? `SESSDATA=${this.value.sessdata}` : ''; }
  status() { return { loggedIn: Boolean(this.cookie()), savedAt: this.value.savedAt || null, pending: Boolean(this.pending && this.pending.expiresAt > Date.now()) }; }
  async read(route, query = {}) {
    if (!['/x/passport-login/web/qrcode/generate', '/x/passport-login/web/qrcode/poll'].includes(route)) throw new Error('登录接口不允许');
    const url = new URL(route, base); for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
    const response = await this.request(url, { method: 'GET', redirect: 'error', signal: AbortSignal.timeout(12000), headers: { Referer: 'https://www.bilibili.com/', 'User-Agent': 'Mozilla/5.0' } });
    if (!response.ok) throw new Error('B站登录接口暂不可用');
    const value = await response.json(); if (value.code !== 0) throw new Error('B站登录请求被拒绝'); return { data: value.data, headers: response.headers };
  }
  async begin() {
    if (this.polling) throw new Error('登录状态检查中，请稍后');
    const { data } = await this.read('/x/passport-login/web/qrcode/generate');
    const url = new URL(data.url); if (!validLoginURL(url.toString())) throw new Error('登录二维码来源不符合预期');
    if (typeof data.qrcode_key !== 'string') throw new Error('登录二维码无效');
    this.pending = { key: data.qrcode_key, expiresAt: Date.now() + 170000, lastPoll: 0 };
    return { image: await QRCode.toDataURL(url.toString(), { width: 240, margin: 2 }), expiresAt: this.pending.expiresAt };
  }
  async poll() {
    const pending = this.pending;
    if (!pending || Date.now() >= pending.expiresAt) { this.pending = null; return { state: 'expired' }; }
    if (this.polling || Date.now() - pending.lastPoll < 2500) return { state: 'waiting' };
    this.polling = true; pending.lastPoll = Date.now();
    try {
      const { data, headers } = await this.read('/x/passport-login/web/qrcode/poll', { qrcode_key: pending.key });
      if (this.pending !== pending) return { state: 'cancelled' };
      if (data.code === 0) {
        const cookies = headers.getSetCookie?.() || [];
        const found = cookies.map(c => c.match(/^SESSDATA=([^;]+)/i)?.[1]).find(Boolean);
        if (!found || /[;\r\n]/.test(found)) throw new Error('登录成功但未取得本机会话凭据');
        this.value = { sessdata: found, savedAt: new Date().toISOString() };
        fs.writeFileSync(`${this.file}.tmp`, JSON.stringify(this.value), { mode: 0o600 }); fs.renameSync(`${this.file}.tmp`, this.file); this.pending = null;
        return { state: 'logged-in' };
      }
      if (data.code === 86038) { this.pending = null; return { state: 'expired' }; }
      return { state: data.code === 86090 ? 'confirm-on-phone' : 'waiting' };
    } finally { this.polling = false; }
  }
  logout() { this.pending = null; if (fs.existsSync(this.file)) { const dir = path.join(path.dirname(this.file), 'credential-backups'); fs.mkdirSync(dir, { recursive: true }); fs.renameSync(this.file, path.join(dir, `bili-account-${Date.now()}.json`)); } this.value = {}; return this.status(); }
}
