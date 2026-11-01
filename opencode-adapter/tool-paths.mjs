import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

export function validateToolPath(kind, value) {
  if (typeof value !== 'string' || !path.isAbsolute(value) || value.includes('\0')) throw new Error('请选择有效的绝对路径');
  const real = fs.realpathSync(value);
  if (!fs.statSync(real).isFile()) throw new Error('所选项目不是普通文件');
  if (kind === 'opencode') {
    if (!/^opencode(?:-cli)?\.exe$/i.test(path.basename(real))) throw new Error('请选择 opencode-cli.exe 或 opencode.exe，不要选择桌面安装程序');
    return real;
  }
  if (kind === 'snowluma') {
    if (path.basename(real).toLowerCase() !== 'launcher.bat') throw new Error('请选择 SnowLuma 安装目录内的 launcher.bat');
    return path.dirname(real);
  }
  if(kind==='cloudflared'){if(!/^cloudflared(?:-windows-(?:amd64|arm64))?\.exe$/i.test(path.basename(real)))throw Error('请选择cloudflared.exe或官方Windows执行文件');return real;}
  throw new Error('不支持的工具类型');
}

let selecting = false;
export async function selectToolPath(kind) {
  if (!['opencode', 'snowluma','cloudflared'].includes(kind)) throw new Error('不支持的工具类型');
  if (process.platform !== 'win32') throw new Error('当前仅支持 Windows 文件选择器');
  if (selecting) throw new Error('已有文件选择窗口，请先完成或取消');
  selecting = true;
  const titles={opencode:'选择 OpenCode CLI',snowluma:'选择 SnowLuma launcher.bat',cloudflared:'选择 cloudflared.exe'},filters={opencode:'OpenCode CLI|opencode-cli.exe;opencode.exe',snowluma:'SnowLuma launcher|launcher.bat',cloudflared:'Cloudflare Tunnel|cloudflared*.exe'};
  const script = `$ErrorActionPreference='Stop';Add-Type -AssemblyName System.Windows.Forms;$d=New-Object System.Windows.Forms.OpenFileDialog;$d.Title=$env:NIKOLINK_PICK_TITLE;$d.Filter=$env:NIKOLINK_PICK_FILTER;$d.CheckFileExists=$true;if($d.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK){[Console]::Write([Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($d.FileName)))};$d.Dispose()`;
  try {
    const selected = await new Promise((resolve, reject) => {
      const child = spawn('powershell.exe', ['-NoProfile', '-STA', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, NIKOLINK_PICK_TITLE:titles[kind], NIKOLINK_PICK_FILTER:filters[kind] } });
      let output = '';
      child.stdout.on('data', chunk => { output += chunk; });
      child.stderr.resume();
      const timer = setTimeout(() => { child.kill(); reject(new Error('路径选择超时，请重试')); }, 120000);
      child.once('error', () => { clearTimeout(timer); reject(new Error('无法打开文件选择器')); });
      child.once('close', code => { clearTimeout(timer); code === 0 ? resolve(output.trim()) : reject(new Error('文件选择器未正常退出')); });
    });
    return selected ? validateToolPath(kind, Buffer.from(selected, 'base64').toString('utf8')) : null;
  } finally { selecting = false; }
}
