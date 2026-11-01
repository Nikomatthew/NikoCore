import test from 'node:test';
import assert from 'node:assert/strict';
import {expressionStyle} from './expression-style.mjs';
import {stylePrompt,defaults} from './core.mjs';
test('公开版保持正常表达规则',()=>{
  const config={...defaults,persona:'fixture',samples:[],groupChatMode:'paced'};assert.match(stylePrompt(config),/友善耐心/);assert.match(stylePrompt({...config,groupChatMode:'peak'}),/友善耐心/);assert.match(expressionStyle({}),/友善耐心/);
});
