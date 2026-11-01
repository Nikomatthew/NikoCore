import test from 'node:test';
import assert from 'node:assert/strict';
import {selectMemoryRecords} from './memory-selection.mjs';
test('相关记忆仅筛选注入副本，不改完整记忆，不包含遗忘记录',()=>{
 const records=[{text:'喜欢咖啡',clarity:'clear'},{text:'玩游戏',clarity:'clear'},{text:'咖啡',clarity:'forgotten'}];const before=JSON.stringify(records);
 assert.deepEqual(selectMemoryRecords(records,'咖啡'),[records[0]]);assert.equal(JSON.stringify(records),before);assert.deepEqual(selectMemoryRecords(records,'天气'),[]);
});
