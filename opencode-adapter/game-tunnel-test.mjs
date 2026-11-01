import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {EventEmitter} from 'node:events';
import {GameTunnel} from './game-tunnel.mjs';
test('游戏隧道限定本机地址、提取官方临时域名、只停止自有子进程',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'nikolink-tunnel-'));try{fs.mkdirSync(path.join(root,'runtime','cloudflared'),{recursive:true});fs.writeFileSync(path.join(root,'runtime','cloudflared','cloudflared.exe'),'fixture');let killed=false;const child=new EventEmitter();child.stdout=new EventEmitter();child.stderr=new EventEmitter();child.kill=()=>{killed=true;};const tunnel=new GameTunnel(root,{launch:(exe,args,options)=>{assert.equal(options.windowsHide,true);assert.equal(options.env.TUNNEL_TOKEN,undefined);assert.deepEqual(args,['tunnel','--protocol','http2','--no-autoupdate','--url','http://127.0.0.1:54321']);return child;}});assert.throws(()=>tunnel.start('https://example.com'));tunnel.start('http://127.0.0.1:54321');child.stderr.emit('data',Buffer.from('https://test-game.trycloud'));child.stderr.emit('data',Buffer.from('flare.com ready'));assert.equal(tunnel.url,'https://test-game.trycloudflare.com');assert.throws(()=>tunnel.start('http://127.0.0.1:54321'));tunnel.stop();assert.equal(killed,true);assert.equal(tunnel.url,null);}finally{fs.rmSync(root,{recursive:true,force:true});}
});
