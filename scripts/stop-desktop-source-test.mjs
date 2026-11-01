import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const home=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const instance=process.argv.includes('--online')?'v3-online-test':'v3-desktop-bot';
const file=path.join(home,'test-instances',instance,'data','opencode-adapter','state','test-instance.json');
if(fs.existsSync(file)){
 const info=JSON.parse(fs.readFileSync(file,'utf8'));if(info.instance!==instance||!Number.isSafeInteger(info.pid)||info.pid<=0)throw Error('测试实例标识无效');
 const url=new URL(info.address);if(url.hostname!=='127.0.0.1'||url.protocol!=='http:')throw Error('测试地址无效');
 const response=await fetch(new URL('/api/test-instance',url),{signal:AbortSignal.timeout(1500)});const active=await response.json();if(!response.ok||active.instance!==info.instance||active.pid!==info.pid)throw Error('测试后台身份不匹配，未停止任何进程');
 const script="$p=Get-CimInstance Win32_Process -Filter ('ProcessId='+$env:NIKO_TEST_PID);if($p -and $p.ExecutablePath -eq $env:NIKO_TEST_NODE -and $p.CommandLine.Contains($env:NIKO_TEST_SERVER)){Stop-Process -Id $p.ProcessId -Force}";
 execFileSync('powershell.exe',['-NoProfile','-Command',script],{env:{...process.env,NIKO_TEST_PID:String(info.pid),NIKO_TEST_NODE:process.execPath,NIKO_TEST_SERVER:path.join(home,'opencode-adapter','server.mjs')},windowsHide:true,stdio:'ignore'});
 console.log('已停止独立测试后台，测试存档保留。');
}
