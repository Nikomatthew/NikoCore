import { redactView } from './session-view.mjs';
export function taskSteps(events=[]){const labels={webfetch:'读取了相关网页资料',websearch:'检索了相关公开资料',read:'读取了执行所需文件',glob:'查找了相关文件',grep:'检索了文件中的内容',shell:'执行了任务命令',patch:'提交了文件修改',edit:'提交了文件编辑',write:'写入了任务文件'};const steps=events.filter(e=>e.status==='completed').map(e=>{if(e.name==='shell'){const s=e.summary||'';if(/curl|Invoke-WebRequest|Start-BitsTransfer|IDMan/i.test(s))return '调用了下载或网络请求命令 下载完整性仍需单独校验';if(/Get-FileHash|sha256/i.test(s))return '调用了文件哈希检查 哈希一致性需和来源核对';if(/7z|tar\s+-t|Test-Archive/i.test(s))return '调用了压缩包检查命令 不能仅凭命令返回判定检查通过';if(/Get-ChildItem|Get-Item|Test-Path/i.test(s))return '检查了已有文件与目录状态';}return labels[e.name]||'完成了一项工具调用';});return [...new Set(steps)].slice(0,5);}

export function taskProgress(messages,permissions=[],secrets=[]){
  const events=messages.flatMap(m=>(m.content||[]).filter(p=>p.type==='tool').map(p=>({id:p.id,name:redactView(p.name||'tool',secrets).slice(0,100),status:p.state?.status||'unknown',startedAt:p.time?.ran||p.time?.created,completedAt:p.time?.completed,summary:redactView(JSON.stringify(p.state?.input||{}),secrets).slice(0,600),error:p.state?.status==='error'?redactView(p.state.error||'工具失败',secrets).slice(0,400):''}))).slice(-40);
  const running=events.findLast(e=>['running','streaming'].includes(e.status));
  return {stage:permissions.length?'等待工具授权':running?'工具运行中':'等待模型响应',events,lastEventAt:Math.max(0,...messages.map(m=>m.time?.completed||m.time?.created||0))};
}
