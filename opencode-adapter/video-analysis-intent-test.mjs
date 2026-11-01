import test from 'node:test';
import assert from 'node:assert/strict';
import {resultKind} from './owner-tasks.mjs';
test('分析视频发结果不等于投递原视频',()=>{
 assert.equal(resultKind('分析这个视频 https://www.bilibili.com/video/BVdemo 把分析结果发到群里'),'text');
 assert.equal(resultKind('先下载视频用于分析，然后把总结发群里'),'text');
 assert.equal(resultKind('分析这个视频，生成PDF报告发群里'),'file');
 assert.equal(resultKind('下载这个视频并发到群里'),'video');
});
