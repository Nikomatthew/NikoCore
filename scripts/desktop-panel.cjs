const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
function openPanel(home,url,launch=spawn,appRoot=process.env.NIKOLINK_APP_ROOT||path.join(home,'data','opencode-adapter')){
 const executable=path.join(home,'runtime','panel','NikoLink.Panel.exe');
 if(!fs.existsSync(executable))throw Error('桌面面板未构建，请先运行build-desktop-shell.mjs');
 let settings={};try{settings=JSON.parse(fs.readFileSync(path.join(appRoot,'state','settings.json'),'utf8'));}catch{}
 let snowURL='';const snow=settings.snowlumaDirectory||path.join(home,'snowluma');
 try{const config=JSON.parse(fs.readFileSync(path.join(snow,'config','runtime.json'),'utf8'));const port=Number(config.webuiPort);if(Number.isInteger(port)&&port>=1024&&port<=65535)snowURL=`http://127.0.0.1:${port}/`;}catch{}
 const child=launch(executable,[url,path.join(path.dirname(appRoot),'panel'),snowURL],{windowsHide:true,detached:true,stdio:'ignore'});child.once('error',()=>{});child.unref();return child;
}
module.exports={openPanel};
