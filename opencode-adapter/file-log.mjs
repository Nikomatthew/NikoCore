import fs from 'node:fs';
import path from 'node:path';
import {redactView} from './session-view.mjs';
export class FileLog{
 constructor(directory,{now=Date.now}={}){this.directory=directory;this.now=now;this.lastPrune=0;fs.mkdirSync(directory,{recursive:true});this.prune();}
 prune(){const now=this.now();for(const name of fs.readdirSync(this.directory)){if(!/^nikolink-\d{4}-\d{2}-\d{2}-\d+\.jsonl$/.test(name))continue;const file=path.join(this.directory,name),stat=fs.lstatSync(file);if(stat.isFile()&&!stat.isSymbolicLink()&&now-stat.mtimeMs>3*86400000)fs.unlinkSync(file);}this.lastPrune=now;}
 write(level,scope,text,secrets=[]){if(this.now()-this.lastPrune>3600000)this.prune();if(level==='reasoning')return;const date=new Date(this.now()).toISOString().slice(0,10),base=`nikolink-${date}-`;let index=0,file;do{file=path.join(this.directory,base+index+'.jsonl');if(!fs.existsSync(file)||fs.statSync(file).size<5*1048576)break;index++;}while(index<1000);if(index>=1000)throw Error('日志数量超过单日上限');const entry={at:new Date(this.now()).toISOString(),level,scope:redactView(String(scope),secrets),text:redactView(String(text),secrets).slice(0,12000)};fs.appendFileSync(file,JSON.stringify(entry)+'\n',{mode:0o600});}
}
