import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
export class GameDeletion{
 constructor(engine){this.engine=engine;this.directory=path.join(engine.root,'deleted');fs.mkdirSync(this.directory,{recursive:true});}
 marker(id){if(!/^[-a-z0-9]{1,40}$/.test(id))throw Error('游戏内部编号无效');return path.join(this.directory,id+'.json');}
 has(id){return /^[-a-z0-9]{1,40}$/.test(id)&&fs.existsSync(this.marker(id));}
 archive(id){const game=this.engine.find(id),file=path.join(this.engine.root,'published',game.id+'.json'),stat=fs.lstatSync(file);if(!stat.isFile()||stat.isSymbolicLink())throw Error('游戏规则文件无效');const dir=path.join(this.directory,game.id+'-'+Date.now()+'-'+crypto.randomUUID());fs.mkdirSync(dir);fs.copyFileSync(file,path.join(dir,'game.json'));
  const marker=this.marker(game.id);fs.writeFileSync(marker,JSON.stringify({id:game.id,number:game.number,name:game.name,deletedAt:Date.now(),archive:path.basename(dir)}),{flag:'wx',mode:0o600});
  try{fs.unlinkSync(file);}catch(error){fs.unlinkSync(marker);throw error;}this.engine.games.delete(game.id);for(const profile of Object.values(this.engine.players))if(profile.active===game.id)profile.active=null;this.engine.save();return {id:game.id,number:game.number,archived:true,savesRetained:true};
 }
}
