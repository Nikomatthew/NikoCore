import path from 'node:path';
import {mediaProcess} from './media-process.mjs';
export function parseSubtitleText(text,seconds){
 const stamp=value=>{const m=value.match(/^(\d{1,3}):(\d{2}):(\d{2})[,.](\d{3})$/);if(!m||Number(m[2])>59||Number(m[3])>59)return NaN;return Number(m[1])*3600+Number(m[2])*60+Number(m[3])+Number(m[4])/1000;};
 const segments=[];
 for(const block of String(text).replace(/^\uFEFF/,'').replace(/\r\n/g,'\n').split(/\n\s*\n/)){
  const lines=block.split('\n'),index=lines.findIndex(line=>line.includes('-->'));if(index<0)continue;
  const match=lines[index].match(/(\d{1,3}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{1,3}:\d{2}:\d{2}[,.]\d{3})/);if(!match)continue;
  const start=stamp(match[1]),end=stamp(match[2]);if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<=start||start>=seconds)continue;
  const value=lines.slice(index+1).join(' ').replace(/<[^>]*>/g,'').replace(/\{\\[^}]*\}/g,'').trim();if(value)segments.push({start,end:Math.min(end,seconds),text:value.slice(0,4000)});
  if(segments.length>=10000)break;
 }
 segments.sort((a,b)=>a.start-b.start);return {text:segments.map(s=>s.text).join('，'),segments,source:'embedded-subtitle'};
}
export async function embeddedSubtitles(home,input,seconds,signal,process=mediaProcess){
 try{const text=await process(path.join(home,'tools','ffmpeg.exe'),['-nostdin','-v','error','-protocol_whitelist','file,pipe','-i',input,'-t',String(seconds),'-map','0:s:0','-f','srt','pipe:1'],{signal});const transcript=parseSubtitleText(text,seconds);return transcript.segments.length?transcript:null;}
 catch(error){signal?.throwIfAborted();return null;}
}
