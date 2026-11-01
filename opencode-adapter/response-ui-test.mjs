import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {buildChatPrompt} from './prompt.mjs';
import {defaults} from './core.mjs';
import {CHAT_GUIDELINES,EXPRESSION_GUIDELINES} from './chat-guidelines.mjs';

test('完整与简版均提供同一回复原则，不强制猜测或凑两条消息',()=>{
 const route={text:'这是谁',user:'123456',group:true,direct:true};
 for(const brief of [false,true]){const prompt=buildChatPrompt(route,{...defaults,samples:[]},{brief});assert.ok(prompt.includes(CHAT_GUIDELINES));assert.ok(prompt.includes(EXPRESSION_GUIDELINES));assert.ok(prompt.includes('不为显得自信而编答案'));assert.ok(prompt.includes('一句话不故意拆成多条'));}
 const source=fs.readFileSync(new URL('./group-batch.mjs',import.meta.url),'utf8');assert.ok(!source.includes('有人说话就稍微回两句'));assert.ok(!source.includes('第二句（仍回复'));
});

test('正式总览包含双列输出与任务布局，资源与交互入口齐全',()=>{
 const html=fs.readFileSync(new URL('../public/console-opencode.html',import.meta.url),'utf8');
 assert.ok(html.includes('overview-grid'));assert.ok(html.includes('overviewActivity'));assert.ok(html.includes('/dashboard.css'));assert.ok(html.includes('data-output-filter="problem"'));assert.ok(!html.includes('仅显示模拟记录'));
 const css=fs.readFileSync(new URL('../public/dashboard.css',import.meta.url),'utf8');assert.ok(css.includes('1.7fr'));assert.ok(css.includes('prefers-reduced-motion'));
 const script=fs.readFileSync(new URL('../public/dashboard.js',import.meta.url),'utf8');assert.ok(script.includes('/api/task-console'));assert.ok(script.includes('/api/scheduled-tools'));assert.ok(script.includes('/api/task-tools'));assert.ok(script.includes('remaining'));assert.ok(!script.includes('innerHTML'));
});

test('动效偏好持久化、即时关闭，不读取系统动效偏好',()=>{
 const source=fs.readFileSync(new URL('../public/panel-login.js',import.meta.url),'utf8');
 const bootstrap=source.slice(source.indexOf('  const root='),source.indexOf('  const originalFetch='));
 const values=new Map([['nikolink-motion','off']]),controls=[];
 let listener;
 const root={dataset:{}};
 const reduced={matches:true,addEventListener:(type,fn)=>{listener=fn;}};
  const context=vm.createContext({document:{documentElement:root,querySelectorAll:()=>controls,createElement:()=>({dataset:{},setAttribute(){}})},window:{matchMedia:()=>reduced,addEventListener(){}},localStorage:{getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)}});
 vm.runInContext(bootstrap,context);
 assert.equal(root.dataset.motion,'off');
 const button=vm.runInContext('motionButton()',context);controls.push(button);
 button.onclick();assert.equal(root.dataset.motion,'on');assert.equal(values.get('nikolink-motion'),'on');
 assert.equal(listener,undefined);assert.ok(!source.includes('matchMedia'));
 assert.equal(root.dataset.motion,'on');
 button.onclick();assert.equal(root.dataset.motion,'off');assert.equal(values.get('nikolink-motion'),'off');
});
