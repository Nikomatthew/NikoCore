import { spawn } from 'node:child_process';

export function mediaProcess(command, args, { env = process.env, timeout = 600000, signal, cwd } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { env, signal, cwd, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '', overflow = false;
    const collect = (name, data) => {
      if (name === 'stdout') stdout += data.toString(); else stderr += data.toString();
      if (stdout.length + stderr.length > 4 * 1024 * 1024) { overflow = true; child.kill(); }
    };
    child.stdout.on('data', data => collect('stdout', data));
    child.stderr.on('data', data => collect('stderr', data));
    let expired = false;
    const timer = setTimeout(() => { expired = true; child.kill(); }, timeout);
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('close', code => {
      clearTimeout(timer);
      if (expired) return reject(new Error('媒体处理超时，已停止'));
      if (overflow) return reject(new Error('媒体工具输出过多，已停止'));
      if (code !== 0) return reject(new Error('媒体工具执行失败：' + stderr.slice(-800)));
      resolve(stdout);
    });
  });
}
