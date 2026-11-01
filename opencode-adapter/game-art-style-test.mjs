import test from 'node:test';
import assert from 'node:assert/strict';
import {gameArtSelection,gameArtInstruction} from './game-art-style.mjs';
test('美术四项自由组合、去重、描述校验且不绑定制作档位',()=>{
 assert.deepEqual(gameArtSelection({gameArtStyles:['pixel','photoreal','pixel','highDefinition']} ).gameArtStyles,['pixel','photoreal','highDefinition']);
 assert.throws(()=>gameArtSelection({gameArtStyles:['unknown']}));assert.throws(()=>gameArtSelection({gameArtDescription:'x'.repeat(1001)}));
 const text=gameArtInstruction({gameQuality:'low',gameArtStyles:['pixel','photo','photoreal','highDefinition'],gameArtDescription:'像素人物配写实光照'});
 assert.match(text,/像素＋写真＋超真实＋高画质/);assert.match(text,/主风格/);assert.match(text,/不强制/);assert.match(text,/不因超真实/);
 assert.match(text,/不是风格白名单/);assert.match(gameArtInstruction({}),/由AI结合玩法自主设计/);assert.match(text,/不得自行忽略/);
});
