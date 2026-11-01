export function commandRecord(event,config,makeRoute){
 const parts=Array.isArray(event.message)?event.message:[];
 const text=parts.filter(p=>p.type==='text').map(p=>String(p.data?.text||'')).join('').trim();
 if(/^\/网页登录(?:\s|$)/.test(text))return null;
 if(!/^\/[\u4e00-\u9fffA-Za-z]/.test(text)||event.message_id==null||parts.some(p=>!['text','at'].includes(p.type)))return null;
 const r=makeRoute(event,config);if(!r)return null;
 const command=text.match(/^\/[^\s]+/)?.[0]||'/指令';
 return {...r,images:[],learn:false,text:`[指令请求记录，仅表示收到，不代表获准或已完成] ${command}（参数不写入此记录，避免保存密码、令牌及敏感任务内容）`};
}
