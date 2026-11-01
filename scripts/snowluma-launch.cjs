const { spawn } = require('node:child_process');

function launchSnowLuma(directory,launch=spawn){
  const script=String.raw`$ErrorActionPreference='Stop';$dir=$env:NIKOLINK_SNOW_DIR;$exe=Join-Path $dir 'node.exe';$active=Get-CimInstance Win32_Process | Where-Object { ($_.ExecutablePath -eq $exe) -or ($_.Name -eq 'node.exe' -and $_.CommandLine -and $_.CommandLine.Contains($dir+'\')) };if(-not $active){Start-Process -FilePath $env:ComSpec -ArgumentList '/d /s /c ""launcher.bat""' -WorkingDirectory $dir -WindowStyle Normal}`;
  return new Promise((resolve,reject)=>{
    const child=launch('powershell.exe',['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],{env:{...process.env,NIKOLINK_SNOW_DIR:directory},windowsHide:true,stdio:'ignore'});
    const timer=setTimeout(()=>{child.kill();reject(Error('SnowLuma 启动检测超时，可手动运行 launcher.bat'));},10000);
    child.once('error',()=>{clearTimeout(timer);reject(Error('无法启动 SnowLuma，请检查 launcher.bat'));});
    child.once('exit',code=>{clearTimeout(timer);code===0?resolve():reject(Error('SnowLuma 自动启动失败，请手动运行 launcher.bat'));});
  });
}
module.exports={launchSnowLuma};
