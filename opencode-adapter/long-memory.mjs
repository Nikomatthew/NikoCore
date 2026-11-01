import fs from 'node:fs';
import path from 'node:path';
import {selectMemoryRecords} from './memory-selection.mjs';
import { resolveMemoryCardPaths, maintainMemoryCard, loadMemoryCard, renderMemoryCard, memoryCardStatus, redactForMemory } from '../src/memory-card.js';

export class LongMemory {
  constructor(dir, getConfig) { this.dir = dir; this.getConfig = getConfig; }
  paths(key) { if (!/^(private|group):\d{5,15}$/.test(key)) throw new Error('无效记忆分区'); return resolveMemoryCardPaths(path.join(this.dir, key.replace(':', '-'))); }
  config() { const c = this.getConfig(); return { recentDays: c.memoryRecentDays, fuzzyAfterDays: c.memoryRecentDays, forgetAfterDays: c.memoryForgetDays, maxRecords: 600, maxChars: 24000, autoCompact: true, notifyOwner: false, injectMaxChars: { qq: 2200 } }; }
  verify(paths) { if (fs.existsSync(paths.json)) JSON.parse(fs.readFileSync(paths.json, 'utf8')); }
  ingest(r, { isSelf = false, now = Date.now() } = {}) {
    const c = this.getConfig(); if (!c.autoMemory || c.mode === 'paused') return;
    const paths = this.paths(r.key); this.verify(paths);
    const item = { at: new Date(now).toISOString(), kind: r.group ? 'group' : 'private', senderId: isSelf ? 'bot' : r.user, isOwner: !isSelf && r.user === c.ownerQQ, isSelf, private: !r.group, direct: r.direct || isSelf, conversationKey: r.key, groupId: r.group ? r.target : '', text: redactForMemory(r.text, { maxChars: 600 }) };
    maintainMemoryCard({ paths, fullPaths: paths, config: this.config(), inboxLines: [JSON.stringify(item)], now });
  }
  maintain(now = Date.now()) {
    if (!this.getConfig().autoMemory || !fs.existsSync(this.dir)) return;
    for (const name of fs.readdirSync(this.dir)) if (/^(private|group)-\d{5,15}$/.test(name)) { const paths = this.paths(name.replace('-', ':')); this.verify(paths); maintainMemoryCard({ paths, fullPaths: paths, config: this.config(), now }); }
  }
  card(key) { const paths = this.paths(key); this.verify(paths); return loadMemoryCard(paths); }
  prompt(key,query) { if (!this.getConfig().autoMemory) return ''; const card = this.card(key); const selected=card&&query?{...card,records:selectMemoryRecords(card.records,query)}:card;return selected ? renderMemoryCard(selected, { config: this.config(), platform: 'qq', maxChars: 2200 }) : ''; }
  inspect(key) { const card = this.card(key); return card ? { status: memoryCardStatus(card, this.config()), records: card.records.slice(-60).map(r => ({ id: r.id, title: r.title, text: r.text, clarity: r.clarity, pinned: r.pinned })), prompt: this.prompt(key) } : { status: null, records: [], prompt: '' }; }
  reset(key) { const paths = this.paths(key); if (fs.existsSync(paths.dir)) { const backups = path.join(this.dir, '_backups'); fs.mkdirSync(backups, { recursive: true }); fs.renameSync(paths.dir, path.join(backups, `${key.replace(':', '-')}-${Date.now()}`)); } }
}
