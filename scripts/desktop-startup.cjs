const fs=require('node:fs');
const path=require('node:path');
async function waitAndOpenPanel(home,app,{openPanel,fetcher=fetch,delay=ms=>new Promise(resolve=>setTimeout(resolve,ms)),attempts=120}={}){
 const logDirectory=path.join(app,'log');fs.mkdirSync(logDirectory,{recursive:true});
 const log=message=>fs.appendFileSync(path.join(logDirectory,'desktop-startup.log'),new Date().toISOString()+' '+message+'\n');
 log('waiting for backend');
 for(let i=0;i<attempts;i++){
  let url;
  try{url=fs.readFileSync(path.join(app,'state','panel.url'),'utf8').trim();const parsed=new URL(url);if(parsed.protocol!=='http:'||!['127.0.0.1','localhost'].includes(parsed.hostname)||parsed.username||parsed.password)throw Error('invalid panel URL');const response=await fetcher(url,{signal:AbortSignal.timeout(1000)});if(!response.ok)throw Error('backend not ready');}
  catch{await delay(250);continue;}
  try{const child=openPanel(home,url);log('panel spawn requested');if(child?.once)child.once('error',()=>log('panel process launch failed'));return child;}
  catch(error){log('panel launch failed: '+String(error.message));throw error;}
 }
 log('backend readiness timed out');throw Error('桌面面板等待后台就绪超时，请检查data/opencode-adapter/log/desktop-startup.log');
}
module.exports={waitAndOpenPanel};
