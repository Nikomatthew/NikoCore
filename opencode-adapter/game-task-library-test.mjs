import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {GameEngine} from './game-engine.mjs';
import {GameTaskLibrary} from './game-task-library.mjs';
test('制作完成自动归入游戏管理，刷新不重复草稿，原产物保留，缺多人不发布',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'niko-task-library-'));try{const engine=new GameEngine(root),workspace=path.join(root,'workspace');fs.mkdirSync(workspace);const task={id:'12345678-1234-1234-1234-123456789abc',taskType:'game-authoring',status:'succeeded',owner:'123456',gameType:'web',text:'生成一个小游戏'};task.resultDir=path.join(workspace,task.id);fs.mkdirSync(task.resultDir);const game={format:1,id:'demo',type:'web',name:'测试游戏',initialCoins:0,commands:[{name:'/状态',description:'查看',cooldownSeconds:1,action:{type:'status'}}]};fs.writeFileSync(path.join(task.resultDir,'game.json'),JSON.stringify(game));const library=new GameTaskLibrary(engine);let items=library.sync([task],'123456',workspace);assert.equal(items[0].status,'published');const draft=items[0].draftID;assert.equal(library.sync([task],'123456',workspace)[0].draftID,draft);assert.ok(fs.existsSync(path.join(task.resultDir,'game.json')));assert.equal(library.list()[0].status,'published');assert.equal(engine.find('demo').enabled,true);assert.equal(new GameTaskLibrary(engine).list()[0].status,'published');
 task.id='22345678-1234-1234-1234-123456789abc';task.text='多人在线排行榜';task.resultDir=path.join(workspace,task.id);fs.mkdirSync(task.resultDir);fs.writeFileSync(path.join(task.resultDir,'game.json'),JSON.stringify(game));items=library.sync([task],'123456',workspace);assert.equal(items.find(i=>i.taskID===task.id).status,'blocked');assert.match(items.find(i=>i.taskID===task.id).reason,/必需功能/);assert.equal(library.list('999999').length,0);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
