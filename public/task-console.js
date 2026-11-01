history.replaceState(null,'',location.pathname);
sessionStorage.removeItem('nikolink-task-token');
async function api(path,data={}){const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),signal:AbortSignal.timeout(20000)});const v=await r.json();if(!r.ok)throw Error(v.error||'请求失败');return v;}
const text=(tag,value)=>{const el=document.createElement(tag);el.textContent=value;return el;};
const cards=new Map();
let busy=false;
function button(label,fn){const b=text('button',label);b.type='button';b.onclick=fn;return b;}
function updateRegion(el,value,render){const signature=JSON.stringify(value);if(el.dataset.signature===signature)return;render();el.dataset.signature=signature;}
function createCard(id){
  const card=document.createElement('section');card.dataset.taskId=id;
  const heading=text('h2',''),request=text('p',''),stage=text('p',''),elapsed=text('p',''),error=text('p','');
  const events=document.createElement('div'),files=document.createElement('div'),permissions=document.createElement('div'),controls=document.createElement('div');
  const steps=document.createElement('div');
  const guidance=document.createElement('section'),input=document.createElement('textarea');input.placeholder='输入任务指导';input.setAttribute('aria-label','补充说明');guidance.append(input);
  for(const interrupt of [false,true])guidance.append(button(interrupt?'中断并提交指导':'追加指导',async()=>{const value=input.value;if(!value.trim()||!confirm('确认提交任务指导？'))return;const ok=await act('/api/owner-task-guide',{id,text:value,interrupt,confirm:true});if(ok&&input.value===value)input.value='';}));
  const details=document.createElement('details'),output=document.createElement('div');details.append(text('summary','任务输出'),output);
  card.append(heading,request,stage,elapsed,error,events,files,permissions,controls,steps,guidance,details);
  const view={card,heading,request,stage,elapsed,error,events,files,permissions,controls,steps,guidance,input,details,output};cards.set(id,view);return view;
}
function renderTask(t,data){
  const v=cards.get(t.id)||createCard(t.id);
  v.heading.textContent=`${({pending:'待审批',starting:'启动中',running:'执行中',succeeded:'已完成',failed:'失败',cancelled:'已取消',timed_out:'已超时',interrupted:'已中断',rejected:'已拒绝'})[t.status]||t.status} · ${({text:'文字',image:'图片',file:'文件',video:'视频'})[t.resultKind]||'结果'} · ${t.id.slice(0,8)}`;
  v.request.textContent=t.text;v.stage.textContent=t.progress?.stage||'未开始';v.error.textContent=t.monitorError||'';
  v.elapsed.textContent=t.startedAt?`已运行 ${Math.max(0,Math.round(((t.status==='running'?Date.now():t.progress?.lastEventAt||t.startedAt)-t.startedAt)/1000))} 秒`:'';
  updateRegion(v.events,t.progress?.events||[],()=>v.events.replaceChildren(...(t.progress?.events||[]).map(e=>text('pre',`${e.name} · ${e.status}\n${e.summary}${e.error?'\n'+e.error:''}`))));
  updateRegion(v.files,t.files||[],()=>v.files.replaceChildren(...(t.files||[]).map(f=>text('p',`${f.name} · ${f.bytes} bytes · ${f.verification}`))));
  const pending=data.activeID===t.id?data.permissions||[]:[];
  updateRegion(v.permissions,pending,()=>{v.permissions.replaceChildren();for(const p of pending){v.permissions.append(text('pre',`待授权：${p.action}\n${p.resources.join('\n')}`));for(const [label,allow] of [['允许本次',true],['拒绝',false]])v.permissions.append(button(label,()=>act('/api/owner-task-permission',{id:t.id,requestID:p.id,allow})));}});
  updateRegion(v.controls,{status:t.status,activeID:data.activeID},()=>{v.controls.replaceChildren();if(t.status==='running'){v.controls.append(button('延长15分钟',()=>{if(confirm('允许此任务继续执行15分钟？'))act('/api/owner-task-extend',{id:t.id,minutes:15,confirm:true});}),button('停止任务',()=>{if(confirm('停止当前任务？半成品保留。'))act('/api/owner-task-cancel',{id:t.id});}));}if(t.status==='succeeded'&&(t.files||[]).some(f=>/\.mp4$/i.test(f.name))){v.controls.append(button('发送已有视频',async()=>{const preview=await api('/api/owner-task-video',{id:t.id,confirm:true});if(preview.preview&&confirm('把 '+preview.name+'（'+Math.round(preview.bytes/1048576)+'MB）发到 '+(preview.destination?.group?'群 ':'私聊 ')+(preview.destination?.target||'')+'？'))await act('/api/owner-task-video',{id:t.id,hash:preview.hash,confirm:true});}));}if(!data.activeID&&['cancelled','timed_out','interrupted','failed'].includes(t.status)&&t.sessionID)v.controls.append(button('继续执行',()=>{if(confirm('继续原任务并重新计时15分钟？'))act('/api/owner-task-resume',{id:t.id,confirm:true});}));});
  const stepSignature=JSON.stringify({status:t.status,steps:t.stepLimit||180,budget:t.stepBudget,model:t.model});
  if(v.card.dataset.steps!==stepSignature){v.steps.replaceChildren();const budget=t.stepBudget;v.steps.append(text('p',`执行步数：${budget?'已用约 '+budget.used:'已用未知'} / 上限 ${t.stepLimit||180} · ${budget?.remaining!=null?'剩余约 '+budget.remaining:'剩余未知'}${t.model?' · 模型：'+t.model:''}`));if(budget?.remaining!=null&&budget.remaining<=10)v.steps.append(text('p','执行步数即将耗尽，可增加步数；执行时限需单独延长。'));if(['running','cancelled','timed_out','interrupted','failed','succeeded'].includes(t.status))v.steps.append(button('增加执行步数',async()=>{const raw=prompt('增加步数（1–180）','60');if(raw===null)return;const amount=Number(raw);if(!Number.isInteger(amount)||amount<1||amount>180){document.querySelector('#error').textContent='请输入1–180的整数';return;}if(confirm(`为该任务增加 ${amount} 步？这可能增加模型费用，不延长执行时限。`))await act('/api/owner-task-steps',{id:t.id,amount,confirm:true});}));v.card.dataset.steps=stepSignature;}
  v.guidance.hidden=t.status!=='running';
  const messages=(t.output||[]).flatMap(m=>(m.content||[]).filter(p=>p.type==='text').map(p=>p.text));
  updateRegion(v.output,messages,()=>{const top=v.output.scrollTop;v.output.replaceChildren(...messages.map(s=>text('pre',s)));v.output.scrollTop=top;});
  return v.card;
}
async function refresh(){
  if(busy)return;busy=true;
  try{const data=await api('/api/task-console'),box=document.querySelector('#tasks'),ids=new Set(data.tasks.map(t=>t.id));
    for(const [id,v]of cards)if(!ids.has(id)){v.card.remove();cards.delete(id);}
    let previous=null;for(const t of data.tasks.slice().reverse()){const card=renderTask(t,data),expected=previous?previous.nextSibling:box.firstChild;if(card!==expected)box.insertBefore(card,expected);previous=card;}
    document.querySelector('#error').textContent='';
  }catch(e){document.querySelector('#error').textContent=e.message;}finally{busy=false;}
}
async function act(path,data){try{await api(path,data);await refresh();return true;}catch(e){document.querySelector('#error').textContent=e.message;return false;}}
document.querySelector('#refresh').onclick=refresh;
document.querySelector('#idmSubmit').onclick=async()=>{if(!confirm('交给 IDM 下载？'))return;await act('/api/owner-task-idm',{id:document.querySelector('#idmTask').value.trim(),url:document.querySelector('#idmURL').value.trim(),name:document.querySelector('#idmName').value.trim(),confirm:true});};
refresh();setInterval(refresh,4000);
