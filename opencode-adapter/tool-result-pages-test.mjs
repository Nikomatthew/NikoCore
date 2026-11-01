import test from 'node:test';
import assert from 'node:assert/strict';
import {ToolResultPages} from './tool-result-pages.mjs';
test('工具大结果先预览，可分页完整恢复且引用不可跨服务',()=>{
 const pages=new ToolResultPages(),value={error:'保留错误',items:'内容'.repeat(5000)},raw=JSON.stringify(value);
 const summary=JSON.parse(pages.present(value).content[0].text);assert.equal(summary.complete,false);let text='',offset=0;
 do{const page=JSON.parse(pages.page({reference:summary.reference,offset}).content[0].text);text+=page.text;offset=page.nextOffset;}while(offset!==null);
 assert.equal(text,raw);assert.throws(()=>new ToolResultPages().page({reference:summary.reference}));assert.throws(()=>pages.page({reference:summary.reference,offset:-1}));
});
