import fs from 'node:fs';
import assert from 'node:assert/strict';
const prerequisites=fs.readFileSync(new URL('./release-prerequisites.cjs',import.meta.url),'utf8');
assert.ok(!prerequisites.includes('launchSnowLuma(snow)'),'发行前置检查不得另外启动可见launcher，交由ManagedSnowLuma统一启动');
const server=fs.readFileSync(new URL('../opencode-adapter/server.mjs',import.meta.url),'utf8');
assert.ok(server.includes('managedSnow.start(findSnowLuma('),'自动检测与手选路径都应交给隐藏托管启动');
console.log('SnowLuma只有一个隐藏托管启动入口检查通过。');
