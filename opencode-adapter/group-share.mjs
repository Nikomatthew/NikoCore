import { inQuietHours } from '../src/purpose-engine.js';
import { newsVideo } from './bili-readonly.mjs';

export function groupShareGate(config, state, now = Date.now(), manual = false) {
  if (config.mode !== 'reply' || !config.groupEnabled || !config.groupVideoShareEnabled) return '需要允许回复、群聊及群视频分享授权';
  if (inQuietHours(now, config)) return '当前处于安静时段';
  if (!manual && state.consumed) return '本轮安静期已分享或尝试分享，等待群成员发言';
  if (!manual && now - Math.max(state.lastHumanAt || 0, state.observedSince || now) < config.groupIdleHours * 3600000) return '尚未达到设定的安静时长';
  return '';
}
export class GroupShare {
  constructor(runtime) { this.runtime = runtime; this.busy = false; this.connected = false; this.previousConfig = structuredClone(runtime.store.value); this.data = runtime.data.groupVideo ??= {}; }
  state(group, now = Date.now()) { return this.data[group] ??= { lastHumanAt: 0, observedSince: now, consumed: false, seenVideos: [], lastAttemptAt: 0, lastResult: '' }; }
  reconnect() { this.connected = true; const now = Date.now(); for (const group of this.runtime.store.value.groups) this.state(group, now).observedSince = now; this.runtime.save(); }
  disconnected() { this.connected = false; }
  activity(event) {
    const c = this.runtime.store.value;
    if (!this.connected || !c.groupEnabled || event.post_type !== 'message' || event.message_type !== 'group' || String(event.user_id) === String(event.self_id) || !c.groups.includes(String(event.group_id))) return;
    const state = this.state(String(event.group_id)); state.lastHumanAt = Date.now(); state.consumed = false; this.runtime.save();
  }
  sync(old = this.previousConfig) {
    const c = this.runtime.store.value;
    const enabled = c.mode === 'reply' && c.groupEnabled && c.groupVideoShareEnabled;
    for (const group of c.groups) if (!old || !old.groups.includes(group) || enabled && !(old.mode === 'reply' && old.groupEnabled && old.groupVideoShareEnabled)) this.state(group).observedSince = Date.now();
    this.previousConfig = structuredClone(c);
  }
  async share(group, manual = false) {
    const r = this.runtime; const c = r.store.value;
    if (!/^\d{5,15}$/.test(group) || !c.groups.includes(group)) throw new Error('只能向已保存的白名单群分享');
    if (!this.connected) throw new Error('QQ连接未就绪，无法确认群里是否有新消息');
    const state = this.state(group); const reason = groupShareGate(c, state, Date.now(), manual); if (reason) throw new Error(reason);
    if (this.busy || r.status.pending > 0 || Date.now() - Math.max(c.lastSentAt || 0, state.lastAttemptAt || 0) < 10000) throw new Error('正在处理消息或分享过于频繁，请稍后');
    this.busy = true; const job=r.work.begin('group-share');
    const epoch = r.epoch; const lastHumanAt = state.lastHumanAt;
    try {
      let item = [...r.bili.data.history].reverse().find(v => newsVideo(v) && !state.seenVideos.includes(v.bv));
      if (!item) throw new Error('暂无可分享的新闻视频资料；独立API已停用，等待浏览器提供候选');
      if (!this.connected || r.epoch !== epoch || state.lastHumanAt !== lastHumanAt || !r.store.value.groups.includes(group)) throw new Error('配置、连接或群消息已变化，本次分享取消');
      const finalReason = groupShareGate(r.store.value, state, Date.now(), manual); if (finalReason) throw new Error(finalReason);
      const text = r.bili.shareText(item.bv);
      const target = { key: `group:${group}`, target: group, user: '', group: true, direct: false, text };
      state.consumed = true; state.lastAttemptAt = Date.now(); state.lastResult = '投递中；若中断不会自动重试'; state.seenVideos.push(item.bv); state.seenVideos = state.seenVideos.slice(-200); r.save();
      await r.send(target, text);
      r.store.value.lastSentAt = Date.now(); r.store.save(); r.status.sent++; state.lastResult = '已分享'; r.record(target, true);
      try { await r.videoOpinion(target, item, () => this.connected && r.epoch === epoch && state.lastHumanAt === lastHumanAt && r.store.value.groups.includes(group) && !groupShareGate(r.store.value, state, Date.now(), true)); } catch { state.lastResult = '链接已分享，观点生成或发送失败（未重试链接）'; r.save(); }
    } catch (e) { state.lastResult = e.message; if (!state.consumed) state.observedSince = Date.now(); r.save(); throw e; }
    finally { this.busy = false; job.end(); }
  }
  async tick() {
    const r = this.runtime; if (!this.connected || this.busy) return;
    for (const group of r.store.value.groups) { const state = this.state(group); if (!groupShareGate(r.store.value, state)) { try { await this.share(group); } catch (e) { r.status.lastError = `群视频分享：${e.message}`; } break; } }
  }
  inspect() { return Object.fromEntries(this.runtime.store.value.groups.map(group => { const s = this.state(group); return [group, { ...s, reason: this.connected ? groupShareGate(this.runtime.store.value, s) : 'QQ未连接，暂停计时', dueAt: Math.max(s.lastHumanAt, s.observedSince) + this.runtime.store.value.groupIdleHours * 3600000 }]; })); }
}
