let dashboardBusy=false;
const dashboardLabels={pending:'待审批',scheduled:'待执行',running:'执行中',starting:'启动中',completed:'已完成',succeeded:'已完成',failed:'失败',cancelled:'已取消',interrupted:'已中断',missed:'已错过',blocked:'已阻止'};
async function refreshDashboard(){
  if(dashboardBusy||view!=='overview'||!snapshot)return;
  dashboardBusy=true;
  try{
    const responses=await Promise.allSettled([api('/api/task-console',{}),api('/api/scheduled-tools',{}),api('/api/task-tools',{})]);
    if(view!=='overview')return;
    const tasks=responses[0].status==='fulfilled'?responses[0].value:null;
    const schedules=responses[1].status==='fulfilled'?responses[1].value:null;
    const tools=responses[2].status==='fulfilled'?responses[2].value:null;
    const active=tasks?.tasks.filter(task=>['running','starting'].includes(task.status))||[];
    const waiting=tasks?.tasks.filter(task=>task.status==='pending')||[];
    const upcoming=schedules?.items.filter(plan=>plan.status==='scheduled').sort((a,b)=>a.at-b.at)||[];
    document.querySelector('#modeMetric').textContent=tasks?String(active.length):'—';
    document.querySelector('#taskMetricDetail').textContent=tasks?`待审批 ${waiting.length} · 待执行计划 ${schedules?upcoming.length:'—'}`:'任务状态读取失败';
    const enabled=tools?.tools.filter(tool=>tool.enabled&&!tool.error)||[];
    document.querySelector('#sampleMetric').textContent=tools?String(enabled.length):'—';
    document.querySelector('#toolMetricDetail').textContent=tools?`已启用 / 共 ${tools.tools.length} 个工具`:'工具状态读取失败';
    const box=document.querySelector('#overviewActivity');
    const signature=JSON.stringify({active,waiting:waiting.slice(0,1),upcoming:upcoming.slice(0,3),errors:responses.map(result=>result.status)});
    if(box.dataset.signature===signature)return;
    box.dataset.signature=signature;box.replaceChildren();
    for(const task of [...active,...waiting].slice(0,2)){
      const row=document.createElement('article');row.className='activity-item';
      const top=document.createElement('div');top.className='activity-title';const title=document.createElement('strong');title.textContent=String(task.text||'任务').slice(0,90);const tag=document.createElement('span');tag.className='live-tag';tag.textContent=dashboardLabels[task.status]||task.status;top.append(title,tag);
      const model=document.createElement('div');model.className='activity-meta';model.textContent=task.model||snapshot.config.taskModel||snapshot.config.model;
      row.append(top,model);
      const budget=task.stepBudget,limit=task.stepLimit||budget?.limit||180;
      if(budget?.complete){const progress=document.createElement('progress');progress.max=limit;progress.value=Math.min(limit,budget.used);progress.setAttribute('aria-label','已使用执行步数');row.append(progress);}
      const stats=document.createElement('div');stats.className='activity-stats';stats.textContent=`${budget?'已用约 '+budget.used:'已用未知'} / ${limit} 步 · ${budget?.remaining!=null?'剩余约 '+budget.remaining:'剩余未知'}`;row.append(stats);
      const stage=document.createElement('div');stage.className='activity-meta';stage.textContent=task.progress?.stage||'等待执行';row.append(stage);
      if(task.status==='running'){const button=document.createElement('button');button.type='button';button.textContent='增加执行步数';button.onclick=async()=>{const raw=prompt('增加步数（1–180）','60');if(raw===null)return;const amount=Number(raw);if(!Number.isInteger(amount)||amount<1||amount>180)return notice('请输入1–180的整数');if(!confirm(`增加 ${amount} 步，可能增加模型费用，不延长执行时限。确认？`))return;try{await api('/api/owner-task-steps',{id:task.id,amount,confirm:true});box.dataset.signature='';await refreshDashboard();}catch(error){notice(error.message);}};row.append(button);}
      box.append(row);
    }
    for(const plan of upcoming.slice(0,3)){
      const row=document.createElement('article');row.className='activity-item';const top=document.createElement('div');top.className='activity-title';const title=document.createElement('strong');title.textContent=plan.tool;const state=document.createElement('span');state.textContent='待执行';state.className='subtle';top.append(title,state);const time=document.createElement('div');time.className='activity-meta';time.textContent=new Date(plan.at).toLocaleString();row.append(top,time);box.append(row);
    }
    if(!box.children.length){const empty=document.createElement('div');empty.className='activity-empty';empty.textContent=tasks&&schedules?'暂无执行中任务或待执行计划':'部分状态读取失败，请刷新重试';box.append(empty);}
  }finally{dashboardBusy=false;}
}
document.querySelector('#overviewAllTasks').onclick=()=>navigate('tasks');
document.querySelector('#overviewNewTask').onclick=async()=>{const text=prompt('输入主人任务内容');if(text===null||!text.trim())return;if(!confirm('创建任务申请，尚不执行，需主人批准后启动。确认？'))return;try{await api('/api/task-create',{text:text.trim(),confirm:true});notice('任务申请已创建，等待审批');navigate('tasks');await refreshOwnerTasks();}catch(error){notice(error.message);}};
for(const button of document.querySelectorAll('[data-output-filter]'))button.onclick=()=>{document.querySelector('#outputFilter').value=button.dataset.outputFilter;for(const other of document.querySelectorAll('[data-output-filter]'))other.setAttribute('aria-pressed',String(other===button));renderOutput();};
setInterval(()=>refreshDashboard().catch(()=>{}),5000);
refreshDashboard().catch(()=>{});
