export const TASK_STEPS = 180;
export const TASK_TOOL_APPROVALS = 1080;
export function taskModel(config) { return String(config.taskModel || config.model).trim(); }
export function modelSelection(value) {
  const [providerID, ...parts] = value.split('/');
  const [id, variant] = parts.join('/').split('#');
  return { providerID, id, ...(variant ? { variant } : {}) };
}
