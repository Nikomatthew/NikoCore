import test from 'node:test';
import assert from 'node:assert/strict';
import {videoDetailPlan,extractVideoDetail} from './video-detail.mjs';
test('局部细看默认关闭，时间点受覆盖范围限制，参数不经shell执行',async()=>{
 assert.equal(videoDetailPlan({duration:100},{}),null);
 assert.throws(()=>videoDetailPlan({duration:100},{videoDetailEnabled:true,videoDetailAt:100}));
  assert.doesNotThrow(()=>videoDetailPlan({duration:900},{videoDetailEnabled:true,videoDetailAt:301}));assert.throws(()=>videoDetailPlan({duration:900},{videoAnalyzeSeconds:300,videoDetailEnabled:true,videoDetailAt:301}));
 let args;const result=await extractVideoDetail('fixture','input.mp4','output',{duration:100},{videoDetailEnabled:true,videoDetailAt:30,videoDetailWidth:1280},undefined,async(exe,argv)=>{args=argv;});assert.equal(result.seconds,30);assert.ok(args.includes('30'));assert.ok(args.includes('input.mp4'));assert.ok(args.includes('scale=w=min(iw\\,1280):h=-2'));
});
