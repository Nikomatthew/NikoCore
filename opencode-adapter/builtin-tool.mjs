import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { mediaProcess } from './media-process.mjs';
import { resolveMediaProxy } from './media-proxy.mjs';
import { LocalASR } from './local-asr.mjs';
import { probeMedia, buildStoryboard } from './video-storyboard.mjs';
import {mediaSettings,mediaCoverage} from './media-settings.mjs';
import {embeddedSubtitles} from './video-subtitles.mjs';
import {extractVideoDetail} from './video-detail.mjs';
import {transcriptEvidence} from './media-evidence.mjs';

export async function runBuiltinTool(name,args,context) {
  const home=process.env.NIKOLINK_HOME;
  if(!home||!context?.workspace)throw Error('缺少工具运行位置');
  const root=await fs.realpath(context.workspace);
  const safe=async relative=>{
    if(typeof relative!=='string'||!relative||path.isAbsolute(relative))throw Error('请提供工作区相对路径');
    const file=path.resolve(root,relative);
    if(!file.startsWith(root+path.sep))throw Error('路径越出工作区');
    const real=await fs.realpath(file);
    if(real!==file||!real.startsWith(root+path.sep))throw Error('不允许链接或越界路径');
    return real;
  };
  const safeOutput=async relative=>{
    if(typeof relative!=='string'||!/^[-\w.\u4e00-\u9fff ]{1,100}$/.test(relative)||/^[. ]|[. ]$/.test(relative)||/^(con|prn|aux|nul|com\d|lpt\d)(\.|$)/i.test(relative))throw Error('输出文件名无效');
    const output=path.join(root,relative);
    try{await fs.lstat(output);throw Error('目标已存在，不覆盖');}catch(error){if(error.code!=='ENOENT')throw error;}
    return output;
  };
  if(name==='text-file'){
    if(typeof args.text!=='string'||Buffer.byteLength(args.text)>1000000||! /\.(md|txt|json|csv)$/i.test(args.name))throw Error('仅支持1MB以内的文本文件');
    const file=await safeOutput(args.name);await fs.writeFile(file,args.text,{flag:'wx'});return {file:path.relative(root,file),bytes:Buffer.byteLength(args.text)};
  }
  if(name==='file-info'){
    const file=await safe(args.file),stat=await fs.stat(file);if(!stat.isFile()||stat.size>200*1048576)throw Error('文件过大或不是普通文件');
    return {file:path.relative(root,file),bytes:stat.size,sha256:crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex')};
  }
  if(name==='media-download'){
    const url=new URL(args.url);
    if(url.protocol!=='https:'||url.username||url.password||url.port&&url.port!=='443'||!['youtube.com','www.youtube.com','m.youtube.com','youtu.be','bilibili.com','www.bilibili.com','m.bilibili.com','b23.tv'].includes(url.hostname))throw Error('仅支持公开B站或YouTube地址');
    if(!['video','audio'].includes(args.mode))throw Error('mode需为video或audio');
    const job=path.join(root,'download-'+crypto.randomUUID());await fs.mkdir(job);
    const tools=path.join(home,'tools');
    const argv=['--ignore-config','--force-ipv4','--no-playlist','--no-warnings','--no-progress','--socket-timeout','20','--retries','1','--max-filesize','200M','--ffmpeg-location',tools,'--js-runtimes','node','-o',path.join(job,'media.%(ext)s')];
    if(args.mode==='video')argv.push('-f','bv*[height<=720]+ba/b[height<=720]','--merge-output-format','mp4');else argv.push('-x','--audio-format','mp3');
    const proxy=await resolveMediaProxy();if(proxy)argv.push('--proxy',proxy);argv.push('--',url.href);
    await mediaProcess(path.join(tools,'yt-dlp.exe'),argv);
    const files=(await fs.readdir(job)).filter(n=>/\.(mp4|mkv|webm|mp3)$/.test(n));
    if(files.length!==1)throw Error('未得到单个完整媒体文件');
    const file=path.join(job,files[0]),stat=await fs.stat(file);if(stat.size>200*1048576)throw Error('媒体超过200MiB');
    const info=await probeMedia(home,file);return {file:path.relative(root,file),bytes:stat.size,...info};
  }
  if(['audio-transcribe','video-analysis'].includes(name)){
    let saved={};try{saved=JSON.parse(await fs.readFile(process.env.NIKOLINK_TOOL_SETTINGS||path.join(home,'data','opencode-adapter','state','settings.json'),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
    const settings=mediaSettings(saved),kind=name==='video-analysis'?'video':'audio';
    const input=await safe(args.file),info=await probeMedia(home,input);
    const stat=await fs.stat(input);if(stat.size>(kind==='video'?settings.videoMaxMiB:settings.audioMaxMiB)*1048576)throw Error('媒体超过设置的大小上限');
    const seconds=mediaCoverage(info,kind,settings);
    if(name==='video-analysis'&&!info.video)throw Error('文件没有视频轨');
    const job=path.join(root,'analysis-'+crypto.randomUUID());await fs.mkdir(job);
    const asr=new LocalASR(home);let transcript={text:'',segments:[]};
    const signal=AbortSignal.timeout(settings.mediaTimeoutSeconds*1000);
    try{
      const subtitle=kind==='video'&&settings.videoTranscriptMode==='subtitle-first'?await embeddedSubtitles(home,input,seconds,signal):null;
      if(subtitle)transcript=subtitle;
      else if(info.audio&&(kind==='video'?settings.videoTranscriptMode!=='off':settings.audioTranscribe))transcript={...await asr.transcribe(input,job,signal,seconds),source:'local-asr',...(settings.videoTranscriptMode==='subtitle-first'?{subtitleFallback:'未读取到可用内嵌文本字幕，已尝试本地转写'}:{})};
      else transcript.source=kind==='video'&&settings.videoTranscriptMode==='off'||kind==='audio'&&!settings.audioTranscribe?'disabled':'no-audio-or-subtitle';
    }finally{asr.stop();}
    const transcriptFile=path.join(job,'transcript.json');await fs.writeFile(transcriptFile,JSON.stringify(transcript));
    let board;if(name==='video-analysis')board=await buildStoryboard(home,input,job,info,signal,settings);
    const detail=name==='video-analysis'?await extractVideoDetail(home,input,job,info,settings,signal):null;
     return {...transcriptEvidence(transcript),transcriptFile:path.relative(root,transcriptFile),...(board?{image:path.relative(root,path.join(job,'storyboard.png')),evidence:{...board.evidence,...(detail?{detail}:{})}}:{}),...(detail?{detailImage:path.relative(root,path.join(job,detail.file))}:{}),duration:info.duration};
  }
  if(name==='screen-capture'){
    const output=await safeOutput(args.name||'screenshot.png');if(!/\.png$/i.test(output))throw Error('截图仅支持PNG');
    const helper=path.join(home,'data','opencode-adapter','capture-screen.ps1');
    const source=await fs.stat(helper).then(()=>helper).catch(()=>path.join(home,'opencode-adapter','capture-screen.ps1'));
    if(!['Primary','All'].includes(args.mode||'Primary'))throw Error('当前工具只支持主屏或全屏');
    await mediaProcess('powershell.exe',['-NoProfile','-File',source,'-Mode',args.mode||'Primary','-Output',output]);
    return {file:path.relative(root,output),bytes:(await fs.stat(output)).size};
  }
  throw Error('未知内置工具');
}
