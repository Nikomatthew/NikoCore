import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { mediaProcess } from './media-process.mjs';

export class LocalASR {
  constructor(project) {
    this.project = project;
    this.base = 'http://127.0.0.1:18764';
    this.starting = null;
    this.child = null;
  }
  async ready() {
    try { return (await fetch(this.base + '/health', { signal: AbortSignal.timeout(1000) })).ok; } catch { return false; }
  }
  async start() {
    if (this.starting) return this.starting;
    this.starting = this.launch();
    try { return await this.starting; } finally { this.starting = null; }
  }
  async launch() {
    if (await this.ready()) return;
    const dir = path.join(this.project, 'tools', 'asr');
    this.child = spawn(path.join(dir, '.venv', 'Scripts', 'python.exe'), [path.join(dir, 'server.py')], { windowsHide: true, stdio: 'ignore' });
    let failure;
    const child = this.child;
    child.once('error', error => { failure = error; });
    for (let i = 0; i < 120; i++) {
      if (failure || child.exitCode !== null) throw new Error('本地语音服务启动失败，请运行install.bat检查环境');
      if (await this.ready()) return;
      await delay(250);
    }
    child.kill();
    throw new Error('本地语音服务没有及时启动');
  }
  async transcribe(input, directory, signal, seconds) {
    const ffmpeg = path.join(this.project, 'tools', 'ffmpeg.exe');
    const chunks = path.join(directory, 'audio-%05d.wav');
    await mediaProcess(ffmpeg, ['-nostdin', '-v', 'error', '-protocol_whitelist', 'file,pipe', '-i', input, ...(seconds ? ['-t', String(seconds)] : []), '-vn', '-ac', '1', '-ar', '16000', '-f', 'segment', '-segment_time', '45', '-c:a', 'pcm_s16le', chunks], { signal });
    const names = (await fs.readdir(directory)).filter(n => /^audio-\d{5}\.wav$/.test(n)).sort();
    if (!names.length) return { text: '', segments: [] };
    const segments = [];
    for (const [index, name] of names.entries()) {
      signal?.throwIfAborted();
      await this.start();
      const form = new FormData();
      form.append('file', new Blob([await fs.readFile(path.join(directory, name))], { type: 'audio/wav' }), name);
      form.append('response_format', 'verbose_json');
      const response = await fetch(this.base + '/v1/audio/transcriptions', { method: 'POST', body: form, signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(120000)]) : AbortSignal.timeout(120000) });
      if (!response.ok) throw new Error('这段音频没识别成功');
      const result = await response.json();
      for (const part of result.segments || []) segments.push({ start: part.start + index * 45, end: part.end + index * 45, text: String(part.text) });
      await fs.unlink(path.join(directory, name));
    }
    return { text: segments.map(s => s.text).join('，'), segments };
  }
  stop() { this.child?.kill(); }
}
