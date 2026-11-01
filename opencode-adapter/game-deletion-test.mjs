import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {GameEngine} from './game-engine.mjs';
import {GameDeletion} from './game-deletion.mjs';
import {GameTaskLibrary} from './game-task-library.mjs';
test('删除归档规则保留存档和编号，自动任务导入不会复活已删游戏',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'niko-game-delete-'));try{const engine=new GameEngine(root),workspace=path.join(root,'workspace'),id='12345678-1234-1234-1234-123456789abc',folder=path.join(workspace,id);fs.mkdirSync(folder,{recursive:true});const game={format:1,id:'demo',name:'游戏',type:'web',initialCoins:0,commands:[{name:'/状态',description:'状态',cooldownSeconds:1,action:{type:'status'}}]};fs.writeFileSync(path.join(folder,'game.json'),JSON.stringify(game));const task={id,taskType:'game-authoring',owner:'123456',status:'succeeded',gameType:'web',text:'游戏',resultDir:folder},library=new GameTaskLibrary(engine);library.sync([task],'123456',workspace);const number=engine.find('demo').number;engine.players.example={active:'demo',saves:{demo:{coins:25}}};engine.save();const deletion=new GameDeletion(engine);assert.equal(deletion.archive(number).savesRetained,true);assert.equal(engine.games.has('demo'),false);assert.equal(engine.players.example.active,null);assert.equal(engine.players.example.saves.demo.coins,25);assert.ok(deletion.has('demo'));engine.load();assert.equal(engine.games.has('demo'),false);library.sync([task],'123456',workspace);assert.equal(engine.games.has('demo'),false);assert.equal(library.list()[0].status,'deleted');assert.equal(engine.numbers.get('demo'),number);assert.ok(fs.existsSync(path.join(folder,'game.json')));}finally{fs.rmSync(root,{recursive:true,force:true});}
});
