(() => {
  const root=document.documentElement;
  window.addEventListener('storage',event=>{
    if(event.key==='nikolink-theme'||event.key===null){let value='dark';try{value=localStorage.getItem('nikolink-theme')==='light'?'light':'dark';}catch{}root.dataset.theme=value;}
    if(event.key==='nikolink-motion'||event.key===null){try{motion=localStorage.getItem('nikolink-motion')==='off'?'off':'on';}catch{}applyMotion();}
  });
  let motion='on';try{motion=localStorage.getItem('nikolink-motion')==='off'?'off':'on';}catch{}
  function applyMotion(){root.dataset.motion=motion;for(const control of document.querySelectorAll('[data-motion-toggle]')){control.textContent=motion==='on'?'动效：开':'动效：关';control.setAttribute('aria-pressed',String(motion==='on'));control.title='切换界面动态效果';}}
  function motionButton(){const control=document.createElement('button');control.type='button';control.dataset.motionToggle='';control.onclick=()=>{motion=motion==='on'?'off':'on';try{localStorage.setItem('nikolink-motion',motion);}catch{}applyMotion();};return control;}
  applyMotion();
  const originalFetch=window.fetch.bind(window);
  let token='',busy=false;
  const app=document.body.dataset.app;
  const gate=document.createElement('div');gate.className='auth-gate';
  const box=document.createElement('form');box.className='auth-card';
  const logo=document.createElement('img');logo.src='/nikolink-logo.png';logo.alt='NikoLink';
  const title=document.createElement('h1');title.textContent='控制台登录';
  const password=document.createElement('input');password.type='password';password.minLength=5;password.required=true;password.autocomplete='off';password.placeholder='密码';password.setAttribute('aria-label','控制台密码');
  const confirmation=document.createElement('input');confirmation.type='password';confirmation.minLength=5;confirmation.autocomplete='off';confirmation.placeholder='再次输入密码';confirmation.setAttribute('aria-label','确认密码');
  const button=document.createElement('button');button.type='submit';button.className='primary';button.textContent='登录';
  const temporary=document.createElement('button');temporary.type='button';temporary.textContent='使用临时登录凭证';let temporaryMode=false;temporary.onclick=()=>{temporaryMode=!temporaryMode;password.minLength=temporaryMode?1:5;password.placeholder=temporaryMode?'输入根目录登录凭证.txt中的内容':'密码';password.value='';confirmation.hidden=temporaryMode||!setup;confirmation.required=!temporaryMode&&setup;temporary.textContent=temporaryMode?'使用密码登录':'使用临时登录凭证';};
  const message=document.createElement('p');message.setAttribute('role','status');
  const theme=document.createElement('button');theme.type='button';theme.textContent='日间 / 夜间';theme.onclick=()=>{const next=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=next;try{localStorage.setItem('nikolink-theme',next);}catch{}};
  try{document.documentElement.dataset.theme=localStorage.getItem('nikolink-theme')==='light'?'light':'dark';}catch{document.documentElement.dataset.theme='dark';}
  box.append(logo,title,password,confirmation,button,temporary,message,theme,motionButton());gate.append(box);document.body.append(gate);applyMotion();
  let setup=false;
  async function status(){try{const response=await originalFetch('/api/auth/status',{cache:'no-store'});if(!response.ok)throw Error('无法读取认证状态');const value=await response.json();setup=!value.configured;title.textContent=setup?'设置控制台密码':'控制台登录';confirmation.hidden=!setup;confirmation.required=setup;button.textContent=setup?'设置并进入':'登录';}catch(error){message.textContent=error.message;button.disabled=true;}}
  window.fetch=async(input,options={})=>{
    const url=new URL(typeof input==='string'?input:input.url,location.href);
    if(url.origin===location.origin&&url.pathname.startsWith('/api/')&&(!url.pathname.startsWith('/api/auth/')||['/api/auth/password-change','/api/auth/temporary-create'].includes(url.pathname))){
      const headers=new Headers(input instanceof Request?input.headers:undefined);new Headers(options.headers||{}).forEach((value,key)=>headers.set(key,value));headers.set('Authorization','Bearer '+token);
      const response=await originalFetch(input,{...options,headers});
      if(response.status===401){token='';location.reload();}return response;
    }
    return originalFetch(input,options);
  };
  box.onsubmit=async event=>{
    event.preventDefault();if(busy)return;busy=true;button.disabled=true;message.textContent='';
    try{
      const response=await originalFetch(temporaryMode?'/api/auth/temporary-login':setup?'/api/auth/setup':'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(temporaryMode?{credential:password.value}:{password:password.value,confirmation:confirmation.value})});
      const result=await response.json();if(!response.ok)throw Error(result.error||'登录失败');token=result.token;password.value='';confirmation.value='';
       const script=document.createElement('script');script.src=app;script.onload=()=>{gate.remove();document.body.classList.remove('locked');if(app==='/console.js'){document.querySelector('.topbar .actions').insertBefore(motionButton(),document.querySelector('#refresh'));applyMotion();for(const source of ['/isolated-login.js','/dashboard.js','/game-console.js']){const extra=document.createElement('script');extra.src=source;document.head.append(extra);}}};script.onerror=()=>{message.textContent='控制台脚本加载失败，请刷新重试';};document.head.append(script);
    }catch(error){message.textContent=error.message;password.value='';confirmation.value='';}finally{busy=false;button.disabled=false;}
  };
  window.addEventListener('pagehide',()=>{if(token){originalFetch('/api/auth/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token}),keepalive:true}).catch(()=>{});token='';}});
  window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
  status();
})();
