import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {CloudflaredRuntime,detectCloudflared} from './cloudflared-runtime.mjs';
test('取消进行中的Cloudflare请求，不写入未完成exe',async()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'niko-cloud-abort-'));try{let signal;const runtime=new CloudflaredRuntime(home,{request:async(url,options)=>{signal=options.signal;return new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(options.signal.reason),{once:true}));}});const pending=runtime.download();runtime.cancel();await assert.rejects(()=>pending,/取消/);assert.equal(signal.aborted,true);assert.equal(runtime.progress.stage,'cancelled');assert.equal(detectCloudflared(home),null);}finally{fs.rmSync(home,{recursive:true,force:true});}
});
test('Cloudflare下载官方来源和大小摘要校验，不自动执行，不重复覆盖',async()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'niko-cloud-runtime-'));try{const bytes=Buffer.alloc(2048);bytes.write('MZ');const digest=crypto.createHash('sha256').update(bytes).digest('hex');let requests=0;const runtime=new CloudflaredRuntime(home,{arch:'x64',request:async url=>{requests++;if(String(url).includes('api.github.com'))return {ok:true,json:async()=>({tag_name:'test',assets:[{name:'cloudflared-windows-amd64.exe',size:bytes.length,digest:'sha256:'+digest,browser_download_url:'https://github.com/cloudflare/cloudflared/releases/download/test/cloudflared-windows-amd64.exe'}]})};return {ok:true,body:(async function*(){yield bytes;})()};}});assert.equal(detectCloudflared(home),null);const result=await runtime.download();assert.equal(result.sha256,digest);assert.equal(detectCloudflared(home),result.path);assert.equal((await runtime.download()).existing,true);assert.equal(requests,2);}finally{fs.rmSync(home,{recursive:true,force:true});}
});
test('Cloudflare摘要不符拒绝写入执行文件',async()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'niko-cloud-bad-'));try{const bytes=Buffer.alloc(2048);bytes.write('MZ');const runtime=new CloudflaredRuntime(home,{request:async url=>String(url).includes('api.github.com')?{ok:true,json:async()=>({assets:[{name:'cloudflared-windows-amd64.exe',size:2048,digest:'sha256:'+'0'.repeat(64),browser_download_url:'https://github.com/cloudflare/cloudflared/releases/download/test/cloudflared-windows-amd64.exe'}]})}:{ok:true,body:(async function*(){yield bytes;})()},arch:'x64'});await assert.rejects(()=>runtime.download(),/完整性/);assert.equal(detectCloudflared(home),null);}finally{fs.rmSync(home,{recursive:true,force:true});}
});
