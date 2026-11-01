import fs from 'node:fs';
import assert from 'node:assert/strict';
const html=fs.readFileSync(new URL('../public/console-opencode.html',import.meta.url),'utf8');
const pages=new Set([...html.matchAll(/data-view="([^"]+)"/g)].map(m=>m[1]));
for(const match of html.matchAll(/data-page="([^"]+)"/g))assert.ok(pages.has(match[1]),`页面缺少导航：${match[1]}`);
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size,'控件ID不可重复');
const expected={mediaQQ:'media',visionEnabled:'media',peakSearch:'websearch',nativeWeb:'websearch',model:'search',taskModel:'search',sessionMaxTurns:'sessions',promptRefreshTurns:'sessions',groupMentionOnly:'chat',ownerQQ:'access',taskReplyAI:'tasks'};
const assigned={};let page;
for(const match of html.matchAll(/<section\b[^>]*>|<input\b[^>]*>|<textarea\b[^>]*>|<select\b[^>]*>/g)){
 const tag=match[0];if(tag.startsWith('<section'))page=tag.match(/data-page="([^"]+)"/)?.[1];
 const name=tag.match(/\bname="([^"]+)"/)?.[1];if(name&&name in expected){assert.equal(assigned[name],undefined,`配置重复：${name}`);assigned[name]=page;}
}
assert.deepEqual(assigned,expected);
assert.match(html,/<section data-page="access"><h2>SnowLuma 路径/);
assert.match(html,/<section data-page="search"><h2>OpenCode 路径/);
console.log('设置归类检查通过：导航、控件唯一性与配置归属。');
