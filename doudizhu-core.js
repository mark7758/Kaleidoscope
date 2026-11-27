/* Kaleidoscope - 斗地主核心牌型逻辑 (纯 JS，可在浏览器与 Node 中运行) */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DouDiZhuCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SUITS = ['♠', '♥', '♣', '♦'];
  const RANK_TEXT = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A', 15: '2', 16: '小王', 17: '大王' };

  function rankText(rank) {
    return RANK_TEXT[rank] || String(rank);
  }

  function cardText(card) {
    return card.rank >= 16 ? RANK_TEXT[card.rank] : SUITS[card.suit] + rankText(card.rank);
  }

  function createDeck() {
    const deck = [];
    let id = 0;
    for (let rank = 3; rank <= 15; rank++) {
      for (let suit = 0; suit < 4; suit++) deck.push({ id: id++, rank: rank, suit: suit });
    }
    deck.push({ id: id++, rank: 16, suit: -1 });
    deck.push({ id: id++, rank: 17, suit: -1 });
    return deck;
  }

  function shuffle(deck, random) {
    const rnd = random || Math.random;
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  function sortCards(cards) {
    return cards.slice().sort((a, b) => b.rank - a.rank || a.suit - b.suit);
  }

  function deal(random) {
    const deck = shuffle(createDeck(), random);
    const hands = [deck.slice(0, 17), deck.slice(17, 34), deck.slice(34, 51)];
    return { hands: hands.map(sortCards), bottom: sortCards(deck.slice(51)) };
  }

  function countRanks(cards) {
    const counts = {};
    cards.forEach(function (c) { counts[c.rank] = (counts[c.rank] || 0) + 1; });
    return counts;
  }

  function ranksOf(counts, n) {
    return Object.keys(counts).map(Number).filter(function (r) { return counts[r] === n; }).sort(function (a, b) { return a - b; });
  }

  function isConsecutive(ranks) {
    if (!ranks.length) return false;
    for (let i = 1; i < ranks.length; i++) if (ranks[i] !== ranks[i - 1] + 1) return false;
    return true;
  }

  // 判断一组牌的牌型；返回 null 表示非法组合
  function analyze(cards) {
    if (!cards || !cards.length) return null;
    const n = cards.length;
    const counts = countRanks(cards);
    const ranks = Object.keys(counts).map(Number).sort(function (a, b) { return a - b; });
    const singles = ranksOf(counts, 1);
    const pairs = ranksOf(counts, 2);
    const triples = ranksOf(counts, 3);
    const quads = ranksOf(counts, 4);
    const result = function (type, main, length) { return { type: type, main: main, length: length, cards: cards.slice() }; };

    if (n === 1) return result('single', ranks[0], 1);
    if (n === 2) {
      if (ranks.length === 1) return result('pair', ranks[0], 2);
      if (counts[16] && counts[17]) return result('rocket', 17, 2);
      return null;
    }
    if (n === 3 && ranks.length === 1) return result('triple', ranks[0], 3);
    if (n === 4) {
      if (ranks.length === 1) return result('bomb', ranks[0], 4);
      if (triples.length === 1 && singles.length === 1) return result('triple_single', triples[0], 4);
      return null;
    }
    if (n === 5 && triples.length === 1 && pairs.length === 1) return result('triple_pair', triples[0], 5);

    if (n >= 5 && ranks.length === n && ranks[n - 1] <= 14 && isConsecutive(ranks)) {
      return result('straight', ranks[n - 1], n);
    }
    if (n >= 6 && n % 2 === 0 && pairs.length === n / 2 && ranks.length === n / 2 && ranks[ranks.length - 1] <= 14 && isConsecutive(ranks)) {
      return result('double_straight', ranks[ranks.length - 1], n);
    }
    if (n >= 6 && n % 3 === 0 && triples.length === n / 3 && ranks.length === n / 3 && ranks[ranks.length - 1] <= 14 && isConsecutive(ranks)) {
      return result('airplane', ranks[ranks.length - 1], n);
    }
    // 飞机带单：连续 N 个三张 + N 张单牌（单牌不能与三张同点）
    if (n >= 8 && n % 4 === 0) {
      const m = n / 4;
      const rest = cards.filter(function (c) { return triples.indexOf(c.rank) < 0; });
      if (triples.length >= m && ranks.length >= 2 * m && m >= 2) {
        for (let start = 3; start + m - 1 <= 14; start++) {
          const group = [];
          for (let r = start; r < start + m; r++) group.push(r);
          if (group.every(function (r) { return counts[r] >= 3; })) {
            const restCounts = countRanks(rest.filter(function (c) { return group.indexOf(c.rank) < 0; }));
            const restRanks = Object.keys(restCounts).map(Number);
            if (restRanks.length >= m && rest.length >= m) {
              return result('airplane_single', start + m - 1, n);
            }
          }
        }
      }
    }
    // 飞机带对：连续 N 个三张 + N 个对子
    if (n >= 10 && n % 5 === 0) {
      const m = n / 5;
      if (triples.length >= m && pairs.length >= m && m >= 2) {
        for (let start = 3; start + m - 1 <= 14; start++) {
          let ok = true;
          for (let r = start; r < start + m; r++) if (counts[r] < 3) ok = false;
          if (!ok) continue;
          const otherPairs = pairs.filter(function (r) { return r < start || r > start + m - 1; });
          if (otherPairs.length >= m) return result('airplane_pair', start + m - 1, n);
        }
      }
    }
    if (n === 6 && quads.length === 1) {
      const q = quads[0];
      if (cards.filter(function (c) { return c.rank !== q; }).length === 2) return result('four_two_single', q, 6);
    }
    if (n === 8 && quads.length === 1) {
      const q = quads[0];
      const rest = cards.filter(function (c) { return c.rank !== q; });
      const rc = countRanks(rest);
      if (Object.keys(rc).length === 2 && Object.keys(rc).every(function (r) { return rc[r] === 2; })) {
        return result('four_two_pair', q, 8);
      }
    }
    return null;
  }

  // a 能否压过 b（b 为 null 表示自由出牌）
  function canBeat(a, b) {
    if (!a) return false;
    if (!b) return true;
    if (a.type === 'rocket') return b.type !== 'rocket';
    if (b.type === 'rocket') return false;
    if (a.type === 'bomb' && b.type !== 'bomb') return true;
    if (b.type === 'bomb' && a.type !== 'bomb') return false;
    if (a.type !== b.type || a.length !== b.length) return false;
    return a.main > b.main;
  }

  function takeRanks(hand, rank, count) {
    return hand.filter(function (c) { return c.rank === rank; }).slice(0, count);
  }

  function combinations(arr, k, limit) {
    const out = [];
    function rec(start, chosen) {
      if (out.length >= (limit || 100)) return;
      if (chosen.length === k) { out.push(chosen.slice()); return; }
      for (let i = start; i < arr.length; i++) {
        chosen.push(arr[i]);
        rec(i + 1, chosen);
        chosen.pop();
        if (out.length >= (limit || 100)) break;
      }
    }
    rec(0, []);
    return out;
  }

  // 列出手牌中所有能压过 target 的合法出牌（target 为 null 则列出所有合法出牌）
  function findBeating(hand, target) {
    const counts = countRanks(hand);
    const ranks = Object.keys(counts).map(Number).sort(function (a, b) { return a - b; });
    const singles = ranks.slice();
    const pairs = ranks.filter(function (r) { return counts[r] >= 2; });
    const triples = ranks.filter(function (r) { return counts[r] >= 3; });
    const quads = ranks.filter(function (r) { return counts[r] >= 4; });
    const out = [];
    const add = function (cards) {
      const combo = analyze(cards);
      if (combo && canBeat(combo, target)) out.push(combo);
    };

    singles.forEach(function (r) { add(takeRanks(hand, r, 1)); });
    pairs.forEach(function (r) { add(takeRanks(hand, r, 2)); });
    triples.forEach(function (r) { add(takeRanks(hand, r, 3)); });
    quads.forEach(function (r) { add(takeRanks(hand, r, 4)); });
    if (counts[16] && counts[17]) add([].concat(takeRanks(hand, 16, 1), takeRanks(hand, 17, 1)));

    triples.forEach(function (t) {
      singles.filter(function (r) { return r !== t; }).forEach(function (s) {
        add(takeRanks(hand, t, 3).concat(takeRanks(hand, s, 1)));
      });
      pairs.filter(function (r) { return r !== t; }).forEach(function (p) {
        add(takeRanks(hand, t, 3).concat(takeRanks(hand, p, 2)));
      });
    });

    // 顺子 / 连对 / 飞机
    for (let start = 3; start <= 14; start++) {
      let seq = [];
      for (let r = start; r <= 14; r++) {
        seq.push(r);
        if (seq.length >= 5 && seq.every(function (x) { return counts[x] === 1; })) {
          add(seq.map(function (x) { return takeRanks(hand, x, 1)[0]; }));
        }
      }
    }
    for (let start = 3; start <= 14; start++) {
      for (let end = start + 2; end <= 14; end++) {
        const group = [];
        for (let r = start; r <= end; r++) group.push(r);
        if (group.every(function (r) { return counts[r] >= 2; })) {
          add(group.reduce(function (acc, r) { return acc.concat(takeRanks(hand, r, 2)); }, []));
        }
        if (group.every(function (r) { return counts[r] >= 3; })) {
          const tripleCards = group.reduce(function (acc, r) { return acc.concat(takeRanks(hand, r, 3)); }, []);
          add(tripleCards);
          const m = group.length;
          // 飞机带单
          if (m >= 2) {
            const candidates = singles.filter(function (r) { return group.indexOf(r) < 0; })
              .reduce(function (acc, r) {
                const c = counts[r];
                for (let i = 0; i < c; i++) acc.push(r);
                return acc;
              }, []);
            combinations(candidates, m, 24).forEach(function (rs) {
              add(tripleCards.concat(rs.reduce(function (acc, r) { return acc.concat(takeRanks(hand, r, 1)); }, [])));
            });
          }
          // 飞机带对
          if (m >= 2) {
            const otherPairs = pairs.filter(function (r) { return group.indexOf(r) < 0; });
            combinations(otherPairs, m, 24).forEach(function (rs) {
              add(tripleCards.concat(rs.reduce(function (acc, r) { return acc.concat(takeRanks(hand, r, 2)); }, [])));
            });
          }
        }
      }
    }
    quads.forEach(function (q) {
      const bomb = takeRanks(hand, q, 4);
      const others = singles.filter(function (r) { return r !== q; });
      combinations(others, 2, 30).forEach(function (rs) {
        add(bomb.concat(rs.reduce(function (acc, r) { return acc.concat(takeRanks(hand, r, 1)); }, [])));
      });
      const otherPairs = pairs.filter(function (r) { return r !== q; });
      combinations(otherPairs, 2, 30).forEach(function (rs) {
        add(bomb.concat(rs.reduce(function (acc, r) { return acc.concat(takeRanks(hand, r, 2)); }, [])));
      });
    });

    const seen = {};
    return out.filter(function (c) {
      const key = c.type + ':' + c.main + ':' + c.length + ':' + c.cards.map(function (x) { return x.id; }).sort(function (a, b) { return a - b; }).join(',');
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  function handStrength(hand) {
    const counts = countRanks(hand);
    let score = 0;
    if (counts[17]) score += 4;
    if (counts[16]) score += 3;
    score += (counts[15] || 0) * 2;
    score += (counts[14] || 0) * 1.5;
    score += Object.keys(counts).filter(function (r) { return counts[r] === 4; }).length * 2;
    return score;
  }

  return {
    SUITS: SUITS,
    RANK_TEXT: RANK_TEXT,
    rankText: rankText,
    cardText: cardText,
    createDeck: createDeck,
    shuffle: shuffle,
    sortCards: sortCards,
    deal: deal,
    countRanks: countRanks,
    analyze: analyze,
    canBeat: canBeat,
    findBeating: findBeating,
    handStrength: handStrength
  };
});
