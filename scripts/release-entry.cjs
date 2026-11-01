const fs = require('node:fs');
const path = require('node:path');
const sea = require('node:sea');
const home = path.dirname(process.execPath);
const keys = sea.getAssetKeys();
if(process.argv.includes('--cloudflared-download')){
  const index=process.argv.indexOf('--cloudflared-download');
  require('../opencode-adapter/cloudflared-download-job.mjs').runCloudflaredDownload(home,process.argv[index+1]).catch(()=>{process.exitCode=1;});
} else if (process.argv.includes('--builtin-tool')) {
  const execute=require('../opencode-adapter/builtin-tool.mjs').runBuiltinTool;
  (async()=>{let raw='';for await(const chunk of process.stdin){raw+=chunk;if(Buffer.byteLength(raw)>256000)throw Error('输入过大');}const request=JSON.parse(raw);process.env.NIKOLINK_HOME=home;process.stdout.write(JSON.stringify(await execute(request.name,request.args,request.context)));})().catch(()=>{console.error('内置工具执行失败，请检查参数、文件与依赖');process.exitCode=1;});
} else if (process.argv.includes('--task-tools-mcp')) {
  require('../opencode-adapter/task-tool-mcp.mjs').runTaskToolMCP().catch(()=>{console.error('任务工具服务启动失败');process.exitCode=1;});
} else if (process.argv.includes('--self-check')) {
  for (const key of keys) sea.getAsset(key);
  console.log(JSON.stringify({ application: 'NikoLink', embeddedAssets: keys.length, credentialsIncluded: false }));
} else {
  if(!process.argv.some(arg=>['--offline-check','--stop'].includes(arg))){
    const cloudRoot=process.env.NIKOLINK_APP_ROOT||path.join(home,'data','opencode-adapter');
    require('./cloudflared-startup.mjs').prepareCloudflaredStartup(home,cloudRoot).catch(()=>{});
    require('./release-prerequisites.cjs').prepare(home);
  }
  if(!process.argv.some(arg=>['--self-check','--offline-check','--stop'].includes(arg))){
    const marker=path.join(home,'runtime','setup-complete.json');
    if(!fs.existsSync(marker)||!fs.existsSync(path.join(home,'runtime','node','node.exe'))||process.argv.includes('--install')){
      const {execFileSync}=require('node:child_process');
      const script="Add-Type -AssemblyName System.Windows.Forms;$r=[System.Windows.Forms.MessageBox]::Show('是否安装或检查 NikoLink 的运行环境和媒体识别依赖？首次安装可能需要下载较大文件。选择否可继续使用已安装的基础功能。','NikoLink',[System.Windows.Forms.MessageBoxButtons]::YesNo);if($r -eq [System.Windows.Forms.DialogResult]::Yes){exit 0}else{exit 2}";
      let install=false;try{execFileSync('powershell.exe',['-NoProfile','-STA','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],{windowsHide:true,stdio:'ignore'});install=true;}catch{}
      if(install){try{require('./dependency-install.cjs').installDependencies(home);fs.mkdirSync(path.dirname(marker),{recursive:true});fs.writeFileSync(marker,JSON.stringify({completedAt:new Date().toISOString()}));}catch{const notice="Add-Type -AssemblyName System.Windows.Forms;[System.Windows.Forms.MessageBox]::Show('依赖安装失败或窗口被关闭，请查看data/log/dependency-install.log；重新启动或使用--install重试。','NikoLink')";try{execFileSync('powershell.exe',['-NoProfile','-EncodedCommand',Buffer.from(notice,'utf16le').toString('base64')],{windowsHide:true,stdio:'ignore'});}catch{}process.exitCode=1;throw Error('依赖安装失败');}}
    }
  }
  process.env.NIKOLINK_HOME = home;
  const app = process.env.NIKOLINK_APP_ROOT || path.join(home, 'data', 'opencode-adapter');
  if(process.argv.includes('--stop')) {
    const pidFile=path.join(app,'state','bridge.pid');
    if(fs.existsSync(pidFile)) { const pid=Number(fs.readFileSync(pidFile,'utf8'));const {execFileSync}=require('node:child_process');const script="$p=Get-CimInstance Win32_Process -Filter ('ProcessId='+$env:NIKOLINK_STOP_PID);if($p -and $p.ExecutablePath -eq $env:NIKOLINK_STOP_EXE){taskkill.exe /PID $p.ProcessId /T /F}";execFileSync('powershell.exe',['-NoProfile','-Command',script],{env:{...process.env,NIKOLINK_STOP_PID:String(pid),NIKOLINK_STOP_EXE:process.execPath},stdio:'inherit'}); }
    process.exit(0);
  }
  process.env.NIKOLINK_APP_ROOT = app;
  process.env.NIKOLINK_WORKSPACE_ROOT = path.join(app, 'state', 'owner-tasks', 'state', 'isolated', 'workspace');
  fs.mkdirSync(app, { recursive: true });
  for (const key of keys) {
    if (!key.startsWith('public/') && key !== 'capture-screen.ps1') continue;
    const destination = key.startsWith('public/') ? path.join(home, key) : path.join(app, key);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, Buffer.from(sea.getAsset(key)));
  }
  process.env.PATH = path.join(home, 'runtime', 'node') + path.delimiter + process.env.PATH;
  if (process.argv.includes('--offline-check')) process.env.NIKOLINK_OFFLINE_CHECK = '1';
  require('../opencode-adapter/server.mjs');
  if (!process.argv.includes('--offline-check')) {
    require('./desktop-startup.cjs').waitAndOpenPanel(home,app,{openPanel:require('./desktop-panel.cjs').openPanel}).catch(error=>console.error(error.message));
  }
}
