import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

export async function run(args, context) {
  if(typeof args.file!=='string'||path.isAbsolute(args.file))throw Error('需提供工作区内的相对路径');
  const root=await fs.realpath(context.workspace);
  const file=await fs.realpath(path.resolve(root,args.file));
  if(!file.startsWith(root+path.sep))throw Error('路径不在任务工作区内');
  const stat=await fs.stat(file);
  if(!stat.isFile()||stat.size>200*1048576)throw Error('文件不是普通文件或超过200MiB');
  const bytes=await fs.readFile(file);
  return {file:path.relative(root,file),bytes:stat.size,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
}
