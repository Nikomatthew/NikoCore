const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const sea=require('node:sea');
const {spawnSync}=require('node:child_process');
const home=path.dirname(process.execPath);
function dialog(text,confirm=false){const script=`Add-Type -AssemblyName System.Windows.Forms;$r=[System.Windows.Forms.MessageBox]::Show($env:NIKOLINK_UPDATE_MESSAGE,'NikoLink 更新',[System.Windows.Forms.MessageBoxButtons]::${confirm?'YesNo':'OK'});if($r -eq [System.Windows.Forms.DialogResult]::Yes){exit 0}else{exit 2}`;return spawnSync('powershell.exe',['-NoProfile','-STA','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],{env:{...process.env,NIKOLINK_UPDATE_MESSAGE:text},windowsHide:true,stdio:'ignore'}).status===0;}
let staging;
try{
 if(process.argv.includes('--self-check')){for(const key of sea.getAssetKeys())sea.getAsset(key);console.log('NikoLink update assets OK');}
 else{
  let recognized=false;try{const marker=JSON.parse(fs.readFileSync(path.join(home,'nikolink-install.json'),'utf8'));recognized=marker.application==='NikoLink'&&path.resolve(marker.directory).toLowerCase()===home.toLowerCase()&&fs.statSync(path.join(home,'NikoLink.exe')).isFile();}catch{}
  if(!recognized&&!dialog(`疑似非NikoLink根目录 确定更新在此路径？\n\n${home}\n\n仅更新NikoLink程序文件，不覆盖个人数据。`,true))process.exitCode=0;
  else{
   staging=fs.mkdtempSync(path.join(os.tmpdir(),'nikolink-update-'));
   for(const key of sea.getAssetKeys()){if(!/^(update\.json|install-update\.ps1|payload\/[A-Za-z0-9_./-]+)$/.test(key)||key.split('/').includes('..'))throw Error('更新资源路径无效');const dest=path.join(staging,key);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,Buffer.from(sea.getAsset(key)));}
   const result=spawnSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',path.join(staging,'install-update.ps1'),'-Target',home,...(!recognized?['-AllowUnrecognized']:[])],{windowsHide:true,encoding:'utf8',maxBuffer:1024*1024});
   if(result.status!==0)throw Error('更新未完成。请确认程序已停用，且更新文件完整、目录可写。');
   dialog('NikoLink 更新完成。个人数据与外部组件未覆盖，旧程序文件已备份。');
  }
 }
}catch(error){dialog(error.message);process.exitCode=1;}
finally{if(staging)fs.rmSync(staging,{recursive:true,force:true});}
