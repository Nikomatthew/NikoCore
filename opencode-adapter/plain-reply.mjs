import { messageParts } from './message-burst.mjs';
import {assertPublicReply} from './tool-protocol-guard.mjs';

const SILENT = /^[\s\[【(（]*(?:不回|不回复|沉默|silent|pass|无需回复|跳过)[\s\]】)）。.!！]*$/i;
const WAIT = /^[\s\[【(（]*(?:等一下|等等|wait)[\s\]】)）。.!！]*$/i;
const CLOSE = /^[\s\[【(（]*(?:收尾|close)[\s\]】)）]*(?:[:：]\s*([\s\S]*))?$/i;
const SEARCH = /^\s*(?:搜索|search)\s*[:：]\s*(.+)$/i;
const COPILOT = /^\s*(?:网页AI|copilot)\s*[:：]\s*(.+)$/i;
const TAG = /^\s*\[(u\d+m\d+)\]\s*/;

function unfence(raw) {
  let text = String(raw ?? '').trim();
  const wrapped = text.match(/^```[a-z]*\s*([\s\S]*?)\s*```$/i);
  if (wrapped) text = wrapped[1].trim();
  return text;
}
function legacyJSON(text) {
  if (!text.startsWith('{')) return null;
  try { const value = JSON.parse(text); return value && typeof value === 'object' && !Array.isArray(value) ? value : null; } catch { return null; }
}
export function stripMeta(text) {
  return String(text).split(/\r?\n/).filter(line => !SEARCH.test(line) && !COPILOT.test(line)).join('\n').trim();
}
export function searchPlan(raw) {
  const text = unfence(raw);
  const legacy = legacyJSON(text);
  if (legacy && Array.isArray(legacy.searches)) return legacy.searches.map(String).slice(0, 2);
  const lines = text.split(/\r?\n/).map(l => l.match(SEARCH)?.[1]?.trim()).filter(Boolean);
  if (!lines.length) return null;
  return lines.flatMap(l => l.split(/[|｜;；]/)).map(s => s.trim()).filter(Boolean).slice(0, 2);
}
export function copilotPlan(raw) {
  const text = unfence(raw);
  const legacy = legacyJSON(text);
  if (legacy && typeof legacy.copilotQuery === 'string') return legacy.copilotQuery;
  const line = text.split(/\r?\n/).map(l => l.match(COPILOT)?.[1]?.trim()).find(Boolean);
  return line || null;
}
export function plainDecision(raw, { proactive = false } = {}) {
  assertPublicReply(raw);
  const text = unfence(raw);
  const legacy = legacyJSON(text);
  if (legacy && ['send', 'silent', 'wait', 'close'].includes(legacy.action)) {
    let action = proactive && legacy.action === 'wait' ? 'silent' : legacy.action;
    const messages = action === 'send' ? messageParts(legacy.text, legacy.messages) : [];
    if (action === 'send' && !messages.length) action = 'silent';
    return { action, text: messages.join('\n\n'), messages, summary: String(legacy.summary ?? '').slice(0, 160), nextOpening: String(legacy.nextOpening ?? '').slice(0, 120), waitSeconds: Math.max(5, Math.min(120, Number(legacy.waitSeconds) || 15)) };
  }
  const body = stripMeta(text);
  if (!body || SILENT.test(body)) return { action: 'silent', text: '', messages: [], summary: '', nextOpening: '', waitSeconds: 15 };
  if (WAIT.test(body)) return { action: proactive ? 'silent' : 'wait', text: '', messages: [], summary: '', nextOpening: '', waitSeconds: 15 };
  const close = body.match(CLOSE);
  if (close) return { action: 'close', text: '', messages: [], summary: String(close[1] || '').trim().slice(0, 160), nextOpening: '', waitSeconds: 15 };
  const messages = messageParts(body);
  if (!messages.length) return { action: 'silent', text: '', messages: [], summary: '', nextOpening: '', waitSeconds: 15 };
  return { action: 'send', text: messages.join('\n\n'), messages, summary: '', nextOpening: '', waitSeconds: 15 };
}
export function plainTargets(raw, targets, count, max = 5) {
  assertPublicReply(raw);
  const body = stripMeta(unfence(raw));
  if (!body || SILENT.test(body)) return [];
  const groups = []; let current = null; const loose = [];
  for (const line of body.split(/\r?\n/)) {
    const tag = line.match(TAG);
    if (tag) { current = { ref: tag[1], lines: [line.replace(TAG, '')] }; groups.push(current); }
    else if (current) current.lines.push(line);
    else loose.push(line);
  }
  if (!groups.length) {
    if (count !== 1) throw new Error('多人批次缺少目标标签，本批未发送');
    const decision = plainDecision(loose.join('\n'));
    return decision.action === 'send' ? [{ index: 0, decision, messageID: null, quotePending: false, targetOrder: 0 }] : [];
  }
  if (loose.join('').trim()) throw new Error('标签外有无主文字，本批未发送');
  const replies = new Map(), budgets = new Map(), out = [];
  for (const g of groups) {
    const target = targets.find(t => t.ref === g.ref);
    if (!target) throw new Error('引用目标无效，本批未发送');
    const decision = plainDecision(g.lines.join('\n'));
    if (decision.action !== 'send') continue;
    const budget = budgets.get(target.index) || { count: 0, chars: 0 };
    budget.count += decision.messages.length; budget.chars += Array.from(decision.text).length;
    if (budget.count > 6 || budget.chars > 1800) throw new Error('单用户回答超过上限');
    budgets.set(target.index, budget);
    const previous = replies.get(g.ref);
    if (previous) {
      previous.decision.messages.push(...decision.messages);
      previous.decision.text = previous.decision.messages.join('\n\n');
    } else {
      const answer = { index: target.index, decision, messageID: target.messageID ?? null, quotePending: Boolean(target.messageID), targetOrder: targets.indexOf(target) };
      replies.set(g.ref, answer);
      out.push(answer);
    }
  }
  if (new Set(out.map(a => a.index)).size > max) throw new Error('回答人数超过上限');
  return out.sort((a, b) => a.index - b.index || a.targetOrder - b.targetOrder);
}
