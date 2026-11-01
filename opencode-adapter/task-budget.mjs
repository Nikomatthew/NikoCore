export function observeTaskBudget(task, messages) {
  const latestUser = messages.findLast(message => message.type === 'user');
  let tracking = task.stepTracking;
  if (latestUser && tracking?.turn !== latestUser.id) {
    tracking = { turn: latestUser.id, messages: [], complete: true };
  }
  if (!tracking) tracking = { turn: null, messages: [], complete: false };
  const ids = new Set(tracking.messages);
  const start = latestUser ? messages.indexOf(latestUser) + 1 : 0;
  for (const message of messages.slice(start)) if (message.type === 'assistant' && message.id) ids.add(message.id);
  tracking.messages = [...ids];
  task.stepTracking = tracking;
  const limit = task.stepLimit || 180;
  task.stepBudget = { limit, used: ids.size, remaining: tracking.complete ? Math.max(0, limit - ids.size) : null, estimated: true, complete: tracking.complete };
  return task.stepBudget;
}
