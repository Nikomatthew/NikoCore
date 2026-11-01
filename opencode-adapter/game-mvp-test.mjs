import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {GameRecords} from './game-records.mjs';
test('胜场和AI MVP分别结算，评分重试不会重复加奖',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'niko-mvp-'));try{const records=new GameRecords(dir),base={id:'round-0001',game:'demo',scope:'group:123456',players:['111111','222222']};records.settle({...base,winners:['111111']});records.awardMVP({...base,scores:[{player:'111111',score:70},{player:'222222',score:90}]});records.awardMVP({...base,scores:[{player:'111111',score:100},{player:'222222',score:0}]});assert.deepEqual(records.read('demo','group:123456','111111'),{played:1,wins:1,mvp:0});assert.deepEqual(records.read('demo','group:123456','222222'),{played:1,wins:0,mvp:1});}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
