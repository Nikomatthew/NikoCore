import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { findSnowLuma } from './snowluma-path.mjs';
import { applicationPaths } from './app-paths.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const state = path.join(applicationPaths(import.meta.url).root, 'state');
async function openPanel() {
  const file = path.join(state, 'panel.url');
  if (!fs.existsSync(file)) throw new Error('Panel address not found. Start NikoLink first.');
  const url = fs.readFileSync(file, 'utf8').trim();
  if (!/^http:\/\/127\.0\.0\.1:\d+\/(?:#[a-f0-9]+)?$/.test(url)) throw new Error('Invalid local panel address.');
  const child = spawn('powershell.exe', ['-NoProfile', '-Command', 'Start-Process $env:NIKOLINK_OPEN_URL'], { env: { ...process.env, NIKOLINK_OPEN_URL: url }, windowsHide: true, stdio: 'ignore' });
  child.on('error', () => console.error('Could not open browser. Use nikolinkpanel.bat.'));
}
if (process.argv.includes('--open-only')) {
  try { await openPanel(); } catch (e) { console.error(e.message); process.exitCode = 1; }
} else {
  try {
    const settingsFile=path.join(state,'settings.json');
    const settings=fs.existsSync(settingsFile)?JSON.parse(fs.readFileSync(settingsFile,'utf8')):{};
    const dir = findSnowLuma(root,settings.snowlumaDirectory||process.env.NIKOLINK_SNOWLUMA_DIR);
    process.env.NIKOLINK_SNOWLUMA_DIR = dir;
    console.log('SnowLuma directory:', dir);
  } catch (e) { console.error(e.message); console.error('NikoLink will keep retrying the QQ connection. You can start SnowLuma manually.'); }
  const server = path.join(root, 'server.mjs');
  console.log('NikoLink OpenCode - keep this window open. Press Ctrl+C to stop.');
  const child = spawn(process.execPath, [server], { cwd: root, stdio: 'inherit' });
  let ended = false;
  child.on('error', e => { console.error('Startup failed:', e.message); ended = true; process.exitCode = 1; });
  child.on('exit', code => { ended = true; process.exitCode = code ?? 1; });
  process.on('SIGINT', () => { child.kill(); });
  for (let attempt = 0; attempt < 30 && !ended; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 500));
    try {
      const file = path.join(state, 'panel.url'); if (!fs.existsSync(file)) continue;
      const url = new URL(fs.readFileSync(file, 'utf8').trim());
      if (url.hostname !== '127.0.0.1') throw new Error('Invalid panel host');
      const r = await fetch(`${url.origin}/api/auth/status`, { signal: AbortSignal.timeout(1000) });
      if (r.ok) { await openPanel(); break; }
    } catch {}
  }
}
