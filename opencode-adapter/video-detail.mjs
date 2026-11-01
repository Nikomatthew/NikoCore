import path from 'node:path';
import {mediaProcess} from './media-process.mjs';
import {mediaSettings,mediaCoverage} from './media-settings.mjs';
export function videoDetailPlan(info,settings){
 const c=mediaSettings(settings);if(!c.videoDetailEnabled)return null;
 const covered=mediaCoverage(info,'video',c);
 if(c.videoDetailAt>=covered)throw Error('细看时间点不在本次允许分析区间内，请调整时间点或分析时长');
 return {seconds:c.videoDetailAt,width:c.videoDetailWidth,file:'detail.png',sampled:true};
}
export async function extractVideoDetail(home,input,directory,info,settings,signal,run=mediaProcess){
 const plan=videoDetailPlan(info,settings);if(!plan)return null;
 await run(path.join(home,'tools','ffmpeg.exe'),['-nostdin','-v','error','-protocol_whitelist','file,pipe','-ss',String(plan.seconds),'-i',input,'-frames:v','1','-vf',`scale=w=min(iw\\,${plan.width}):h=-2`,'-threads','2',path.join(directory,plan.file)],{signal});return plan;
}
