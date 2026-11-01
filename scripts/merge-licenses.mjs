import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

export function mergeLicenses(directory, destination) {
  const groups = new Map();
  for (const name of fs.readdirSync(directory).sort()) {
    const file = path.join(directory, name);
    if (!fs.statSync(file).isFile()) continue;
    const text = fs.readFileSync(file, 'utf8').replace(/^\ufeff/, '').replace(/\r\n/g, '\n').trim();
    const hash = crypto.createHash('sha256').update(text).digest('hex');
    if (!groups.has(hash)) groups.set(hash, { names: [], text });
    groups.get(hash).names.push(name);
  }
  const entries = [...groups.values()];
  const header = '# NikoLink 版权与第三方许可\n\n以下按原文合并版权声明和许可证。相同文本仅保留一份，对应文件列于各节标题中。文件名中的 opencode-adapter 是本项目适配目录，并不表示这些组件全部属于 OpenCode。\n\n';
  const output = header + entries.map((entry, index) => `## ${index + 1}. ${entry.names.join(' / ')}\n\n${entry.text}\n`).join('\n---\n\n');
  fs.writeFileSync(destination, output, 'utf8');
  const saved = fs.readFileSync(destination, 'utf8');
  for (const entry of entries) if (!saved.includes(entry.text)) throw new Error('许可证原文完整性检查失败');
  return { inputFiles: entries.reduce((count, entry) => count + entry.names.length, 0), uniqueTexts: entries.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) console.log(JSON.stringify(mergeLicenses(process.argv[2], process.argv[3])));
