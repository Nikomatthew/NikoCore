import { projectEnv } from './brand-compat.mjs';
import fs from 'node:fs';
import path from 'node:path';

export function findSnowLuma(root, override = projectEnv('SNOWLUMA_DIR')) {
  const candidates = override ? [override] : [path.join(process.env.NIKOLINK_HOME || path.join(root,'..'),'snowluma'),path.join(root, '..', 'snowluma'), path.join(root, '..', '..', 'snowluma')];
  const found = candidates.find(dir => fs.existsSync(path.join(dir, 'launcher.bat')) && fs.statSync(path.join(dir, 'launcher.bat')).isFile());
  if (!found) throw new Error('SnowLuma not found. Place the installed snowluma folder beside the NikoLink launcher.');
  return path.resolve(found);
}
