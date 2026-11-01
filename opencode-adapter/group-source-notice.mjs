import { SOURCE_NOTICE } from './connection-notice.mjs';

export class GroupSourceNotice {
  constructor(store, send, report = () => {}) { this.store = store; this.send = send; this.report = report; this.connected = false; this.pending = false; this.attempted = new Set(); }
  open() { this.connected = true; this.attempted.clear(); return this.check(); }
  close() { this.connected = false; }
  async check() {
    if (!this.connected || this.pending || !this.store.value.groupEnabled) return;
    this.pending = true;
    try {
      for (const group of [...new Set(this.store.value.groups || [])]) {
        const c = this.store.value;
        if (!this.connected || !c.groupEnabled) break;
        if (!/^\d{5,15}$/.test(group) || !c.groups.includes(group) || c.sourceNoticeGroups?.includes(group) || this.attempted.has(group)) continue;
        this.attempted.add(group);
        try {
          await this.send(group, SOURCE_NOTICE);
          this.store.value.sourceNoticeGroups = [...new Set([...(this.store.value.sourceNoticeGroups || []), group])];
          this.store.save(); this.report('info', `群 ${group} 来源声明已发送`);
        } catch { this.report('warning', `群 ${group} 来源声明发送失败，下次连接重试`); }
      }
    } finally { this.pending = false; }
  }
}
