import crypto from 'node:crypto';
export class AuthoritativeWorld{
 constructor({game,room,store,bounds=40,speed=5,enemyHP=30,attackDamage=10,reward=5}={}){
  if(![game,room].every(x=>typeof x==='string'&&/^[-a-z0-9]{1,64}$/.test(x))||![bounds,speed,enemyHP,attackDamage,reward].every(Number.isFinite)||bounds<1||bounds>1000||speed<=0||speed>50||!Number.isSafeInteger(enemyHP)||enemyHP<1||!Number.isSafeInteger(attackDamage)||attackDamage<1||!Number.isSafeInteger(reward)||reward<0||reward>1000000)throw Error('权威世界配置无效');
  Object.assign(this,{game,room,store,bounds,speed,enemyHP,attackDamage,reward});this.players=new Map();this.enemies=new Map();this.tick=0;this.epoch=crypto.randomUUID();
 }
 join(player){if(typeof player!=='string'||!player.length||player.length>100)throw Error('玩家标识无效');if(!this.players.has(player)){if(this.players.size>=100)throw Error('世界人数超限');this.players.set(player,{id:player,x:0,z:0,hp:100,sequence:-1,input:{x:0,z:0,attack:false},cooldown:0});}}
 leave(player){this.players.delete(player);}
 spawnEnemy(id,x,z){if(!/^[-a-z0-9]{1,40}$/.test(id)||this.enemies.has(id)||this.enemies.size>=128||![x,z].every(n=>Number.isFinite(n)&&Math.abs(n)<=this.bounds))throw Error('敌人参数无效');this.enemies.set(id,{id,x,z,hp:this.enemyHP,cooldown:0,rewarded:false});}
  input(player,input){const p=this.players.get(player);if(!p)throw Error('不是世界成员');if(!input||!Number.isSafeInteger(input.sequence)||input.sequence<0||input.sequence>Number.MAX_SAFE_INTEGER-1||![input.x,input.z].every(n=>Number.isFinite(n)&&Math.abs(n)<=1)||typeof input.attack!=='boolean'||Object.keys(input).some(k=>!['sequence','x','z','attack'].includes(k)))throw Error('世界输入无效');if(input.sequence<=p.sequence)return false;p.sequence=input.sequence;p.inputTick=this.tick;p.input={x:input.x,z:input.z,attack:input.attack};return true;}
 step(dt){
  if(dt!==.05)throw Error('世界只接受固定50ms步进');this.tick++;
  for(const p of this.players.values()){
   if(p.hp<=0)continue;if(this.tick-(p.inputTick??0)>40)p.input={x:0,z:0,attack:false};const length=Math.max(1,Math.hypot(p.input.x,p.input.z));p.x=Math.max(-this.bounds,Math.min(this.bounds,p.x+p.input.x/length*this.speed*dt));p.z=Math.max(-this.bounds,Math.min(this.bounds,p.z+p.input.z/length*this.speed*dt));p.cooldown=Math.max(0,p.cooldown-dt);
   if(p.input.attack&&p.cooldown===0){p.cooldown=.5;const enemy=[...this.enemies.values()].filter(e=>e.hp>0&&Math.hypot(e.x-p.x,e.z-p.z)<=2).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];if(enemy){const hp=Math.max(0,enemy.hp-this.attackDamage);if(hp===0&&!enemy.rewarded){this.store.reward(this.game,this.epoch+':'+enemy.id,p.id,this.reward);enemy.rewarded=true;}enemy.hp=hp;}}
  }
  for(const e of this.enemies.values()){
   if(e.hp<=0)continue;const target=[...this.players.values()].filter(p=>p.hp>0).sort((a,b)=>Math.hypot(a.x-e.x,a.z-e.z)-Math.hypot(b.x-e.x,b.z-e.z))[0];if(!target)continue;const dx=target.x-e.x,dz=target.z-e.z,d=Math.hypot(dx,dz);e.cooldown=Math.max(0,e.cooldown-dt);if(d>1.2){e.x+=dx/d*Math.min(d,dt*2);e.z+=dz/d*Math.min(d,dt*2);}else if(e.cooldown===0){target.hp=Math.max(0,target.hp-5);e.cooldown=1;}
  }
 }
 snapshot(){return {tick:this.tick,players:[...this.players.values()].map(({input,cooldown,...p})=>({...p})),enemies:[...this.enemies.values()].map(({cooldown,rewarded,...e})=>({...e}))};}
}
