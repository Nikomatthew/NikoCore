import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const forbidden = new Set(['node_modules', 'runtime', 'state', 'snowluma', '_backups', 'vendor', '.venv', '__pycache__', '.git']);
function scan(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name), relative = path.relative(root, full).replaceAll('\\', '/');
    if (entry.isSymbolicLink()) { failures.push(`${relative}: 不允许符号链接`); continue; }
    if (entry.isDirectory()) {
      if (forbidden.has(entry.name) || relative === 'tools/asr/models') { if (entry.name !== '.git') failures.push(`${relative}: 运行数据或安装依赖不得发布`); }
      else scan(full);
      continue;
    }
    if (/\.(?:exe|onnx|db|sqlite|log|pid|pyc|zip|mp4|wav)$/i.test(entry.name) || /^\.env(?:\.|$)/.test(entry.name) && entry.name !== '.env.example' || entry.name === 'config.json') failures.push(`${relative}: 禁止发布的运行文件`);
    if (!/\.(?:mjs|js|json|md|txt|ps1|cmd|html|css)$/.test(entry.name)) continue;
    const text = fs.readFileSync(full, 'utf8');
    if (/\b(?:sk|ghp|gho)[-_][A-Za-z0-9_-]{20,}\b/.test(text)) failures.push(`${relative}: 疑似密钥`);
    if (/[A-Z]:[\\/](?:Users|用户)[\\/][^\\/\s]+/i.test(text)) failures.push(`${relative}: 本机用户绝对路径`);
    if (/"(?:accessToken|apiKey|httpToken|wsToken)"\s*:\s*"[^"\s]{8,}"/.test(text)) failures.push(`${relative}: 疑似已填写凭据`);
  }
}
scan(root);
if (failures.length) { for (const failure of failures) console.error(failure); process.exitCode = 1; }
else console.log('源码文件检查通过：未发现禁止发布的数据目录、二进制、已填写凭据或用户绝对路径。仍需人工复核。');
