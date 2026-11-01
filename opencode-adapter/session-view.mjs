export function redactView(value, secrets = []) {
  let text = String(value ?? '');
  for (const secret of secrets) if (typeof secret === 'string' && secret.length >= 8) text = text.split(secret).join('[密钥已隐藏]');
  return text.replace(/\b(?:sk|ghp|gho)[-_][A-Za-z0-9_-]{8,}\b/g, '[密钥已隐藏]').replace(/\b(token|password|secret|api[_-]?key|cookie|authorization)\b\s*[:=：]\s*[^\s，。；]+/gi, '$1=[已隐藏]').slice(0, 40000);
}
export function projectMessages(messages, secrets = []) {
  return messages.map(m => ({ id: m.id, type: m.type, created: m.time?.created, completed: m.time?.completed, model: m.model ? `${m.model.providerID}/${m.model.id}${m.model.variant ? `#${m.model.variant}` : ''}` : '', outcome: m.outcome || m.finish || '', error: m.error ? { type: redactView(m.error.type, secrets), message: redactView(m.error.message, secrets) } : null, text: ['user', 'synthetic', 'system'].includes(m.type) ? redactView(m.text, secrets) : '', content: m.type === 'assistant' ? (m.content || []).map(p => p.type === 'text' || p.type === 'reasoning' ? { type: p.type, text: redactView(p.text, secrets) } : { type: 'tool', text: '检测到工具记录（此聊天环境禁止工具；不展示内部参数）' }) : [] }));
}
