import crypto from 'node:crypto';
export class ToolResultPages{
 constructor(){this.items=new Map();this.bytes=0;}
 present(value){const text=JSON.stringify(value);if(text.length<=6000)return {content:[{type:'text',text}]};
  while(this.items.size>=16||this.bytes+text.length>8*1024*1024){const key=this.items.keys().next().value;if(key===undefined)throw Error('工具结果超过分页存储上限');this.bytes-=this.items.get(key).length;this.items.delete(key);}
  const ref=crypto.randomUUID();this.items.set(ref,text);this.bytes+=text.length;
  const summary={summary:true,complete:false,characters:text.length,reference:ref,detailTool:'nikolink_result_page',notice:'仅显示预览，完整结果仍保留于本工具服务；引用会在服务退出或缓存淘汰后失效',preview:text.slice(0,3000)};
  return {content:[{type:'text',text:JSON.stringify(summary)}]};
 }
 page({reference,offset=0,limit=4000}){const text=this.items.get(reference);if(!text)throw Error('结果引用已过期，请重新执行必要的读取');if(!Number.isInteger(offset)||offset<0||offset>text.length||!Number.isInteger(limit)||limit<1||limit>6000)throw Error('分页范围无效');return {content:[{type:'text',text:JSON.stringify({reference,offset,text:text.slice(offset,offset+limit),nextOffset:offset+limit<text.length?offset+limit:null,complete:offset+limit>=text.length,totalCharacters:text.length})}]};}
}
