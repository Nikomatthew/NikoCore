export const mediaDefaults={videoMaxMiB:200,videoSourceSeconds:1800,videoAnalyzeSeconds:1800,videoFrameCount:9,videoFrameStrategy:'scene',videoIntervalSeconds:30,videoSheetWidth:1440,mediaOverflow:'truncate',mediaTimeoutSeconds:600,audioMaxMiB:100,audioMaxSeconds:1800,audioTranscribe:true,videoTranscriptMode:'asr',imageMaxMiB:20,imageMaxCount:6,videoDetailEnabled:false,videoDetailAt:0,videoDetailWidth:1280};
const ranges={videoMaxMiB:[1,500],videoSourceSeconds:[10,14400],videoAnalyzeSeconds:[5,3600],videoFrameCount:[4,16],videoIntervalSeconds:[1,300],videoSheetWidth:[480,2160],mediaTimeoutSeconds:[30,1800],audioMaxMiB:[1,500],audioMaxSeconds:[10,14400],imageMaxMiB:[1,50],imageMaxCount:[1,6],videoDetailAt:[0,3600],videoDetailWidth:[480,1920]};
export function mediaSettings(input={}){
 const out={...mediaDefaults,mediaCacheEnabled:false,mediaCacheHours:24,mediaCacheMiB:100};
 for(const [key,max]of [['mediaCacheHours',168],['mediaCacheMiB',1000]])if(input[key]!==undefined){const n=Number(input[key]);if(!Number.isInteger(n)||n<1||n>max)throw Error('媒体缓存范围无效');out[key]=n;}
 if(input.mediaCacheEnabled!==undefined){if(typeof input.mediaCacheEnabled!=='boolean')throw Error('缓存开关无效');out.mediaCacheEnabled=input.mediaCacheEnabled;}
 for(const [key,[min,max]]of Object.entries(ranges)){if(input[key]===undefined)continue;const n=Number(input[key]);if(!Number.isInteger(n)||n<min||n>max)throw Error(`${key} 需为${min}–${max}整数`);out[key]=n;}
 for(const [key,values]of Object.entries({videoFrameStrategy:['scene','uniform','interval'],mediaOverflow:['reject','truncate'],videoTranscriptMode:['off','asr','subtitle-first']})){if(input[key]!==undefined){if(!values.includes(input[key]))throw Error(`${key}选项无效`);out[key]=input[key];}}
  for(const key of ['audioTranscribe','videoDetailEnabled'])if(input[key]!==undefined){if(typeof input[key]!=='boolean')throw Error('视听开关无效');out[key]=input[key];}
 return out;
}
export function mediaCoverage(info,kind,config){
 const c=mediaSettings(config),source=kind==='video'?c.videoSourceSeconds:c.audioMaxSeconds;
 if(info.duration>source)throw Error(`源${kind==='video'?'视频':'音频'}超过允许时长${source}秒`);
 const covered=Math.min(info.duration,kind==='video'?c.videoAnalyzeSeconds:c.audioMaxSeconds);
 if(covered<info.duration&&c.mediaOverflow==='reject')throw Error('媒体超过单次分析时长，请提供更短片段');
 return covered;
}
