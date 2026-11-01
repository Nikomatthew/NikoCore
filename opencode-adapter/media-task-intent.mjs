export function videoAnalysisRequest(text){return /视频|youtube|b站|bilibili|\.mp4\b/i.test(text)&&/分析|总结|概括|解读|讲了什么|内容是什么|识别|转写|提取字幕|听写/.test(text);}
export function videoAnalysisOutput(text){
 if(!videoAnalysisRequest(text))return null;
 const value=text.replace(/https?:\/\/[^\s]+/g,' ');
 if(/(?:原视频|视频文件|视频本身|完整视频).{0,12}(?:发|传|交付)|(?:发送|发出|发给|发到|上传|交付).{0,12}(?:原视频|视频文件|视频本身|完整视频)/.test(value))return null;
 if(/\b(?:pptx?|pdf|docx?|xlsx?)\b|(?:生成|制作|输出|交付|发送).{0,12}(?:报告|文档|附件)|(?:报告|文档|附件).{0,12}(?:发|传|交付)/i.test(value))return 'file';
 if(/(?:只要|仅要|只发|仅发|交付).{0,8}(?:分析图|分镜图|关键帧图|截图|图片)|(?:生成|制作).{0,8}(?:分析图|长图|信息图)/.test(value))return 'image';
 return 'text';
}
