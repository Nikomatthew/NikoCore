import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {webAuthoringPrompt} from './web-authoring-prompt.mjs';
test('网页制作提示使用简化入口，没有旧HTTP限制与强制模板',()=>{
 const text=webAuthoringPrompt();assert.match(text,/可自制或复用/);assert.match(text,/WebSocket/);assert.match(text,/quickjs-v1/);assert.ok(!text.includes('每分钟120次'));assert.ok(!text.includes('不生成执行脚本'));
 const owner=fs.readFileSync(new URL('./owner-tasks.mjs',import.meta.url),'utf8');assert.match(owner,/legacy\?.*game\.json/);assert.match(owner,/:webAuthoringPrompt\(\)/);
 const css=fs.readFileSync(new URL('../public/dashboard.css',import.meta.url),'utf8');assert.match(css,/#gameGenerateSection fieldset\{[^}]*border-radius:12px[^}]*background:var\(--header\)/);
});
