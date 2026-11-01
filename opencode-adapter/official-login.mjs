import { spawn } from 'node:child_process';

export function loginWindowOptions(host,action='login'){
  if(!host.ready||!host.cliExecutable||!host.launchEnvironment)throw Error('隔离实例尚未就绪');
  if(!['login','list'].includes(action))throw Error('不支持的账号操作');
  const url=new URL(host.url);
  if(url.protocol!=='http:'||url.hostname!=='127.0.0.1'||!url.port)throw Error('必须连接本机隔离服务');
  const script="$Host.UI.RawUI.WindowTitle='NikoLink - OpenCode - '+$env:NIKOLINK_AUTH_INSTANCE; & $env:NIKOLINK_AUTH_EXE auth $env:NIKOLINK_AUTH_ACTION --server $env:NIKOLINK_AUTH_SERVER; if($LASTEXITCODE -ne 0){Write-Host 'OpenCode operation failed. Check the error above.'}; Write-Host ''; Write-Host 'Return to NikoLink and refresh the model list.'";
  const dispatcher="$ErrorActionPreference='Stop';Start-Process -FilePath (Join-Path $PSHOME 'powershell.exe') -WorkingDirectory $env:NIKOLINK_AUTH_CWD -ArgumentList @('-NoProfile','-NoExit','-EncodedCommand',$env:NIKOLINK_AUTH_SCRIPT) -WindowStyle Normal";
  return {command:'powershell.exe',args:['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(dispatcher,'utf16le').toString('base64')],options:{cwd:host.workspace,env:{...host.launchEnvironment,NIKOLINK_AUTH_EXE:host.cliExecutable,NIKOLINK_AUTH_ACTION:action,NIKOLINK_AUTH_SERVER:url.origin,NIKOLINK_AUTH_INSTANCE:host.taskMode?'Task':'Chat',NIKOLINK_AUTH_CWD:host.workspace,NIKOLINK_AUTH_SCRIPT:Buffer.from(script,'utf16le').toString('base64'),OPENCODE_PASSWORD:host.password},windowsHide:true,stdio:'ignore'}};
}

export async function openOfficialLogin(host,action='login',launch=spawn){
  const spec=loginWindowOptions(host,action);
  await new Promise((resolve,reject)=>{const child=launch(spec.command,spec.args,spec.options);const timer=setTimeout(()=>{child.kill();reject(Error('打开官方终端超时'));},10000);child.once('error',()=>{clearTimeout(timer);reject(Error('无法打开官方登录终端'));});child.once('exit',code=>{clearTimeout(timer);code===0?resolve():reject(Error('无法打开官方登录终端'));});});
  return {opened:true,instance:host.sharedTaskWorkspace||host.service?'共享':host.taskMode?'任务':'聊天'};
}
