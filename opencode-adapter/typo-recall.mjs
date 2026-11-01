const HAN = /\p{Script=Han}/u;
const SAFE = /^[\p{Script=Han}，。！？、…；：""''（）]{6,60}$/u;

export function typoEligible(text, config, state = {}, now = Date.now(), random = Math.random) {
  if (!config.typoRecall) return false;
  if (typeof text !== 'string' || !SAFE.test(text)) return false;
  if (now - (state.lastTypoAt || 0) < (config.typoCooldownSec ?? 900) * 1000) return false;
  return random() < (config.typoProbability ?? 0.06);
}

export function makeTypo(text, random = Math.random) {
  const chars = [...text];
  const pairs = [];
  for (let i = 0; i < chars.length - 1; i++) {
    if (HAN.test(chars[i]) && HAN.test(chars[i + 1]) && chars[i] !== chars[i + 1]) pairs.push(i);
  }
  if (!pairs.length) return null;
  const index = pairs[Math.min(pairs.length - 1, Math.floor(random() * pairs.length))];
  [chars[index], chars[index + 1]] = [chars[index + 1], chars[index]];
  const value = chars.join('');
  return value === text ? null : value;
}
