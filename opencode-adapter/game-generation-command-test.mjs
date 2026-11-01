import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {GameEngine} from './game-engine.mjs';
import {GameRouter} from './game-router.mjs';
test('Bot和网页生成指令明确分流，普通玩家不可生成',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'niko-generation-command-'));
 try{const calls=[],value={gamesEnabled:true,mode:'reply',ownerQQ:'123456',privateQQ:['234567'],groups:[],seen:[]};const router=new GameRouter(new GameEngine(root),{value,save(){}},async()=>{},{generate:async(text,request)=>calls.push({text,...request})});
 const event=(id,text,user=123456)=>({post_type:'message',message_type:'private',self_id:999999,user_id:user,message_id:id,message:[{type:'text',data:{text}}]});
 await router.receive(event(1,'/游戏生成 五子棋'));await router.receive(event(2,'/网页游戏生成 五子棋'));await router.receive(event(3,'/网页游戏生成 五子棋',234567));
 assert.equal(calls.length,2);assert.equal(calls[0].gameType,'bot');assert.equal(calls[1].gameType,'web');assert.equal(calls[1].text,'五子棋');
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
