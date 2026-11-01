import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {validateCapability,runCapability} from './game-capability-drafts.mjs';
export class GameCapabilityRegistry{
 constructor(directory){this.directory=directory;this.items=new Map();this.load();}
 load(){fs.mkdirSync(this.directory,{recursive:true});const items=new Map();for(const name of fs.readdirSync(this.directory)){if(!/^custom\.[a-z][a-z0-9-]{1,39}\.json$/.test(name))continue;const file=path.join(this.directory,name),stat=fs.lstatSync(file);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>64000)throw Error('能力安装文件无效');const stored=JSON.parse(fs.readFileSync(file,'utf8')),value=validateCapability(stored.capability),hash=crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');if(hash!==stored.hash||name!==value.id+'.json')throw Error('能力内容与批准摘要不符');items.set(value.id,{...value,hash});}this.items=items;}
 validate(action){const value=this.items.get(action?.type);if(!value)throw Error('缺少已批准的游戏能力：'+String(action?.type));if(action.hash!==value.hash)throw Error('游戏能力版本未绑定或摘要不匹配');}
 execute(action,state){this.validate(action);const value=this.items.get(action.type),next=runCapability(value,state);Object.assign(state,next);return value.description||'游戏操作完成';}
 list(){return [...this.items.values()].map(({id,description,hash})=>({id,description,hash}));}
}
