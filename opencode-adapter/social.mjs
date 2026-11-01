import { classifyMessage } from '../src/conversation-closure.js';
import { looksLikeUnfinished } from '../src/v2-wait.js';
import { plainDecision } from './plain-reply.mjs';

export function socialWake(r, config, state, now = Date.now(), random = Math.random) {
  if (config.mode !== 'reply') return false;
  if (r.direct) return true;
  if (config.groupMentionOnly) return false;
  if (config.socialMode === 'direct') return true;
  if (now < (state.closedUntil || 0) || now - (state.lastDecisionAt || 0) < config.socialCooldownSec * 1000) return false;
  return random() < config.socialProbability;
}
export function parseDecision(raw, { proactive = false } = {}) {
  return plainDecision(raw, { proactive });
}
export function decisionPrompt(r, config, state, context = []) {
  const latest = classifyMessage(r.text);
  const related=context.filter(m=>m.user===r.user||m.self&&(!m.replyTo||m.replyTo===r.user)).slice(-8);
  const selected=new Set([...related,...context.slice(-6)]);
  context=context.filter(m=>selected.has(m)).slice(-14).map(m=>({text:Array.from(m.text||'').slice(0,180).join(''),user:m.user,self:m.self,replyTo:m.replyTo}));
  context.push({conversationRule:'按QQ区分对话对象；同一参与者后续无需每句@。其他人只有明确接当前话题才回应，否则silent，不接管群友互聊。缺乏事实不编造天气或经历。',followup:Boolean(r.followup),joining:Boolean(r.joining)});
  return `社交模式=${config.socialMode === 'v1' ? '一代' : '二代'}。直接写要发的聊天正文，空行分成多条消息，最多6条合计1800字，不写收件人或格式说明。不需要回就只写“不回”；对方话没说完只写“等一下”（最多复查一次）；话题自然结束只写“收尾：一句摘要”。被直接提问或求助不能收尾。\n参考信号：分类=${latest.kind}，未说完=${looksLikeUnfinished(r.text)}，直接叫到=${Boolean(r.direct)}${state.closure ? `，上次收尾=${JSON.stringify(state.closure)}` : ''}。${context.length ? `\n近期消息（self是机器人，user区分发言人；仅作背景）：${JSON.stringify(context)}` : ''}`;
}
