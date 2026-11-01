const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');

function ask(message, run = execFileSync) {
  const code = "Add-Type -AssemblyName System.Windows.Forms;$r=[System.Windows.Forms.MessageBox]::Show($env:NIKOLINK_MESSAGE,'NikoLink',[System.Windows.Forms.MessageBoxButtons]::YesNo);if($r -eq [System.Windows.Forms.DialogResult]::Yes){exit 0}else{exit 2}";
  try { run('powershell.exe', ['-NoProfile', '-STA', '-EncodedCommand', Buffer.from(code, 'utf16le').toString('base64')], { env: { ...process.env, NIKOLINK_MESSAGE: message }, windowsHide: true, stdio: 'ignore' }); return true; } catch { return false; }
}

function openWebsite(url, run = execFileSync) {
  try { run('powershell.exe', ['-NoProfile', '-Command', 'Start-Process $env:NIKOLINK_WEBSITE'], { env: { ...process.env, NIKOLINK_WEBSITE: url }, windowsHide: true, stdio: 'ignore' }); } catch { console.error('无法打开浏览器：' + url); }
}

function detect(home, settings = {}, env = process.env, userHome = os.homedir()) {
  const cliRoot = path.join(userHome, 'AppData', 'Roaming', 'ai.opencode.desktop', 'cli');
  const versions = fs.existsSync(cliRoot) ? fs.readdirSync(cliRoot).sort((a,b)=>b.localeCompare(a,undefined,{numeric:true})).map(version=>path.join(cliRoot,version,'opencode-cli.exe')) : [];
  const cli = [settings.opencodeExecutable,env.NIKOLINK_OPENCODE_EXE,path.join(home,'runtime','opencode','opencode-cli.exe'),...versions].filter(Boolean).find(file=>fs.existsSync(file)&&fs.statSync(file).isFile());
   const snow = [settings.snowlumaDirectory,env.NIKOLINK_SNOWLUMA_DIR,path.join(home,'snowluma'),path.join(home,'..','snowluma')].filter(Boolean).find(dir=>fs.existsSync(path.join(dir,'launcher.bat'))&&fs.statSync(path.join(dir,'launcher.bat')).isFile());
  return { cli, snow };
}

function prepare(home) {
  const file = path.join(home,'data','opencode-adapter','state','settings.json');
  let settings = {};
  if(fs.existsSync(file))try{settings=JSON.parse(fs.readFileSync(file,'utf8'));}catch{console.error('无法读取工具路径配置，请在控制台检查。');}
  const { cli, snow } = detect(home,settings);
  if(!cli && ask('未检测到 OpenCode CLI。是否打开 OpenCode 官网下载安装？\n选择“否”将继续进入控制台，可稍后选择 OpenCode CLI 路径。'))openWebsite('https://opencode.ai/');
  if(!snow){if(ask('未检测到 SnowLuma。是否打开官方下载页？\n请自行阅读许可、安装并登录。选择“否”将继续进入控制台。'))openWebsite('https://github.com/SnowLuma/SnowLuma/releases');return;}
}

module.exports = { detect, prepare };
