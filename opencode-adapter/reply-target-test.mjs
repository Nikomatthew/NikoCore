import test from 'node:test';
import assert from 'node:assert/strict';
import { plainTargets } from './plain-reply.mjs';
import { replySegments } from './qq-reply.mjs';

const targets = [{ ref: 'u0m0', index: 0, messageID: '11' }, { ref: 'u0m1', index: 0, messageID: '22' }];

test('标签只标第一条，后续沿用目标，换原消息重新引用', () => {
  const answers = plainTargets('[u0m0] 第一句\n\n第二句\n[u0m1] 另一条的第一句\n\n另一条的第二句', targets, 1);
  assert.equal(answers.length, 2);
  assert.deepEqual(answers[0].decision.messages, ['第一句', '第二句']);
  assert.deepEqual(answers[1].decision.messages, ['另一条的第一句', '另一条的第二句']);
  for (const answer of answers) {
    const route = { group: true, messageID: answer.messageID, quotePending: answer.quotePending };
    assert.equal(replySegments(route, answer.decision.messages[0])[0].data.id, answer.messageID);
    route.quotePending = false;
    assert.deepEqual(replySegments(route, answer.decision.messages[1]), [{ type: 'text', data: { text: answer.decision.messages[1] } }]);
  }
});

test('重复目标合并只引用一次，仍执行累计条数和字数限制', () => {
  const answers = plainTargets('[u0m0] 第一句\n[u0m0] 第二句', targets, 1);
  assert.equal(answers.length, 1);
  assert.deepEqual(answers[0].decision.messages, ['第一句', '第二句']);
  assert.throws(() => plainTargets(Array.from({ length: 7 }, () => '[u0m0] 回复').join('\n'), targets, 1), /上限/);
  assert.throws(() => plainTargets('[u0m0] ' + '字'.repeat(1000) + '\n[u0m0] ' + '字'.repeat(1000), targets, 1), /上限/);
  assert.throws(() => plainTargets('[u9m9] 回复', targets, 1), /引用目标无效/);
});
