export function mediaAllowed(event, config) {
  if(event.message_type==='group'&&(config.replyBlacklist||[]).includes(String(event.user_id)))return false;
  if (config.mode !== 'reply' || event.post_type !== 'message') return false;
  const user = String(event.user_id);
  if (user === String(event.self_id) || !(config.mediaQQ || []).includes(user)) return false;
  const parts = Array.isArray(event.message) ? event.message : [];
  if (parts.some(p => p.type === 'forward')) return false;
  if (event.message_type === 'private') return user === config.ownerQQ || (config.privateQQ || []).includes(user);
  return event.message_type === 'group' && config.groupEnabled === true && (config.groups || []).includes(String(event.group_id)) && parts.some(p => p.type === 'at' && String(p.data?.qq) === String(event.self_id));
}
