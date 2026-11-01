import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {loginWindowOptions,openOfficialLogin} from './official-login.mjs';
import {validate,defaults} from './core.mjs';
import {importProviders} from './provider-config.mjs';
import {autoAccounts} from './auto-accounts.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Host} from './host.mjs';
test('聊天自动启动和目录刷新并发时复用一次启动，已就绪不重复启动',async()=>{
 const host=new Host('fixture',{value:{}});let launches=0,release;
 host.launch=async()=>{launches++;await new Promise(resolve=>{release=resolve;});host.ready=true;};
 const first=host.start(),second=host.start();assert.equal(first,second);assert.equal(launches,1);
 release();await Promise.all([first,second]);await host.start();assert.equal(launches,1);
});
test('账号数据库只读获取Key，跳过OAuth，结果不返回凭据',async()=>{
 const {DatabaseSync}=await import('node:sqlite');
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'nikolink-accounts-'));
 const dir=path.join(home,'.local','share','opencode');fs.mkdirSync(dir,{recursive:true});
 const file=path.join(dir,'opencode.db'),db=new DatabaseSync(file);
 db.exec('CREATE TABLE credential(integration_id TEXT,value TEXT,active INTEGER,time_updated INTEGER)');
 db.prepare('INSERT INTO credential VALUES(?,?,?,?)').run('fixture',JSON.stringify({type:'key',key:'secret-fixture'}),1,1);
 db.prepare('INSERT INTO credential VALUES(?,?,?,?)').run('oauth',JSON.stringify({type:'oauth',token:'no-copy'}),1,1);db.close();
 const saved={};for(const key of ['XDG_CONFIG_HOME','XDG_DATA_HOME','OPENCODE_DB']){saved[key]=process.env[key];delete process.env[key];}
 try{let called=0;const result=await autoAccounts({ready:true,call:async(route,body)=>{called++;assert.equal(body.key,'secret-fixture');}},home,()=>{});assert.equal(called,1);assert.ok(!JSON.stringify(result).includes('secret-fixture'));assert.equal(result.results[0].connected,true);}finally{for(const [key,value] of Object.entries(saved))value===undefined?delete process.env[key]:process.env[key]=value;}
});
const host={ready:true,cliExecutable:'D:\\Tools with spaces\\opencode-cli.exe',workspace:'D:\\NikoLink data\\workspace',url:'http://127.0.0.1:12345',password:'fixture-only',launchEnvironment:{XDG_DATA_HOME:'isolated-data'}};
test('JSONC导入仅提取渠道，兼容旧版字段，不导入插件和权限',()=>{
 const config=importProviders('{/*fixture*/"provider":{"yu":{"npm":"@ai-sdk/openai-compatible","options":{"baseURL":"https://example.com/v1"},"models":{"demo":{"name":"Demo"}}}},"plugins":["unsafe"],"permissions":[],}');
 assert.deepEqual(Object.keys(config),['providers']);
 assert.equal(config.providers.yu.package,'@opencode/ai/providers/openai-compatible');
 assert.equal(config.providers.yu.settings.baseURL,'https://example.com/v1');
 assert.ok(config.providers.yu.models.demo);
 assert.throws(()=>importProviders('{"providers":{"x":{"package":"file:///unsafe"}}}'));
 assert.throws(()=>importProviders('{broken'));
});
test('官方终端使用显式隔离服务，凭据不进入命令行，等待派发结果',async()=>{
 const spec=loginWindowOptions(host);
 const script=Buffer.from(spec.options.env.NIKOLINK_AUTH_SCRIPT,'base64').toString('utf16le');
 assert.ok(script.includes('--server $env:NIKOLINK_AUTH_SERVER'));
 assert.equal(spec.options.env.NIKOLINK_AUTH_SERVER,host.url);
 assert.equal(spec.options.env.XDG_DATA_HOME,'isolated-data');
 assert.ok(!JSON.stringify(spec.args).includes(host.password));
 let child;
 const promise=openOfficialLogin(host,'login',()=>{child=new EventEmitter();child.kill=()=>{};queueMicrotask(()=>child.emit('exit',0));return child;});
 assert.equal((await promise).opened,true);
 await assert.rejects(openOfficialLogin(host,'list',()=>{const process=new EventEmitter();process.kill=()=>{};queueMicrotask(()=>process.emit('exit',1));return process;}),/无法打开/);
 assert.throws(()=>loginWindowOptions({...host,url:'https://example.com:443'}));
 assert.throws(()=>loginWindowOptions(host,'logout'));
});
test('会话默认100，接受15至500整数',()=>{
 assert.equal(validate({},defaults).sessionMaxTurns,100);
 for(const n of [15,100,500])assert.equal(validate({sessionMaxTurns:n},defaults).sessionMaxTurns,n);
 for(const n of [14,501,20.5])assert.throws(()=>validate({sessionMaxTurns:n},defaults));
});
