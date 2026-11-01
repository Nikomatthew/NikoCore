(() => {
  const el=id=>document.getElementById(id);
  let busy=false,revision=0;
  const controls=['loginBegin','loginAccounts','loginCatalog','loginInstance'];
  const auto=document.createElement('button');auto.type='button';auto.id='loginAutoAccounts';auto.textContent='自动获取';el('loginBegin').after(auto);controls.push(auto.id);
  auto.onclick=()=>perform(async()=>{
    if(!confirm('允许只读访问主 OpenCode 账号数据库，并将 API Key 导入聊天、任务与游戏共用的服务？同时导入自定义渠道配置；不搬运 OAuth，不向页面展示密钥。'))return;
    el('loginResult').textContent='正在获取账号';
    const result=await post('/api/auto-accounts',{instance:el('loginInstance').value,confirm:true});
    el('loginModels').replaceChildren();
    el('loginResult').textContent=result.results.length?result.results.map(item=>`${item.provider}：${item.connected?'已导入':'未导入，请使用官方登录窗口'}`).join('\n'):'没有可导入的 API Key 账号，请使用官方登录窗口。';
  });
  async function perform(operation){
    if(busy)return;
    busy=true;for(const id of controls)el(id).disabled=true;
    try{await operation();}catch(error){el('loginResult').textContent=error.message;}
    finally{busy=false;for(const id of controls)el(id).disabled=false;}
  }
  async function post(url,body){const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(120000)});const result=await response.json();if(!response.ok)throw Error(result.error||'操作失败');return result;}
  for(const [id,action] of [['loginBegin','login'],['loginAccounts','list']])el(id).onclick=()=>perform(async()=>{
    el('loginResult').textContent='正在打开官方终端';
    const result=await post('/api/official-login',{instance:el('loginInstance').value,action,confirm:true});
    el('loginResult').textContent='已发起共享 OpenCode 服务的官方终端。完成操作后刷新模型，聊天、任务与游戏共用账号；窗口打开不代表已登录。';
  });
  el('loginCatalog').onclick=()=>perform(async()=>{
    const current=el('loginInstance').value,version=revision;
    const result=await post('/api/isolated-login/catalog',{instance:current});
    if(version!==revision)return;
    el('loginModels').replaceChildren();for(const model of result.models){const option=document.createElement('option');option.value=model.id;option.textContent=`${model.name} · ${model.id}`;el('loginModels').append(option);}
    el('loginResult').textContent=`已读取 ${result.models.length} 个可用模型。`;
  });
  el('loginInstance').onchange=()=>{revision++;el('loginModels').replaceChildren();el('loginResult').textContent='';};
  el('loginSelectModel').onclick=()=>{const value=el('loginModels').value;if(!value)return;const fields={chat:'model',task:'taskModel',game:'gameJudgeModel'},name=fields[el('loginInstance').value];if(!name)return;const field=document.querySelector(`[name="${name}"]`);field.value=value;field.dispatchEvent(new Event('input',{bubbles:true}));el('loginResult').textContent='模型已填入，请保存设置。';};
})();
