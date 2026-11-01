import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {validateFetchUrl} from '../src/safe-fetch.js';

export async function submitIDM({url,directory,name},launch=spawn){
   const exe=[process.env.NIKOLINK_IDM_EXE,...[process.env.ProgramFiles,process.env['ProgramFiles(x86)']].filter(Boolean).map(dir=>path.join(dir,'Internet Download Manager','IDMan.exe'))].filter(Boolean).find(file=>fs.existsSync(file));
   if(!exe)throw Error('未找到IDM，可通过NIKOLINK_IDM_EXE指定程序路径');
  const checked=await validateFetchUrl(url);
  if(checked.url.protocol!=='https:'||checked.url.port&&checked.url.port!=='443')throw Error('仅支持公开HTTPS下载');
  if(typeof name!=='string'||!/^[-\w.\u4e00-\u9fff ]{1,120}$/.test(name)||/[. ]$/.test(name)||/^\./.test(name)||/^(con|prn|aux|nul|com\d|lpt\d)(\.|$)/i.test(name))throw Error('文件名无效');
  const dir=fs.realpathSync(directory);if(fs.existsSync(path.join(dir,name)))throw Error('目标已存在，禁止覆盖；请检查原下载或换新名称');
  await new Promise((resolve,reject)=>{const child=launch(exe,['/d',checked.url.href,'/p',dir,'/f',name],{windowsHide:false,stdio:'ignore'});child.once('error',()=>reject(Error('IDM启动失败')));child.once('spawn',resolve);});
  return {status:'submitted',name,notice:'仅确认已提交IDM，未确认下载完成；暂停与续传请在IDM处理，不影响其他下载'};
}
