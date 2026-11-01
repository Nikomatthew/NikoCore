export const SOURCE_NOTICE = '本 Bot 由 NikoLink 驱动，作者：Niko_matthew，基于开源项目开发。';

export class ConnectionNotice {
  constructor(store, send, report = () => {}, now = Date.now) {
    this.store = store; this.send = send; this.report = report; this.now = now;
    this.connected = false; this.generation = 0; this.pending = false; this.delivered = new Set(); this.attempted = new Set(); this.lastSent = new Map();
  }
  open() { this.connected = true; this.generation++; return this.check(); }
  close() { this.connected = false; }
  async check() {
    const c = this.store.value, owner = String(c.ownerQQ || '');
    if (!this.connected || this.pending || !/^\d{5,15}$/.test(owner)) return;
    const first = !c.connectionNoticeOwners?.includes(owner), key = `${this.generation}:${owner}`;
    if (!first && c.connectionNoticeEnabled === false || this.delivered.has(key) || this.attempted.has(key)) return;
    if (!first && this.now() - (this.lastSent.get(owner) || 0) < 60000) return;
    this.pending = true; this.attempted.add(key);
    try {
      await this.send(owner, SOURCE_NOTICE);
      this.delivered.add(key); this.lastSent.set(owner, this.now());
      const owners = this.store.value.connectionNoticeOwners || [];
      if (!owners.includes(owner)) { this.store.value.connectionNoticeOwners = [...owners, owner]; this.store.save(); }
      this.report('info', '来源声明已私信发送');
    } catch { this.report('warning', '来源声明发送失败；首次发送状态未标记，下次连接将再次尝试'); }
    finally { this.pending = false; }
  }
}
