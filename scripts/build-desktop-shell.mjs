import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),output=process.argv[2];
if(!output||fs.existsSync(output))throw Error('请指定不存在的桌面壳输出目录');
const version='1.0.4314.35',dir=path.join(root,'backups','webview2-sdk-'+version);fs.mkdirSync(dir,{recursive:true});
const packageFile=path.join(dir,'sdk.zip');
if(!fs.existsSync(packageFile)){const url=`https://api.nuget.org/v3-flatcontainer/microsoft.web.webview2/${version}/microsoft.web.webview2.${version}.nupkg`;const response=await fetch(url);if(!response.ok)throw Error('WebView2 SDK下载失败');const bytes=Buffer.from(await response.arrayBuffer());fs.writeFileSync(packageFile,bytes);fs.writeFileSync(path.join(dir,'download.json'),JSON.stringify({url,sha256:crypto.createHash('sha256').update(bytes).digest('hex')}));}
const sdk=path.join(dir,'sdk');if(!fs.existsSync(sdk))execFileSync('powershell.exe',['-NoProfile','-Command','Expand-Archive -LiteralPath $env:NIKO_SDK_ZIP -DestinationPath $env:NIKO_SDK_DIR'],{env:{...process.env,NIKO_SDK_ZIP:packageFile,NIKO_SDK_DIR:sdk},stdio:'inherit'});
fs.mkdirSync(output,{recursive:true});
for(const name of ['Microsoft.Web.WebView2.Core.dll','Microsoft.Web.WebView2.WinForms.dll'])fs.copyFileSync(path.join(sdk,'lib','net462',name),path.join(output,name));
fs.copyFileSync(path.join(sdk,'runtimes','win-x64','native','WebView2Loader.dll'),path.join(output,'WebView2Loader.dll'));
const compiler=path.join(process.env.WINDIR,'Microsoft.NET','Framework64','v4.0.30319','csc.exe');
execFileSync(compiler,['/nologo','/target:winexe','/platform:x64','/win32icon:'+path.join(root,'assets','nikolink.ico'),'/out:'+path.join(output,'NikoLink.Panel.exe'),'/reference:System.Windows.Forms.dll','/reference:System.Drawing.dll','/reference:'+path.join(output,'Microsoft.Web.WebView2.Core.dll'),'/reference:'+path.join(output,'Microsoft.Web.WebView2.WinForms.dll'),path.join(root,'desktop','Panel.cs')],{stdio:'inherit'});
for(const name of ['LICENSE.txt','LICENSE'])if(fs.existsSync(path.join(sdk,name)))fs.copyFileSync(path.join(sdk,name),path.join(output,'WebView2-SDK-LICENSE.txt'));
console.log('桌面面板已编译：'+path.resolve(output));
