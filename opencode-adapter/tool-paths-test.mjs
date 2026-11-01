import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validateToolPath } from './tool-paths.mjs';

test('工具路径保存前检查文件名与安装目录结构', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nikolink-tools-'));
  for (const name of ['opencode-cli.exe','setup.exe','launcher.bat']) fs.writeFileSync(path.join(dir,name),'fixture');
  assert.equal(validateToolPath('opencode',path.join(dir,'opencode-cli.exe')),fs.realpathSync(path.join(dir,'opencode-cli.exe')));
  assert.throws(()=>validateToolPath('opencode',path.join(dir,'setup.exe')));
  assert.equal(validateToolPath('snowluma',path.join(dir,'launcher.bat')),fs.realpathSync(dir));
  fs.mkdirSync(path.join(dir,'config'));
  assert.equal(validateToolPath('snowluma',path.join(dir,'launcher.bat')),fs.realpathSync(dir));
  assert.throws(()=>validateToolPath('unknown',path.join(dir,'launcher.bat')));
  assert.throws(()=>validateToolPath('opencode','relative.exe'));
});
