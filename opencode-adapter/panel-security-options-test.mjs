import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {PanelAuth} from './panel-auth.mjs';
import {gameExecutionOptions,gameExecutionInstruction} from './game-execution-options.mjs';
test('一次性文件凭证成功使用删除，不能重放，不影响密码',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'nikolink-security-'));try{const auth=new PanelAuth(path.join(root,'state'));await auth.login('first-pass','first-pass',true);auth.issueTemporary(root);const file=path.join(root,'登录凭证.txt'),value=fs.readFileSync(file,'utf8');assert.throws(()=>auth.loginTemporary('wrong'));const token=auth.loginTemporary(value);assert.equal(auth.authorized('Bearer '+token),true);assert.equal(fs.existsSync(file),false);assert.throws(()=>auth.loginTemporary(value));await auth.changePassword('first-pass','second-pass','second-pass');assert.equal(auth.authorized('Bearer '+token),false);await assert.rejects(()=>auth.login('first-pass'));assert.ok(await auth.login('second-pass'));}finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('游戏执行选项默认和非法值校验，不测试模式明确保留宿主校验',()=>{assert.deepEqual(gameExecutionOptions(),{gameVerification:'basic',gameScope:'expand',gameBudget:'balanced'});assert.throws(()=>gameExecutionOptions({gameBudget:'invalid'}));assert.match(gameExecutionInstruction({gameVerification:'none'}),/不运行测试/);assert.match(gameExecutionInstruction(),/宿主路径/);});
