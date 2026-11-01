import { projectEnv } from './brand-compat.mjs';
import { mediaProcess } from './media-process.mjs';

export function parseMediaProxy(env = process.env, settings = {}) {
  const explicit = projectEnv('MEDIA_PROXY',env) || env.HTTPS_PROXY || env.https_proxy;
  let value = explicit;
  if (!value && (settings.ProxyEnable === 1 || settings.AutoConfigURL)) {
    const server = String(settings.ProxyServer || '');
    value = server.includes('=') ? server.split(';').map(part => part.trim()).find(part => part.startsWith('https='))?.slice(6) : server;
  }
  if (!value) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) value = 'http://' + value;
  const url = new URL(value);
  if (!['http:', 'https:', 'socks5:', 'socks5h:'].includes(url.protocol)) throw new Error('媒体代理协议无效');
  return url.href;
}

export async function resolveMediaProxy(env = process.env) {
  const explicit = parseMediaProxy(env);
  if (explicit) return explicit;
  if (process.platform !== 'win32') return null;
  try {
    const text = await mediaProcess('powershell.exe', ['-NoProfile', '-Command', String.raw`Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings' | Select-Object ProxyEnable,ProxyServer,AutoConfigURL | ConvertTo-Json -Compress`], { timeout: 5000 });
    return parseMediaProxy(env, JSON.parse(text));
  } catch { return null; }
}
