import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { validateFetchUrl } from '../src/safe-fetch.js';

export function browserRequest(event, config) {
  if (event.post_type !== 'message' || !['private','group'].includes(event.message_type)) return null;
  if (String(event.user_id) === String(event.self_id)) return null;
  const parts = Array.isArray(event.message) ? event.message : [];
  const text = parts.filter(p => p.type === 'text').map(p => p.data?.text || '').join('');
  const links = text.match(/https?:\/\/[^\s<>"“”]+/g) || [];
  const bv = text.match(/\bBV[A-Za-z0-9]{10}\b/);
  if (!links.length && !bv) return null;
  const group = event.message_type === 'group';
  if (group ? !config.groupEnabled || !config.groups.includes(String(event.group_id)) : String(event.user_id) !== config.ownerQQ && !config.privateQQ.includes(String(event.user_id))) return null;
  if (String(event.user_id) !== config.ownerQQ) return { denied:true, group, target:String(group ? event.group_id : event.user_id) };
  if (parts.some(p => !['text','at'].includes(p.type))) return { ignored:true };
  if (group && !parts.some(p => p.type === 'at' && String(p.data?.qq) === String(event.self_id))) return { ignored:true };
  return { url:links[0] || `https://www.bilibili.com/video/${bv[0]}`, instruction:text.slice(0,1500), group, target:String(group ? event.group_id : event.user_id), owner:config.ownerQQ };
}
export class TabbitBrowser {
  constructor(root, store) { this.root=root;this.store=store;this.task='NikoLink Niko Browser';this.cli=path.join(process.env.LOCALAPPDATA || '', 'Tabbit/LocalAgent/bin/tabbit-cli.exe');this.state={enabled:false,busy:false,url:'',title:'',text:'',links:[],error:'',updatedAt:0};this.image=null;this.pending=null;this.queue=null;this.epoch=0; }
  cliCall(args, code) {
    return new Promise((resolve,reject)=>{const child=spawn(this.cli,args,{windowsHide:true,stdio:['pipe','pipe','pipe']});let out='',err='';child.stdout.on('data',d=>out+=d);child.stderr.on('data',d=>err+=d);child.once('error',()=>reject(new Error('Tabbit启动器不可用')));child.once('close',()=>{try{const lines=out.trim().split(/\r?\n/);const json=lines.reverse().find(l=>l.trim().startsWith('{'));if(!json)throw Error();resolve(JSON.parse(json));}catch{reject(new Error('Tabbit响应不可解析，请检查启动器'));}});if(code)child.stdin.end(code);else child.stdin.end();});
  }
  async program(code) {
    if(this.pending)throw new Error('Tabbit仍有未完成请求，请先检查状态，不重复提交');
    const id=crypto.randomUUID();this.pending=id;
    const receipt=await this.cliCall(['nodejs','--task',this.task,'--request-id',id,'--timeout-ms','60000'],code);
    return this.settle(receipt,id);
  }
  async settle(receipt,id) {
    if(['queued','running'].includes(receipt.status))throw new Error('Tabbit请求仍在运行，请点击刷新浏览器状态');
    this.pending=null;
    if(receipt.status!=='succeeded')throw new Error('Tabbit浏览失败或被阻止，请查看浏览器完成验证，不自动重试');
    const result=receipt.result;if(result.resourceId){let offset=0,text='';for(let n=0;n<150;n++){const chunk=await this.cliCall(['resource','--task',this.task,'--resource',result.resourceId,'--offset',String(offset),'--max-bytes','65536']);text+=chunk.data||'';if(chunk.eof)return JSON.parse(text);offset=chunk.nextOffset;if(!Number.isInteger(offset))throw new Error('Tabbit资源分页不可用');}throw new Error('浏览器截图过大');}
    return result.value;
  }
  async refreshPending(){if(!this.pending)return;const id=this.pending;const receipt=await this.cliCall(['receipt','--task',this.task,'--request-id',id,'--wait-ms','1000']);const value=await this.settle(receipt,id);if(value)this.apply(value);}
  apply(value) { if(value?.image){this.image=Buffer.from(value.image,'base64');delete value.image;}Object.assign(this.state,value,{updatedAt:Date.now(),error:''}); }
  snapshotCode() { return `const info=await page.evaluate(()=>({url:location.href,title:document.title,text:(document.body?.innerText||'').slice(0,6500),links:[...document.querySelectorAll('a[href]')].map(a=>({text:(a.innerText||a.title||'').trim().slice(0,180),url:a.href})).filter(a=>a.text&&/^https:\\/\\/www\\.bilibili\\.com\\/video\\/BV/.test(a.url)).slice(0,30)}));const shot=await page.locator('body').screenshot({timeout:10000});return {...info,image:shot.toString('base64')};`; }
  async open(raw) {
    if(!this.state.enabled)throw new Error('请先在控制台启用浏览器');
    if(this.state.busy||this.pending)throw new Error('浏览器忙，请等待或刷新状态');
    const {url}=await validateFetchUrl(raw);if(url.username||url.password)throw new Error('不接受带凭据的网址');
    this.state.busy=true;const epoch=this.epoch;
    try {const value=await this.program(`await page.goto(${JSON.stringify(url.toString())},{waitUntil:'domcontentloaded',timeout:25000});${this.snapshotCode()}`);if(epoch===this.epoch)this.apply(value);}
    catch(e){this.state.error=e.message;throw e;}finally{this.state.busy=false;}
  }
  async action(action) {
    if(!this.state.enabled||this.state.busy||this.pending)throw new Error('浏览器未启用或正在执行');
    if(!['read','scroll','play','pause'].includes(action))throw new Error('此浏览器操作未开放');
    this.state.busy=true;
    try {let code='';if(action==='scroll')code='await page.evaluate(()=>window.scrollBy(0,600));';if(['play','pause'].includes(action)){if(!/^https:\/\/www\.bilibili\.com\/video\/BV/.test(this.state.url))throw new Error('只允许在B站视频页控制播放');code=action==='play'?'await page.locator("video").first().evaluate(v=>v.play());':'await page.locator("video").first().evaluate(v=>v.pause());';}this.apply(await this.program(code+this.snapshotCode()));}finally{this.state.busy=false;}
  }
  async video() {
    if (!this.state.enabled || this.state.busy || this.pending || !/^https:\/\/www\.bilibili\.com\/video\/BV[A-Za-z0-9]{10}/.test(this.state.url)) throw new Error('请先在任务浏览器打开一个BV视频页');
    this.state.busy=true;
    try { return await this.program(`return await page.evaluate(()=>{const s=globalThis.__INITIAL_STATE__?.videoData||{};const text=q=>document.querySelector(q)?.textContent?.trim()||'';return {bv:location.pathname.match(/BV[A-Za-z0-9]{10}/)?.[0],title:s.title||text('h1'),author:s.owner?.name||text('.up-name'),description:(s.desc||text('.basic-desc-info')).slice(0,1200),comments:[...document.querySelectorAll('.reply-content,.root-reply-container .reply-content')].map(e=>e.textContent.trim()).filter(Boolean).slice(0,10),coverage:'浏览器读取当前已加载的标题、简介和评论；播放不代表已理解画面或声音',at:Date.now()};});`); } finally{this.state.busy=false;}
  }
  async subtitles() {
    if(!this.state.enabled||this.state.busy||this.pending||!/^https:\/\/www\.bilibili\.com\/video\/BV/.test(this.state.url))throw new Error('当前不是可读取的视频页');
    this.state.busy=true;
    try{return await this.program(`const tracks=await page.evaluate(()=>{const s=globalThis.__INITIAL_STATE__||{};return(s.videoData?.subtitle?.list||s.subtitle?.subtitles||[]).slice(0,6).map(t=>({language:String(t.lan||''),url:String(t.subtitle_url||t.url||'')}));});const track=tracks.find(t=>/zh/.test(t.language))||tracks[0];if(!track)return {available:false,reason:'页面未暴露可访问字幕轨道'};const u=new URL(track.url,page.url());if(u.protocol!=='https:'||u.username||u.password||!['aisubtitle.hdslb.com','i0.hdslb.com','i1.hdslb.com','i2.hdslb.com'].includes(u.hostname))return {available:false,reason:'字幕来源不在只读白名单'};const result=await page.fetch(u.href,{method:'GET',redirect:'error'});if(!result.ok)return {available:false,reason:'字幕读取被拒绝'};const body=await result.json();const rows=Array.isArray(body.body)?body.body.slice(0,150):[];return {available:rows.length>0,language:track.language,text:rows.map(r=>String(r.content||'')).join(' ').slice(0,6000),partial:true};`);}finally{this.state.busy=false;}
  }
  enable(){if(!fs.existsSync(this.cli))throw new Error('未找到Tabbit稳定启动器');this.state.enabled=true;}
  async stop(){this.state.enabled=false;this.epoch++;this.queue=null;if(this.pending)throw new Error('已停止后续调度；当前Tabbit请求尚未完成，请刷新确认后再释放');await this.cliCall(['finish','--task',this.task]);}
  async tick(){if(!this.state.enabled||!this.queue||this.state.busy||this.pending)return;const request=this.queue;this.queue=null;if(request.owner!==this.store.value.ownerQQ||this.store.value.mode!=='reply')return;if(request.group&&(!this.store.value.groupEnabled||!this.store.value.groups.includes(request.target)))return;try{await this.open(request.url);if(this.onRead)await this.onRead(request,this.state);}catch(e){this.state.error=e.message;}}
}
