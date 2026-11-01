import test from 'node:test';
import assert from 'node:assert/strict';
import {githubDownloadURL} from './github-download.mjs';
import {CloudflaredRuntime} from './cloudflared-runtime.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
test('GitHub下载统一代理且不影响其他来源、不重复加前缀',()=>{
 for(const source of ['https://github.com/a/b/releases/download/v1/file.exe','https://api.github.com/repos/a/b/releases/latest','https://raw.githubusercontent.com/a/b/main/file'])assert.equal(githubDownloadURL(source),'https://gh-proxy.com/'+source);
 assert.equal(githubDownloadURL('https://nodejs.org/file.zip'),'https://nodejs.org/file.zip');assert.equal(githubDownloadURL('https://gh-proxy.com/https://github.com/a/b'),'https://gh-proxy.com/https://github.com/a/b');assert.throws(()=>githubDownloadURL('https://user:secret@github.com/file'));
});
test('Cloudflared元数据和执行文件实际请求均走指定代理，仍校验内容',async()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'niko-gh-download-'));try{const bytes=Buffer.alloc(2048);bytes.write('MZ');const hash=crypto.createHash('sha256').update(bytes).digest('hex'),urls=[];const runtime=new CloudflaredRuntime(home,{arch:'x64',request:async url=>{urls.push(String(url));assert.ok(String(url).startsWith('https://gh-proxy.com/https://'));if(String(url).includes('api.github.com'))return {ok:true,json:async()=>({tag_name:'test',assets:[{name:'cloudflared-windows-amd64.exe',size:bytes.length,digest:'sha256:'+hash,browser_download_url:'https://github.com/cloudflare/cloudflared/releases/download/test/cloudflared-windows-amd64.exe'}]})};return {ok:true,body:(async function*(){yield bytes;})()};}});assert.equal((await runtime.download()).sha256,hash);assert.equal(urls.length,2);}finally{fs.rmSync(home,{recursive:true,force:true});}
});
