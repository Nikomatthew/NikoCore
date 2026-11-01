import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
const home=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const directory=path.join(home,'data','opencode-adapter','state');
const pid=path.join(directory,'bridge.pid');
if(fs.existsSync(pid)){try{process.kill(Number(fs.readFileSync(pid,'utf8')),0);throw Error('请先停止NikoLink，再重置密码');}catch(error){if(error.code!=='ESRCH')throw error;}}
const input=readline.createInterface({input:process.stdin,output:process.stdout});
try{if(await input.question('此操作只移走本机控制台密码，不删除聊天数据。输入 RESET 确认：')==='RESET'){const file=path.join(directory,'panel-auth.json');if(fs.existsSync(file)){const backup=path.join(directory,'password-reset-backups');fs.mkdirSync(backup,{recursive:true});fs.renameSync(file,path.join(backup,Date.now()+'.json'));}console.log('密码已重置，下次进入需重新设置。');}}finally{input.close();}
