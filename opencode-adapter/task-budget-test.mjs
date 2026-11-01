import test from 'node:test';
import assert from 'node:assert/strict';
import { observeTaskBudget } from './task-budget.mjs';

test('步数按模型回复去重累计，同轮多工具不增加步数，继续输入重置', () => {
  const task = { stepLimit: 180 };
  const messages = [{ type: 'user', id: 'u1' }, { type: 'assistant', id: 'a1', content: [{ type: 'tool' }, { type: 'tool' }] }];
  assert.equal(observeTaskBudget(task, messages).used, 1);
  assert.equal(observeTaskBudget(task, messages).remaining, 179);
  assert.equal(observeTaskBudget(task, [{ type: 'assistant', id: 'a1' }, { type: 'assistant', id: 'a2' }]).used, 2);
  task.stepLimit = 240;
  assert.equal(observeTaskBudget(task, []).remaining, 238);
  assert.equal(observeTaskBudget(task, [{ type: 'user', id: 'u2' }, { type: 'assistant', id: 'a3' }]).used, 1);
});

test('未观察到本轮开始时不推断剩余步数', () => {
  const budget = observeTaskBudget({}, [{ type: 'assistant', id: 'old' }]);
  assert.equal(budget.complete, false);
  assert.equal(budget.remaining, null);
});
