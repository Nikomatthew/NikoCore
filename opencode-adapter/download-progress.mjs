import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
export const progressViewer=String.raw`$ErrorActionPreference='Stop';[Console]::OutputEncoding=[Text.Encoding]::UTF8;$Host.UI.RawUI.WindowTitle='NikoLink - Cloudflare Tunnel';$file=$env:NIKOLINK_PROGRESS_FILE;$last='';Write-Host 'Cloudflare Tunnel download' -ForegroundColor Cyan;Write-Host 'Closing this window does not cancel the download.';$deadline=(Get-Date).AddMinutes(5);while((Get-Date) -lt $deadline){try{$s=[IO.File]::ReadAllText($file,[Text.Encoding]::UTF8)|ConvertFrom-Json;if($s.stage -ne $last){Write-Host $s.message;$last=$s.stage};if($s.total -gt 0){$percent=[Math]::Min(100,[Math]::Floor(100*$s.received/$s.total));Write-Progress -Activity 'Cloudflare Tunnel' -Status (('{0}% - {1:N1} / {2:N1} MiB' -f $percent,($s.received/1MB),($s.total/1MB))) -PercentComplete $percent};if($s.stage -in @('complete','failed','existing')){Write-Progress -Activity 'Cloudflare Tunnel' -Completed;Write-Host '';Read-Host 'Press Enter to close';exit}}catch{};Start-Sleep -Milliseconds 300};Write-Host 'Progress viewer timed out. Check NikoLink for the result.';Read-Host 'Press Enter to close'`;
export class DownloadProgress{
 constructor(directory,{launch=spawn,platform=process.platform,now=Date.now,onCancel=()=>{}}={}){Object.assign(this,{directory,launch,platform,now,onCancel});this.file=null;this.last=0;this.finished=false;}
  update(value){
   if(['complete','existing','failed','cancelled'].includes(value.stage))this.finished=true;
  if(!this.file){fs.mkdirSync(this.directory,{recursive:true});for(const name of fs.readdirSync(this.directory)){if(!/^cloudflared-[a-f0-9-]{36}\.json$/.test(name))continue;const file=path.join(this.directory,name),stat=fs.lstatSync(file);if(stat.isFile()&&!stat.isSymbolicLink()&&this.now()-stat.mtimeMs>3*86400000)fs.unlinkSync(file);}this.file=path.join(this.directory,'cloudflared-'+crypto.randomUUID()+'.json');}
  if(value.stage==='downloading'&&value.received<value.total&&this.now()-this.last<250)return;
  this.last=this.now();fs.writeFileSync(this.file,JSON.stringify(value),{mode:0o600});
  if(value.stage==='metadata'&&this.platform==='win32'){
    const encoded=Buffer.from(progressViewer.replace('Closing this window does not cancel the download.','Closing this window cancels an unfinished download.').replace("@('complete','failed','existing')","@('complete','failed','existing','cancelled')"),'utf16le').toString('base64');
    const dispatcher="$ErrorActionPreference='Stop';$p=Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-EncodedCommand',$env:NIKOLINK_PROGRESS_SCRIPT) -WindowStyle Normal -PassThru;$p.WaitForExit();exit $p.ExitCode";
    const child=this.launch('powershell.exe',['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(dispatcher,'utf16le').toString('base64')],{windowsHide:true,stdio:'ignore',env:{...process.env,NIKOLINK_PROGRESS_FILE:this.file,NIKOLINK_PROGRESS_SCRIPT:encoded}});child.once('error',()=>{if(!this.finished)this.onCancel();});child.once('exit',()=>{if(!this.finished)this.onCancel();});child.unref();
  }
 }
}
