import test from 'node:test';
import assert from 'node:assert/strict';
import {ImageFollowup} from './image-followup.mjs';
test('图片追问重新附图，仅同人同会话、两分钟内、配置不变',()=>{
 let now=0;const cache=new ImageFollowup(()=>now);const c={mode:'reply',visionEnabled:true,revision:1};
 const image={key:'group:123456',user:'234567',text:'图片',images:['https://gchat.qpic.cn/sample'],messageID:'img'};
 cache.apply(image,c);const question={...image,images:[],text:'这是谁',messageID:'question'};
 assert.equal(cache.apply(question,c).images.length,1);
 assert.equal(cache.apply({...question,user:'345678'},c).images.length,0);
 assert.equal(cache.apply({...question,key:'private:234567'},c).images.length,0);
 assert.equal(cache.apply({...question,replyID:'other'},c).images.length,0);
 now=120001;assert.equal(cache.apply(question,c).images.length,0);
 cache.apply(image,c);assert.equal(cache.apply(question,{...c,revision:2}).images.length,0);
});
