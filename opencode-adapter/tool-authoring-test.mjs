import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { taskRequest } from './owner-tasks.mjs';
import { installToolDraft } from './tool-authoring.mjs';

test('创建工具仅接受主人指令，群里仍需@',()=>{
 const c={ownerQQ:'123456',privateQQ:['234567'],groupEnabled:true,groups:['345678']};
 const event={post_type:'message',message_type:'private',user_id:123456,self_id:999999,message:[{type:'text',data:{text:'/创建工具 生成一个文件检查工具'}}]};
 assert.equal(taskRequest(event,c).taskType,'tool-authoring');assert.equal(taskRequest({...event,user_id:234567},c).denied,true);
 assert.equal(taskRequest({...event,message_type:'group',group_id:345678},c).ignored,true);
});

test('草稿安装不执行入口、不覆盖旧工具，默认禁用',()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'nikolink-author-'));
 const resultDir=path.join(home,'task');const draft=path.join(resultDir,'tool-draft','sample');fs.mkdirSync(draft,{recursive:true});
 const marker=path.join(home,'executed');
 fs.writeFileSync(path.join(draft,'tool.json'),JSON.stringify({name:'sample',description:'fixture',entry:'index.mjs',inputSchema:{type:'object'}}));
 fs.writeFileSync(path.join(draft,'index.mjs'),`import fs from 'node:fs';fs.writeFileSync(${JSON.stringify(marker)},'unsafe');export async function run(){return {}}`);
 const task={owner:'123456',taskType:'tool-authoring',status:'succeeded',resultDir};
 const result=installToolDraft(task,home,'123456');assert.equal(result.enabled,false);assert.equal(fs.existsSync(marker),false);assert.throws(()=>installToolDraft(task,home,'123456'));assert.throws(()=>installToolDraft(task,home,'other'));
});
