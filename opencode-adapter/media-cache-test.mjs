import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {MediaCache} from './media-cache.mjs';
test('媒体缓存隔离、原样恢复、过期与定向清理',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'nikolink-media-cache-'));try{const cache=new MediaCache(dir),bytes=Buffer.from('video'),key=cache.key(bytes,'group:123456:user1',{a:1},'tool1');assert.notEqual(key,cache.key(bytes,'group:123456:user2',{a:1},'tool1'));assert.notEqual(key,cache.key(bytes,'group:123456:user1',{a:2},'tool1'));assert.notEqual(key,cache.key(bytes,'group:123456:user1',{a:1},'tool2'));const data={transcript:{text:'台词',segments:[]},evidence:{covered:[0,10]},frames:[Buffer.from('frame')]};await cache.put(key,data,24,1);assert.ok((await cache.get(key,24)).frames[0].equals(data.frames[0]));assert.equal((await cache.status()).files,1);const time=new Date(Date.now()-25*3600000);await fs.utimes(cache.file(key),time,time);assert.equal(await cache.get(key,24),null);await cache.prune(24,1);assert.equal((await cache.status()).files,0);await cache.put(key,data,24,1);await fs.writeFile(path.join(dir,'unrelated.txt'),'keep');assert.equal(await cache.clear(),1);assert.equal(await fs.readFile(path.join(dir,'unrelated.txt'),'utf8'),'keep');assert.throws(()=>cache.file('../escape'));}finally{await fs.rm(dir,{recursive:true,force:true});}
});
