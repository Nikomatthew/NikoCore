import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { build } from 'esbuild';
import { inject } from 'postject';
import { rcedit } from 'rcedit';
import {windowsSubsystem} from './windows-subsystem.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = process.argv[2] || path.join(root, '..', 'NikoLink-Release');
if (fs.existsSync(output)) throw Error('输出目录已存在，不覆盖现有发布包');
const staging = path.join(process.env.LOCALAPPDATA, 'Temp', 'opencode', 'nikolink-build-' + Date.now());
fs.mkdirSync(staging, { recursive: true });
fs.mkdirSync(output);
await build({ entryPoints: [path.join(root,'scripts/release-entry.cjs')], outfile: path.join(staging,'main.cjs'), bundle: true, platform: 'node', target: 'node24', format: 'cjs', minify: true, sourcemap: false, mainFields:['module','main'], external: ['bufferutil','utf-8-validate'], define: { 'import.meta.url': '"file:///nikolink-embedded/server.mjs"' } });
const assets = {};
for (const name of fs.readdirSync(path.join(root,'public'))) assets['public/'+name] = path.join(root,'public',name);
assets['capture-screen.ps1'] = path.join(root,'opencode-adapter/capture-screen.ps1');
const config = { main:'main.cjs', output:path.join(staging,'sea.blob'), disableExperimentalSEAWarning:true, useCodeCache:false, assets };
fs.writeFileSync(path.join(staging,'sea.json'),JSON.stringify(config));
execFileSync(process.execPath,['--experimental-sea-config',path.join(staging,'sea.json')],{stdio:'inherit',cwd:staging});
const executable = path.join(output,'NikoLink.exe');
  fs.copyFileSync(process.execPath,executable);
await rcedit(executable,{icon:path.join(root,'assets','nikolink.ico'),'version-string':{ProductName:'NikoLink',FileDescription:'NikoLink',CompanyName:'Niko_matthew',OriginalFilename:'NikoLink.exe'}});
  windowsSubsystem(executable,2);
  await inject(executable,'NODE_SEA_BLOB',fs.readFileSync(config.output),{sentinelFuse:'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2'});
function copy(from,to=from){const dest=path.join(output,to);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(root,from),dest);}
for(const name of ['tools/install.ps1','tools/find-python.ps1','tools/download-media.ps1','tools/task-tool-worker.mjs','tools/asr/server.py','tools/asr/requirements.txt','tools/asr/model-hashes.json'])copy(name);
execFileSync(process.execPath,[path.join(root,'scripts','build-desktop-shell.mjs'),path.join(output,'runtime','panel')],{stdio:'inherit'});
execFileSync(process.execPath,[path.join(root,'scripts','build-game-worker.mjs'),path.join(output,'runtime','game-worker')],{stdio:'inherit'});
execFileSync(process.execPath,[path.join(root,'scripts','build-game-vendor.mjs')],{stdio:'inherit'});
fs.cpSync(path.join(root,'runtime','game-vendor'),path.join(output,'runtime','game-vendor'),{recursive:true});
for(const folder of fs.readdirSync(path.join(root,'task-tools'),{withFileTypes:true}).filter(item=>item.isDirectory()))for(const name of ['tool.json','index.mjs'])copy('task-tools/'+folder.name+'/'+name);
for(const name of ['LICENSE','THIRD_PARTY_NOTICES.md'])copy(name,'licenses/'+name);
for(const [dir,label] of [['node_modules/js-yaml','js-yaml'],['opencode-adapter/node_modules/ws','ws'],['opencode-adapter/node_modules/jsonc-parser','jsonc-parser'],['opencode-adapter/node_modules/qrcode','qrcode']]){for(const name of fs.readdirSync(path.join(root,dir)).filter(n=>/^license/i.test(n)))copy(dir+'/'+name,'licenses/'+label+'-'+name);}
copy('THIRD_PARTY_LICENSES.md','LICENSES.md');
for(const name of ['quickjs-emscripten','quickjs-emscripten-core','three','@dimforge/rapier3d-compat']){const dir=path.join(root,'node_modules',name);for(const file of fs.readdirSync(dir).filter(n=>/^licen[sc]e/i.test(n)))copy('node_modules/'+name+'/'+file,'licenses/'+name.replaceAll('/','-')+'-'+file);}
copy('THIRD_PARTY_NOTICES.md','licenses/THIRD_PARTY_NOTICES.md');
const licenseDirectory=path.join(output,'licenses');
const licenseTexts=fs.readdirSync(licenseDirectory).sort().map(name=>({name,text:fs.readFileSync(path.join(licenseDirectory,name),'utf8')}));
function dependencyLicenses(directory){for(const entry of fs.readdirSync(directory,{withFileTypes:true})){const file=path.join(directory,entry.name);if(entry.isDirectory())dependencyLicenses(file);else if(/^licen[sc]e(?:\.|$)/i.test(entry.name))licenseTexts.push({name:path.relative(output,file).replaceAll('\\','/'),text:fs.readFileSync(file,'utf8')});}}
dependencyLicenses(path.join(output,'runtime','game-worker','node_modules'));
for(const name of ['THREE-LICENSE.txt','RAPIER-LICENSE.txt'])licenseTexts.push({name:'game-vendor/'+name,text:fs.readFileSync(path.join(output,'runtime','game-vendor',name),'utf8')});
fs.appendFileSync(path.join(output,'LICENSES.md'),'\n\n# 本次发行补充版权与许可原文\n\n'+licenseTexts.map(item=>'## '+item.name+'\n\n'+item.text).join('\n\n---\n\n'));
for(const item of licenseTexts)if(!fs.readFileSync(path.join(output,'LICENSES.md'),'utf8').includes(item.text))throw Error('合并许可证不完整：'+item.name);
for(const name of fs.readdirSync(licenseDirectory))fs.unlinkSync(path.join(licenseDirectory,name));fs.rmdirSync(licenseDirectory);
let installer=fs.readFileSync(path.join(output,'tools/install.ps1'),'utf8');
installer=installer.replace(/  Write-Host '安装项目依赖'[\s\S]*?  if \(-not \$NoMedia\) \{/,"  if (-not $NoMedia) {");
fs.writeFileSync(path.join(output,'tools/install.ps1'),'\ufeff'+installer.replace(/^\ufeff/,''));
fs.writeFileSync(path.join(output,'README.md'),'# NikoLink 运行版\n\n双击 NikoLink.exe，首次启动询问是否安装依赖，控制台由默认浏览器打开。安装失败可重新启动或运行 NikoLink.exe --install 重试。\n\nOpenCode 模型和 SnowLuma 登录需要自行配置，控制台“模型和搜索→工具路径”可以选择 OpenCode CLI 或 SnowLuma 的 launcher.bat，保存后重启生效。程序不代安装和登录这两个组件。\n\n个人数据保存在 data，不要分享或在更新时覆盖。关闭后台终端即可退出，也可使用 NikoLink.exe --stop；仅关闭浏览器不会停止后台。\n\n--self-check 检查内置资源，--offline-check 启动不连接QQ和模型的控制台。程序未签名，首次安装全流程及真实QQ需用户验证。打包不保证无法逆向。许可见 LICENSES.md。\n');
fs.writeFileSync(path.join(output,'runtime','nikolink-install.json'),JSON.stringify({application:'NikoLink',version:JSON.parse(fs.readFileSync(path.join(root,'package.json'))).version}));
console.log(execFileSync(executable,['--self-check'],{encoding:'utf8'}));
console.log('Release: '+output);
