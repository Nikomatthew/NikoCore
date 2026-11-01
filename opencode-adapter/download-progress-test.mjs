import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {EventEmitter} from 'node:events';
import {DownloadProgress} from './download-progress.mjs';
test('关闭进度窗取消未完成下载，完成后关闭不取消',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'niko-download-cancel-'));try{const children=[];let cancelled=0;const launch=()=>{const child=new EventEmitter();child.unref=()=>{};children.push(child);return child;};const a=new DownloadProgress(dir,{platform:'win32',launch,onCancel:()=>cancelled++});a.update({stage:'metadata',message:'start'});children[0].emit('exit',0);assert.equal(cancelled,1);const b=new DownloadProgress(dir,{platform:'win32',launch,onCancel:()=>cancelled++});b.update({stage:'metadata',message:'start'});b.update({stage:'complete',message:'done'});children[1].emit('exit',0);assert.equal(cancelled,1);}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('下载进度窗口只启动一次，进度文件记录阶段和最终状态',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'niko-download-view-'));try{let calls=0;const viewer=new DownloadProgress(dir,{platform:'win32',launch:(exe,args,options)=>{calls++;assert.equal(options.windowsHide,true);assert.ok(options.env.NIKOLINK_PROGRESS_FILE);assert.ok(options.env.NIKOLINK_PROGRESS_SCRIPT);const child=new EventEmitter();child.unref=()=>{};return child;}});viewer.update({stage:'metadata',message:'metadata',received:0,total:0});viewer.update({stage:'downloading',message:'downloading',received:1024,total:2048});viewer.update({stage:'verifying',message:'verifying',received:2048,total:2048});viewer.update({stage:'complete',message:'ready',received:2048,total:2048});assert.equal(calls,1);assert.equal(JSON.parse(fs.readFileSync(viewer.file)).stage,'complete');}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
