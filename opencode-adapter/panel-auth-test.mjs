import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PanelAuth } from './panel-auth.mjs';

test('密码首次设置、加盐保存、持久化验证与令牌注销',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nikolink-auth-'));let now=1000;const auth=new PanelAuth(dir,()=>now);
 assert.equal(auth.configured(),false);await assert.rejects(auth.login('1234','1234',true));await assert.rejects(auth.login('abcde','other',true));
 const token=await auth.login('abcde','abcde',true);assert.ok(auth.authorized('Bearer '+token));assert.ok(!fs.readFileSync(auth.file,'utf8').includes('abcde'));
 const restarted=new PanelAuth(dir);assert.equal(restarted.authorized('Bearer '+token),false);const fresh=await restarted.login('abcde');assert.ok(restarted.authorized('Bearer '+fresh));restarted.logout(fresh);assert.equal(restarted.authorized('Bearer '+fresh),false);
 now+=9*3600000;assert.equal(auth.authorized('Bearer '+token),false);await assert.rejects(restarted.login('abcde','abcde',true));
});

test('错误密码限速，不允许并发抢先覆盖首次密码',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nikolink-auth-rate-'));const auth=new PanelAuth(dir);await auth.login('12345','12345',true);
 for(let i=0;i<5;i++)await assert.rejects(auth.login('wrong'));
 await assert.rejects(auth.login('12345'),/次数/);
});
