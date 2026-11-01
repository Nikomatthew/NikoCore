export function parseGameRoutes(value){
 if(value===undefined||value==='')return [];
 if(typeof value!=='string'||value.length>16000)throw Error('端口映射格式无效');
 const rows=value.trim().split(/[\n,，]+/).map(s=>s.trim()).filter(Boolean),ports=new Set(),urls=new Set();if(rows.length>32)throw Error('最多32条端口映射');
  return rows.map(row=>{const parts=row.split(/\s+/);if(parts.length!==2)throw Error('每条填写：公网链接 本地端口');const legacy=/^\d+$/.test(parts[0]),portText=parts[legacy?0:1],address=parts[legacy?1:0];if(!/^\d+$/.test(portText))throw Error('本地端口须为数字');const port=Number(portText);let url;try{url=new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(address)?address:'http://'+address);}catch{throw Error('公网地址无效');}if(port<1024||port>65535||ports.has(port)||!['http:','https:'].includes(url.protocol)||url.username||url.password||url.pathname!=='/'||url.search||url.hash||['localhost','127.0.0.1','[::1]'].includes(url.hostname)||urls.has(url.origin)||!url.hostname.includes('.'))throw Error('映射端口/域名重复或无效，请填写完整公网域名');ports.add(port);urls.add(url.origin);return {port,url:url.origin};});
}
