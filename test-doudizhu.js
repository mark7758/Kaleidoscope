/* 斗地主核心逻辑自测：node test-doudizhu.js */
const assert = require('assert');
const C = require('./doudizhu-core');

let id = 0;
function cards(ranks) {
  return ranks.map(function (r) { return { id: id++, rank: r, suit: 0 }; });
}
function type(ranks) {
  const a = C.analyze(cards(ranks));
  return a ? a.type : null;
}

assert.strictEqual(type([7]), 'single');
assert.strictEqual(type([7, 7]), 'pair');
assert.strictEqual(type([7, 7, 7]), 'triple');
assert.strictEqual(type([7, 7, 7, 7]), 'bomb');
assert.strictEqual(type([16, 17]), 'rocket');
assert.strictEqual(type([7, 7, 7, 9]), 'triple_single');
assert.strictEqual(type([7, 7, 7, 9, 9]), 'triple_pair');
assert.strictEqual(type([3, 4, 5, 6, 7]), 'straight');
assert.strictEqual(type([3, 4, 5, 6]), null);
assert.strictEqual(type([3, 3, 4, 4, 5, 5]), 'double_straight');
assert.strictEqual(type([3, 3, 3, 4, 4, 4]), 'airplane');
assert.strictEqual(type([3, 3, 3, 4, 4, 4, 7, 8]), 'airplane_single');
assert.strictEqual(type([3, 3, 3, 4, 4, 4, 7, 7, 8, 8]), 'airplane_pair');
assert.strictEqual(type([6, 6, 6, 6, 9, 10]), 'four_two_single');
assert.strictEqual(type([6, 6, 6, 6, 9, 9, 10, 10]), 'four_two_pair');
assert.strictEqual(type([14, 15, 16, 17]), null);

assert.strictEqual(C.canBeat(C.analyze(cards([8])), C.analyze(cards([7]))), true);
assert.strictEqual(C.canBeat(C.analyze(cards([7])), C.analyze(cards([8]))), false);
assert.strictEqual(C.canBeat(C.analyze(cards([3, 3, 3, 3])), C.analyze(cards([14, 14, 14]))), true);
assert.strictEqual(C.canBeat(C.analyze(cards([16, 17])), C.analyze(cards([3, 3, 3, 3]))), true);
assert.strictEqual(C.canBeat(C.analyze(cards([4, 5, 6, 7, 8])), C.analyze(cards([3, 4, 5, 6, 7]))), true);
assert.strictEqual(C.canBeat(C.analyze(cards([4, 4])), C.analyze(cards([3, 4, 5, 6, 7]))), false);

const hand = cards([3, 4, 5, 6, 7, 7, 8, 8, 9, 9, 10, 10, 15, 16, 17]);
const beatsSingle = C.findBeating(hand, C.analyze(cards([6])));
assert.ok(beatsSingle.length > 0);
assert.ok(beatsSingle.every(function (c) { return C.canBeat(c, C.analyze(cards([6]))); }));
const beatsPair = C.findBeating(hand, C.analyze(cards([8, 8])));
assert.ok(beatsPair.some(function (c) { return c.type === 'pair'; }));

const deal = C.deal();
assert.strictEqual(deal.hands.length, 3);
assert.strictEqual(deal.hands[0].length, 17);
assert.strictEqual(deal.bottom.length, 3);
assert.strictEqual(new Set(deal.hands.flat().concat(deal.bottom).map(function (c) { return c.id; })).size, 54);

console.log('全部斗地主核心逻辑测试通过');
