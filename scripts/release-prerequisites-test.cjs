const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { detect } = require('./release-prerequisites.cjs');

test('任意盘符安装目录中的手选工具优先，不依赖开发者路径',()=>{
  const home=fs.mkdtempSync(path.join(os.tmpdir(),'nikolink-prereq-'));
  const snow=path.join(home,'custom snow'),cli=path.join(home,'custom-cli.exe');
  fs.mkdirSync(snow);fs.writeFileSync(path.join(snow,'launcher.bat'),'fixture');fs.writeFileSync(cli,'fixture');
  assert.deepEqual(detect(home,{opencodeExecutable:cli,snowlumaDirectory:snow},{},home),{cli,snow});
  assert.deepEqual(detect(home,{}, {},home),{cli:undefined,snow:undefined});
});
