export function projectEnv(name, env = process.env) { return env[`NIKOLINK_${name}`]; }
export const CHAT_AGENT = 'nikolink-chat';
