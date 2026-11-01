const path=require('node:path');
const fs=require('node:fs');
const {execFileSync}=require('node:child_process');
function installDependencies(home,run=execFileSync){
 const logs=path.join(home,'data','log');fs.mkdirSync(logs,{recursive:true});
 const visible="$Host.UI.RawUI.WindowTitle='NikoLink - 运行环境安装';[Console]::OutputEncoding=[Text.Encoding]::UTF8;$code=1;try{Start-Transcript -Path $env:NIKOLINK_INSTALL_LOG -Append -ErrorAction Stop;& $env:NIKOLINK_INSTALL_SCRIPT;if($LASTEXITCODE -and $LASTEXITCODE -ne 0){throw '安装脚本执行失败'};$code=0;Write-Host '安装完成，正在继续启动 NikoLink。' -ForegroundColor Green}catch{Write-Host $_.Exception.Message -ForegroundColor Red;Write-Host '安装未完成，请查看日志后重试。';Read-Host '按 Enter 关闭窗口'}finally{try{Stop-Transcript | Out-Null}catch{}};exit $code";
 const encoded=Buffer.from(visible,'utf16le').toString('base64');
 const launcher="$p=Start-Process -FilePath (Join-Path $PSHOME 'powershell.exe') -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-EncodedCommand',$env:NIKOLINK_INSTALL_ENCODED) -WindowStyle Normal -PassThru -Wait;exit $p.ExitCode";
 run('powershell.exe',['-NoProfile','-EncodedCommand',Buffer.from(launcher,'utf16le').toString('base64')],{windowsHide:true,stdio:'ignore',env:{...process.env,NIKOLINK_INSTALL_SCRIPT:path.join(home,'tools','install.ps1'),NIKOLINK_INSTALL_LOG:path.join(logs,'dependency-install.log'),NIKOLINK_INSTALL_ENCODED:encoded}});
}
module.exports={installDependencies};
