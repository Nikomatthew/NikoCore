import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
export function validateCapability(value){
 if(!value||value.format!==1||typeof value.id!=='string'||!/^custom\.[a-z][a-z0-9-]{1,39}$/.test(value.id)||typeof value.description!=='string'||value.description.length>300||!Array.isArray(value.operations)||value.operations.length<1||value.operations.length>32)throw Error('自定义游戏能力格式无效');
 for(const op of value.operations){if(!op||!['add','require','set'].includes(op.type)||!/^v_[a-z][a-z0-9_]{0,31}$/.test(op.field)||!Number.isSafeInteger(op.value)||Math.abs(op.value)>1000000)throw Error('自定义能力操作无效');if(op.type==='require'&&!['gte','lte','eq'].includes(op.compare))throw Error('条件比较无效');}
 return {format:1,id:value.id,description:value.description,operations:value.operations.map(op=>({type:op.type,field:op.field,value:op.value,...(op.type==='require'?{compare:op.compare}:{})}))};
}
export function runCapability(value,state){
 const capability=validateCapability(value),next=structuredClone(state);
 for(const op of capability.operations){const old=next[op.field]??0;if(!Number.isSafeInteger(old))throw Error('游戏状态字段格式不符');if(op.type==='require'){if(!(op.compare==='gte'?old>=op.value:op.compare==='lte'?old<=op.value:old===op.value))throw Error('未满足游戏操作条件');}else{const result=op.type==='add'?old+op.value:op.value;if(!Number.isSafeInteger(result)||Math.abs(result)>1000000000)throw Error('游戏数值超过上限');next[op.field]=result;}}
 return next;
}
export class GameCapabilityDrafts{
 constructor(directory){this.directory=directory;fs.mkdirSync(directory,{recursive:true});}
 save(value){const capability=validateCapability(value),hash=crypto.createHash('sha256').update(JSON.stringify(capability)).digest('hex');fs.writeFileSync(path.join(this.directory,hash+'.json'),JSON.stringify(capability,null,2),{mode:0o600});return {id:capability.id,hash,status:'draft'};}
 read(hash){if(!/^[a-f0-9]{64}$/.test(hash))throw Error('能力摘要无效');const file=path.join(this.directory,hash+'.json'),stat=fs.lstatSync(file);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>64000)throw Error('能力文件无效');const value=validateCapability(JSON.parse(fs.readFileSync(file,'utf8')));if(crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex')!==hash)throw Error('能力内容已变化');return value;}
 list(){return fs.readdirSync(this.directory).filter(n=>/^[a-f0-9]{64}\.json$/.test(n)).map(n=>({hash:n.slice(0,-5),capability:this.read(n.slice(0,-5))}));}
 install(hash,directory){const value=this.read(hash);fs.mkdirSync(directory,{recursive:true});const file=path.join(directory,value.id+'.json');if(fs.existsSync(file))throw Error('同名能力已安装，请使用不同版本编号，避免改变旧游戏');fs.writeFileSync(file,JSON.stringify({hash,capability:value}),{flag:'wx',mode:0o600});return value;}
}
export function capabilityAuthoringInstruction(){return ' 缺少现有能力时，可同时生成capabilities.json，格式{"capabilities":[{"format":1,"id":"custom.work","description":"工作能力","operations":[{"type":"require","field":"v_energy","compare":"gte","value":1},{"type":"add","field":"v_energy","value":-1},{"type":"add","field":"v_score","value":1}]}]}。受限能力支持整数v_字段、require(gte/lte/eq)、add、set，最多32步。game.json指令action可写{"type":"custom.work"}，须主人先导入capabilities.json并按内容摘要批准安装，然后重新导入游戏；导入器绑定已安装版本摘要。能力不自动安装，同名不能覆盖，升级使用新编号。超出协议时可生成tool-draft目录的独立源码与测试供审核，但此类源码自动执行器尚未提供，不自行启动、注册或执行。明确报告待安装能力、未完成部分，不假称仅靠数值能力实现复杂游戏。';}
