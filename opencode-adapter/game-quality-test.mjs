import test from 'node:test';
import assert from 'node:assert/strict';
import {gameQuality,gameQualityInstruction} from './game-quality.mjs';
test('四档标准明确参数优先，默认中，不误识别普通剧情词',()=>{
 assert.equal(gameQuality({}),'medium');assert.equal(gameQuality({text:'高山上的低语'}),'medium');assert.equal(gameQuality({text:'制作标准：超高'}),'ultra');assert.equal(gameQuality({gameQuality:'low',text:'制作标准超高'}),'low');assert.throws(()=>gameQuality({gameQuality:'invalid'}));
 for(const level of ['low','medium','high','ultra']){const prompt=gameQualityInstruction({gameQuality:level});assert.match(prompt,/自行编写/);assert.match(prompt,/复用/);assert.match(prompt,/不能把WASD改成按钮/);assert.match(prompt,/不自动扩大任务预算/);}
});
