import test from 'node:test';
import assert from 'node:assert/strict';
import {optimizedTaskInstruction} from './task-optimization.mjs';
import {validate,defaults} from './core.mjs';
test('优化任务模式默认关闭且只能通过布尔全局配置启用',()=>{
 assert.equal(optimizedTaskInstruction({}),'');assert.equal(optimizedTaskInstruction({optimizedTasks:false}),'');
 assert.match(optimizedTaskInstruction({optimizedTasks:true}),/不省略权限审批/);
 const c={...defaults,model:'fixture/model',revision:0};assert.equal(validate({optimizedTasks:true},c).optimizedTasks,true);assert.throws(()=>validate({optimizedTasks:'true'},c));
});
