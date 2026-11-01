import test from 'node:test';
import assert from 'node:assert/strict';
import {TaskHost} from './task-host.mjs';

test('任务入口复用服务连接与模型目录，停止只中断任务会话',async()=>{
 const calls=[];const service={root:'fixture',ready:true,url:'http://127.0.0.1:1234',password:'fixture',stop(){throw Error('不得停止共享服务');},call:async(route,body)=>{calls.push({route,body});if(route==='/api/session')return {data:{id:'task-session'}};if(route==='/api/model')return {data:[{id:'model'}]};return {};}};
 const task=new TaskHost(service,'task-workspace');
 assert.equal(task.url,service.url);assert.equal(task.password,service.password);
 assert.deepEqual(await task.call('/api/model'),await service.call('/api/model'));
 await task.call('/api/session',{agent:'owner-task'});
 await task.stop();assert.equal(service.ready,true);
 assert.ok(calls.some(c=>c.route==='/api/session/task-session/interrupt'));
 assert.ok(!calls.some(c=>c.route.includes('chat-session')));
 assert.equal(service.sharedTaskWorkspace,'task-workspace');
});
