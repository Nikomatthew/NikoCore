import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export function scanTaskTools(directory, approvals = {}) {
  if (!fs.existsSync(directory)) return [];
  const root = fs.realpathSync(directory);
  return fs.readdirSync(root, { withFileTypes: true }).filter(item => item.isDirectory() && !item.isSymbolicLink()).slice(0, 100).map(item => {
    try {
      const folder = path.join(root, item.name);
      if (!/^[a-z][a-z0-9-]{0,63}$/.test(item.name)) throw Error('目录名称只允许小写字母、数字和连字符');
      const files = [];
      function collect(dir) {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a,b)=>a.name.localeCompare(b.name))) {
          if (entry.name === 'node_modules' || entry.name.startsWith('.')) throw Error('工具目录不得包含隐藏文件或node_modules');
          const file = path.join(dir, entry.name), stat = fs.lstatSync(file);
          if (stat.isSymbolicLink() || files.length >= 200 || stat.isFile() && stat.size > 2 * 1048576) throw Error('工具文件越界或超过限制');
          if (entry.isDirectory()) collect(file); else if (entry.isFile()) files.push(file); else throw Error('工具仅支持普通文件');
        }
      }
      collect(folder);
      if (files.reduce((total,file)=>total+fs.statSync(file).size,0) > 8 * 1048576) throw Error('工具总大小超过8MiB');
      const manifest = JSON.parse(fs.readFileSync(path.join(folder, 'tool.json'), 'utf8'));
      if (manifest.name !== item.name || typeof manifest.description !== 'string' || !manifest.description.trim() || manifest.description.length > 2000) throw Error('工具名称或说明无效');
      if (typeof manifest.entry !== 'string' || path.isAbsolute(manifest.entry) || !/\.mjs$/.test(manifest.entry)) throw Error('入口需为工具目录内的mjs文件');
      const entry = path.resolve(folder, manifest.entry);
      if (!entry.startsWith(folder + path.sep) || !files.includes(entry)) throw Error('工具入口越界或不存在');
      if (!manifest.inputSchema || manifest.inputSchema.type !== 'object') throw Error('inputSchema需为object JSON Schema');
      const timeout = manifest.timeoutSeconds ?? 120;
      if (!Number.isInteger(timeout) || timeout < 1 || timeout > 600) throw Error('超时需为1–600秒');
      const hash = crypto.createHash('sha256');
      for (const file of files) hash.update(path.relative(folder,file).replaceAll('\\','/')).update('\0').update(fs.readFileSync(file));
      const digest = hash.digest('hex');
      return { name:item.name, description:manifest.description, version:String(manifest.version || '0.0.0').slice(0,80), permissions:Array.isArray(manifest.permissions)?manifest.permissions.map(String).slice(0,10):[], inputSchema:manifest.inputSchema, entry, folder, hash:digest, timeoutSeconds:timeout, enabled:approvals[item.name]===digest, error:'' };
    } catch (error) { return { name:item.name, enabled:false, error:String(error.message).slice(0,300) }; }
  });
}

export function setToolApproval(directory, approvals, name, hash, enabled) {
  const tool=scanTaskTools(directory,approvals).find(tool=>tool.name===name);
  if(!tool || tool.error || tool.hash!==hash)throw Error('工具已变化或不可用，请刷新列表后重新确认');
  const next={...approvals};if(enabled)next[name]=tool.hash;else delete next[name];return next;
}
