import test from 'node:test';
import assert from 'node:assert/strict';
import {plainDecision,plainTargets} from './plain-reply.mjs';
import {chatParts,sendBurst} from './message-burst.mjs';
test('用户报告的工具标签与参数不得分成QQ消息发送',async()=>{
 const raw='<tool_call>\n\n{"name": "websearch", "arguments": {"query": "Item Asylum Halloween update 2026"}}\n\n</tool_call>';
 assert.throws(()=>plainDecision(raw),/工具协议/);assert.throws(()=>plainTargets('[u0m0] '+raw,[{ref:'u0m0',index:0}],1),/工具协议/);
 for(const part of ['<tool_call>','</tool_call>','{"name":"websearch","arguments":{"query":"test"}}'])assert.throws(()=>chatParts(part),/工具协议/);
 let sent=0;await assert.rejects(()=>sendBurst(['正常文字','<tool_call>'],{allowed:()=>true,send:async()=>sent++,onSent:async()=>{}}),/工具协议/);assert.equal(sent,0);
 assert.deepEqual(chatParts('我查到了一条更新公告。'),['我查到了一条更新公告。']);
 assert.throws(()=>plainDecision(JSON.stringify({action:'send',messages:['<tool_call>','参数']})),/工具协议/);
});
