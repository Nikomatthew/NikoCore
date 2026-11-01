import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
export class GameNumbers{
 constructor(directory,{randomInt=crypto.randomInt}={}){fs.mkdirSync(directory,{recursive:true});this.file=path.join(directory,'numbers.json');this.values=fs.existsSync(this.file)?JSON.parse(fs.readFileSync(this.file,'utf8')):{};this.randomInt=randomInt;const codes=Object.values(this.values);if(codes.some(c=>typeof c!=='string'||!/^\d{6}$/.test(c))||new Set(codes).size!==codes.length)throw Error('游戏编号索引冲突');}
 get(id){if(this.values[id])return this.values[id];const used=new Set(Object.values(this.values));let code;for(let i=0;i<1000;i++){code=String(this.randomInt(100000,1000000));if(!used.has(code))break;code=null;}if(!code)throw Error('无法分配游戏编号');this.values[id]=code;try{fs.writeFileSync(this.file+'.tmp',JSON.stringify(this.values),{mode:0o600});fs.renameSync(this.file+'.tmp',this.file);}catch(e){delete this.values[id];throw e;}return code;}
 resolve(code){return Object.keys(this.values).find(id=>this.values[id]===code);}
}
