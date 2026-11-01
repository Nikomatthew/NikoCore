import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {importGameTask} from './game-authoring.mjs';
import {GameDeletion} from './game-deletion.mjs';
import {webPackageManifest,inspectWebGamePackage} from './web-game-package.mjs';

export class GameTaskLibrary{
 constructor(engine){this.engine=engine;this.directory=path.join(engine.root,'task-library');fs.mkdirSync(this.directory,{recursive:true});this.file=path.join(this.directory,'index.json');this.entries=fs.existsSync(this.file)?JSON.parse(fs.readFileSync(this.file,'utf8')):{};}
 save(){fs.writeFileSync(this.file+'.tmp',JSON.stringify(this.entries,null,2),{mode:0o600});fs.renameSync(this.file+'.tmp',this.file);}
 sync(tasks,owner,workspace){
  if(!owner)return this.list();
  for(const task of tasks){
   if(task.taskType!=='game-authoring'||task.owner!==owner||!['succeeded','failed','interrupted','cancelled','timed_out'].includes(task.status)||! /^[a-f0-9-]{36}$/.test(task.id))continue;
    const previous=this.entries[task.id];
    if(previous?.status==='deleted')continue;
   try{
    const folder=path.resolve(workspace,task.id),root=fs.realpathSync(workspace);
    if(path.resolve(task.resultDir||'')!==folder||fs.realpathSync(folder)!==folder||path.dirname(folder)!==root)throw Error('游戏任务目录无效');
     const standalone=fs.existsSync(path.join(folder,webPackageManifest)),file=path.join(folder,standalone?webPackageManifest:'game.json'),stat=fs.lstatSync(file);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>(standalone?128000:64000)||fs.realpathSync(file)!==file)throw Error('游戏产物不是有效普通文件');
     const bytes=fs.readFileSync(file),hash=standalone?inspectWebGamePackage(folder,{baseline:task.gameBaseline,requirements:task.gameRequirements}).hash:crypto.createHash('sha256').update(bytes).digest('hex');
    if(previous?.hash===hash&&['ready','published'].includes(previous.status)&&previous.draftID&&fs.existsSync(path.join(this.engine.root,'drafts',previous.draftID+'.json'))&&!new GameDeletion(this.engine).has(previous.gameUpdateID||previous.gameID))continue;
    const archive=path.join(this.directory,task.id);fs.mkdirSync(archive,{recursive:true});const copy=path.join(archive,hash+'.json');if(!fs.existsSync(copy))fs.writeFileSync(copy,bytes,{flag:'wx',mode:0o600});
     let raw;try{raw=JSON.parse(bytes.toString('utf8'));}catch{throw Error('game.json不是有效JSON');}
     if(new GameDeletion(this.engine).has(task.gameUpdateID||raw.id)){this.entries[task.id]={taskID:task.id,owner,hash,name:raw.name||'已删除游戏',gameID:raw.id,type:raw.type||'bot',status:'deleted',reason:'游戏已删除',updatedAt:Date.now(),draftID:null};this.save();continue;}
    const entry={taskID:task.id,owner,hash,name:typeof raw.name==='string'?raw.name.slice(0,80):'未命名游戏',gameID:typeof raw.id==='string'?raw.id.slice(0,80):'',type:raw.type==='web'?'web':'bot',updatedAt:Date.now(),status:'blocked',draftID:null,reason:'',gameUpdateID:task.gameUpdateID||null};
    try{
     if(task.status!=='succeeded')throw Error('制作任务未成功结束，请先修复或继续任务');
     entry.draftID=importGameTask(this.engine,task,owner,workspace);entry.status='ready';
     if(task.gameUpdateID){this.engine.updateDraft(task.gameUpdateID,entry.draftID);const current=this.engine.find(task.gameUpdateID);this.engine.configure(current.id,{enabled:true,players:current.players,blockedPlayers:current.blockedPlayers});entry.status='published';}
     else if(!this.engine.games.has(raw.id)){this.engine.publish(entry.draftID);this.engine.configure(raw.id,{enabled:true,players:[],blockedPlayers:[]});entry.status='published';}
     else throw Error('游戏内部编号已存在，请通过更改指令更新，不覆盖原游戏');
    }catch(error){entry.status='blocked';entry.reason=String(error.message).slice(0,500);}
    this.entries[task.id]=entry;this.save();
   }catch(error){
    if(previous?.status==='ready')continue;
    this.entries[task.id]={taskID:task.id,owner,name:previous?.name||'未完成的游戏任务',gameID:previous?.gameID||'',type:task.gameType||'bot',status:'blocked',draftID:null,reason:String(error.code==='ENOENT'?'尚无game.json产物':error.message).slice(0,500),updatedAt:Date.now()};this.save();
   }
  }
  const finished=this.list(owner),known=new Set(finished.map(e=>e.taskID));
  const active=tasks.filter(t=>t.taskType==='game-authoring'&&t.owner===owner&&!known.has(t.id)&&['pending','starting','running'].includes(t.status)).map(t=>({taskID:t.id,owner,name:String(t.text||'游戏制作任务').slice(0,80),gameID:'',type:t.gameType||t.gameBaseline?.type||'bot',status:t.status==='pending'?'pending':'running',reason:t.progress?.stage||'',updatedAt:t.startedAt||t.createdAt||0,draftID:null}));
  return [...active,...finished].sort((a,b)=>b.updatedAt-a.updatedAt);
 }
 list(owner){return Object.values(this.entries).filter(e=>!owner||e.owner===owner).sort((a,b)=>b.updatedAt-a.updatedAt).map(e=>({...e,status:e.status==='ready'&&this.engine.games.has(e.gameID)&&!e.gameUpdateID?'published':e.status}));}
}
