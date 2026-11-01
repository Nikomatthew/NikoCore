export function replySegments(r,text){return [...(r.group&&r.quotePending&&/^-?\d{1,30}$/.test(String(r.messageID))?[{type:'reply',data:{id:String(r.messageID)}}]:[]),{type:'text',data:{text}}];}
