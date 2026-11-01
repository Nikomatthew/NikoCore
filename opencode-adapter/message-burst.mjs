import {assertPublicReply} from './tool-protocol-guard.mjs';
function clip(text, limit) { return Array.from(text).slice(0, limit).join(''); }
export function messageParts(text, explicit) {
  let parts;
  if (explicit !== undefined) {
    if (!Array.isArray(explicit) || explicit.length < 1 || explicit.length > 6 || explicit.some(s => typeof s !== 'string' || !s.trim())) throw new Error('消息片段需为 1–6 条非空文字');
    parts = explicit.map(s => s.trim());
  } else {
    const raw = String(text || '').trim();
    const blocks = raw.includes('```') ? [raw] : raw.split(/\r?\n[ \t]*\r?\n+/).map(s => s.trim()).filter(Boolean);
    parts = blocks.length > 6 ? [...blocks.slice(0, 5), blocks.slice(5).join('\n\n')] : blocks;
  }
  let remaining = 1800;
  return parts.map(s => { const value = clip(s, remaining); remaining -= Array.from(value).length; return value; }).filter(Boolean);
}
export async function sendBurst(parts, { allowed, send, onSent, wait = ms => new Promise(resolve => setTimeout(resolve, ms)), random = Math.random }) {
  for(const part of parts)assertPublicReply(part);
  let sent = 0;
  for (const text of parts) {
    if (!allowed()) break;
    if (sent) { await wait(messageDelay(text,random)); if (!allowed()) break; }
    await send(text);
    sent++;
    await onSent(text);
  }
  return sent;
}
export function chatParts(text,explicit){
   assertPublicReply(text);if(Array.isArray(explicit))for(const part of explicit)assertPublicReply(part);
  const original=messageParts(text,explicit);
  if(!original.length)return [];
  if(original.some(s=>s.includes('```')))return original;
  const lines=original.flatMap(s=>s.split(/\r?\n+/).map(v=>v.trim()).filter(Boolean));
  return messageParts('',lines.length>6?[...lines.slice(0,5),lines.slice(5).join(' ')]:lines);
}
export function messageDelay(text,random=Math.random){return Math.round(Math.min(6000,Math.max(1500,1300+Array.from(String(text)).length*70+random()*300)));}
