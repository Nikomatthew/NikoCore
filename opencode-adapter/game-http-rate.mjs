export function gameRatePolicy(pathname,session){
 if(pathname==='/api/world'&&session)return {bucket:'world:'+session.id,window:1000,limit:25};
 const login=pathname==='/api/login'||pathname.startsWith('/api/qq-login/');
 return {bucket:login?'login':session?.id||'anonymous',window:60000,limit:120};
}
