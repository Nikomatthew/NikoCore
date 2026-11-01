import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
export class GameAuthorityStore{
 constructor(directory){fs.mkdirSync(directory,{recursive:true});this.db=new DatabaseSync(path.join(directory,'authority.sqlite'));this.db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; CREATE TABLE IF NOT EXISTS balances(game TEXT NOT NULL, player TEXT NOT NULL, coins INTEGER NOT NULL CHECK(coins>=0 AND coins<=1000000000), PRIMARY KEY(game,player)); CREATE TABLE IF NOT EXISTS rewards(game TEXT NOT NULL,event TEXT NOT NULL,player TEXT NOT NULL,amount INTEGER NOT NULL,PRIMARY KEY(game,event));');}
 balance(game,player){return this.db.prepare('SELECT coins FROM balances WHERE game=? AND player=?').get(game,player)?.coins||0;}
 inventory(game,player){this.db.exec('CREATE TABLE IF NOT EXISTS inventory(game TEXT,player TEXT,item TEXT,quantity INTEGER NOT NULL CHECK(quantity>=0 AND quantity<=1000000),PRIMARY KEY(game,player,item));');return this.db.prepare('SELECT item,quantity FROM inventory WHERE game=? AND player=? AND quantity>0').all(game,player);}
 grantItem(game,event,player,item,quantity){
  if(!/^[-a-z0-9]{1,40}$/.test(item)||!Number.isSafeInteger(quantity)||quantity<1||quantity>1000)throw Error('物品参数无效');this.inventory(game,player);
  this.db.exec('CREATE TABLE IF NOT EXISTS item_events(game TEXT,event TEXT,player TEXT,item TEXT,quantity INTEGER,PRIMARY KEY(game,event)); BEGIN IMMEDIATE');
  try{const old=this.db.prepare('SELECT player,item,quantity FROM item_events WHERE game=? AND event=?').get(game,event);if(old){if(old.player!==player||old.item!==item||old.quantity!==quantity)throw Error('物品事件冲突');this.db.exec('COMMIT');return;}
   this.db.prepare('INSERT INTO inventory VALUES(?,?,?,?) ON CONFLICT(game,player,item) DO UPDATE SET quantity=quantity+excluded.quantity').run(game,player,item,quantity);this.db.prepare('INSERT INTO item_events VALUES(?,?,?,?,?)').run(game,event,player,item,quantity);this.db.exec('COMMIT');
  }catch(error){this.db.exec('ROLLBACK');throw error;}
 }
 reward(game,event,player,amount){
  if(![game,event,player].every(s=>typeof s==='string'&&s.length>0&&s.length<=100)||!Number.isSafeInteger(amount)||amount<0||amount>1000000)throw Error('权威奖励参数无效');
  this.db.exec('BEGIN IMMEDIATE');
  try{
   const old=this.db.prepare('SELECT player,amount FROM rewards WHERE game=? AND event=?').get(game,event);
   if(old){if(old.player!==player||old.amount!==amount)throw Error('奖励事件内容冲突');this.db.exec('COMMIT');return {coins:this.balance(game,player),duplicate:true};}
   this.db.prepare('INSERT INTO balances(game,player,coins) VALUES(?,?,?) ON CONFLICT(game,player) DO UPDATE SET coins=coins+excluded.coins').run(game,player,amount);
   this.db.prepare('INSERT INTO rewards(game,event,player,amount) VALUES(?,?,?,?)').run(game,event,player,amount);
   const coins=this.balance(game,player);this.db.exec('COMMIT');return {coins,duplicate:false};
  }catch(error){this.db.exec('ROLLBACK');throw error;}
 }
 close(){this.db.close();}
}
