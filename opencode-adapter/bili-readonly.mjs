import fs from 'node:fs';
import path from 'node:path';
import { sample } from './core.mjs';
import { BiliAccount } from './bili-account.mjs';

const paths = new Set(['/x/web-interface/index/top/rcmd', '/x/web-interface/view', '/x/v2/reply']);
export function homeQuery() { return { ps: 12, fresh_type: 3, version: 1, fresh_idx: 1, fresh_idx_1h: 1, brush: 0, homepage_ver: 1 }; }
export function newsVideo(video) {
  const author = String(video.author ?? video.owner?.name ?? '');
  const title = String(video.title ?? '');
  const newsSource = /^(央视新闻|央视网|央视网快看|新华社|新华网|人民日报|人民网|中国新闻网|中国日报|环球网|中国军号|国防部发布|外交部发言人办公室|CGTN)$/i.test(author);
  const topic = /新闻|时政|国家|国务院|外交|国防|国际|峰会|联合国|发布会|经济|政策|中国|我国|两会|军事|航天|中美|中俄|中欧|主席|总理|总统|政府|局势|会谈|访问|外长|国事|边境|俄乌|巴以|关税|选举|贸易|全国|中东|战事|停火|谈判|导弹|军演|制裁|财政|央行/;
  return newsSource && topic.test(title);
}
export function videoID(input) { const m = String(input).trim().match(/^(?:https:\/\/www\.bilibili\.com\/video\/)?(BV[A-Za-z0-9]{10})(?:\/?(?:\?[^\s]*)?)?$/); if (!m) throw new Error('只接受 BV 号或 www.bilibili.com/video/BV 链接'); return m[1]; }
export class BiliReadonly {
  constructor(dir, getConfig, request = fetch) { this.getConfig = getConfig; this.request = request; this.account = new BiliAccount(dir, request); this.file = path.join(dir, 'bili-readonly.json'); this.data = fs.existsSync(this.file) ? JSON.parse(fs.readFileSync(this.file, 'utf8')) : { history: [], lastAttemptAt: 0, error: '' }; this.busy = false; }
  save() { fs.writeFileSync(`${this.file}.tmp`, JSON.stringify(this.data), { mode: 0o600 }); fs.renameSync(`${this.file}.tmp`, this.file); }
  async get(endpoint, query) {
    if (this.disabled) throw new Error('独立B站API读取已停用，当前仅保留视频分享');
    if (!paths.has(endpoint)) throw new Error('B站接口不在只读白名单');
    if (Date.now() < (this.data.retryAfter || 0)) throw new Error(`B站访问保护冷却中，${new Date(this.data.retryAfter).toLocaleString()}后才可再尝试`);
    const url = new URL(endpoint, 'https://api.bilibili.com'); for (const [k, v] of Object.entries(query)) url.searchParams.set(k, String(v));
    const cookie = this.account.cookie();
    const response = await this.request(url, { method: 'GET', redirect: 'error', headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://www.bilibili.com/', ...(cookie ? { Cookie: cookie } : {}) }, signal: AbortSignal.timeout(12000) });
    if ([412, 429].includes(response.status)) {
      this.data.blockCount = Math.min(5, (this.data.blockCount || 0) + 1);
      const seconds = Number(response.headers?.get?.('retry-after'));
      const delay = Math.max(30 * 60000 * 2 ** (this.data.blockCount - 1), Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 0);
      this.data.retryAfter = Date.now() + Math.min(delay, 24 * 3600000);
      this.data.lastBlockedEndpoint = endpoint;
      this.data.error = `B站接口 ${endpoint} 返回 ${response.status}，已暂停请求至 ${new Date(this.data.retryAfter).toLocaleString()}，不会自动绕过风控`;
      this.save(); throw new Error(this.data.error);
    }
    if (!response.ok) throw new Error(`B站接口 ${endpoint} 读取失败 (${response.status})`);
    const raw = await response.text(); if (raw.length > 2000000) throw new Error('B站响应过大');
    const value = JSON.parse(raw); if (value.code !== 0) throw new Error(`B站接口 ${endpoint} 拒绝读取 (${Number(value.code)})`); return value.data;
  }
  async browse(input = '') {
    if (!this.getConfig().biliEnabled) throw new Error('B站只读浏览未开启');
    if (this.busy) throw new Error('正在读取，请稍后'); this.busy = true;
    try {
      this.data.lastAttemptAt = Date.now(); this.save();
      let bv;
      if (input) bv = videoID(input);
      else { if (!this.account.cookie()) throw new Error('请先在控制台扫码登录B站，首页推荐不回退热门榜'); const list = await this.get('/x/web-interface/index/top/rcmd', homeQuery()); const items = Array.isArray(list.item) ? list.item : []; this.data.candidates = items.filter(v => /^BV[A-Za-z0-9]{10}$/.test(v.bvid || '')).slice(0, 30).map(v => ({ bv: v.bvid, title: sample(v.title), author: sample(v.owner?.name), eligible: newsVideo(v) })); const picked = this.data.candidates.find(v => v.eligible && !this.data.history.some(h => h.bv === v.bv)); if (!picked) throw new Error('账号首页暂无符合新闻主题的未读推荐，跳过且不回退热门榜'); bv = videoID(picked.bv); }
      const video = await this.get('/x/web-interface/view', { bvid: bv });
      const item = { bv, title: sample(video.title), author: sample(video.owner?.name), description: sample(video.desc), duration: Number(video.duration) || 0, url: `https://www.bilibili.com/video/${bv}`, at: Date.now(), comments: [], coverage: '仅读取标题、简介与公开评论；未播放或理解视频画面/音轨', commentsError: '' };
      try { const replies = await this.get('/x/v2/reply', { oid: video.aid, type: 1, sort: 2, pn: 1, ps: 10 }); item.comments = (replies.replies || []).slice(0, 10).map(r => sample(r.content?.message || '')); } catch { item.commentsError = '公开评论不可读取（未尝试绕过限制）'; }
      this.data.history = this.data.history.filter(h => h.bv !== bv); this.data.history.push(item); this.data.history = this.data.history.slice(-80); if (Date.now() >= (this.data.retryAfter || 0)) { this.data.error = ''; this.data.blockCount = 0; } this.save(); return item;
    } catch (e) { this.data.error = e.message; this.save(); throw e; } finally { this.busy = false; }
  }
  async tick() { return; }
  shareText(bv) { const id = videoID(bv); const item = this.data.history.find(h => h.bv === id); if (!item) throw new Error('请先读取此视频'); if (!newsVideo(item)) throw new Error('此视频不符合新闻来源及国家大事主题要求，禁止分享'); return `https://www.bilibili.com/video/${id}`; }
}
