/* Kaleidoscope 斗地主 - 页面交互与人机对战 */
(function () {
  'use strict';
  const C = window.DouDiZhuCore;
  const $ = function (id) { return document.getElementById(id); };
  const NAMES = ['你', '玩家二', '玩家三'];
  const TYPE_NAMES = {
    single: '单张', pair: '对子', triple: '三张', triple_single: '三带一', triple_pair: '三带二',
    straight: '顺子', double_straight: '连对', airplane: '飞机', airplane_single: '飞机带单',
    airplane_pair: '飞机带对', four_two_single: '四带二', four_two_pair: '四带两对',
    bomb: '炸弹', rocket: '王炸'
  };
  const BOMB_TYPES = ['bomb', 'rocket'];

  let state = null;

  function describe(combo) {
    if (!combo) return '';
    if (combo.type === 'rocket') return '王炸';
    if (combo.type === 'bomb') return '炸弹 ' + C.rankText(combo.main);
    let text = TYPE_NAMES[combo.type] + ' ' + C.rankText(combo.main);
    if (['straight', 'double_straight', 'airplane', 'airplane_single', 'airplane_pair'].indexOf(combo.type) >= 0) {
      text += '（' + combo.length + '张）';
    }
    return text;
  }

  function cardElement(card, small) {
    const el = document.createElement(small ? 'span' : 'button');
    el.className = 'card ' + (card.suit === 1 || card.suit === 3 || card.rank >= 16 ? 'red' : 'black');
    if (small) el.classList.add('mini-card');
    el.textContent = C.cardText(card);
    return el;
  }

  function addLog(text) {
    const li = document.createElement('li');
    li.textContent = text;
    $('log').appendChild(li);
    $('log').scrollTop = $('log').scrollHeight;
  }

  function startGame() {
    const dealt = C.deal();
    state = {
      hands: dealt.hands,
      bottom: dealt.bottom,
      landlord: -1,
      phase: 'bid',
      turn: 0,
      bidCount: 0,
      lastPlay: null,
      lastPlayer: -1,
      passes: 0,
      moves: ['', '', ''],
      selected: {},
      hintIndex: 0,
      hintOptions: [],
      busy: false,
      status: '发牌完成，轮到你叫地主'
    };
    $('log').innerHTML = '';
    addLog('新一局开始，底牌已发放');
    render();
    maybeAiTurn();
  }

  function render() {
    for (let i = 0; i < 3; i++) {
      const player = state.hands[i];
      $('count-' + i).textContent = player.length;
      const role = $('role-' + i);
      role.textContent = state.landlord < 0 ? '待定' : (state.landlord === i ? '地主' : '农民');
      role.className = 'tag' + (state.landlord === i ? ' landlord' : '');
      $('move-' + i).textContent = state.moves[i] || '';
      if (i > 0) {
        const backs = $('backs-' + i);
        backs.innerHTML = '';
        for (let k = 0; k < Math.min(player.length, 12); k++) {
          const back = document.createElement('div');
          back.className = 'card-back';
          backs.appendChild(back);
        }
      }
    }

    const bottom = $('bottom-cards');
    bottom.innerHTML = '';
    state.bottom.forEach(function (card) {
      if (state.landlord >= 0) bottom.appendChild(cardElement(card, true));
      else {
        const back = document.createElement('div');
        back.className = 'card-back';
        bottom.appendChild(back);
      }
    });

    const hand = $('hand');
    hand.innerHTML = '';
    state.hands[0].forEach(function (card) {
      const el = cardElement(card);
      if (state.selected[card.id]) el.classList.add('selected');
      el.disabled = state.phase !== 'play' || state.turn !== 0 || state.busy;
      el.addEventListener('click', function () {
        if (state.selected[card.id]) delete state.selected[card.id];
        else state.selected[card.id] = true;
        render();
      });
      hand.appendChild(el);
    });

    const bidControls = $('bid-controls');
    const playControls = $('play-controls');
    bidControls.classList.toggle('hidden', state.phase !== 'bid' || state.turn !== 0 || state.busy);
    playControls.classList.toggle('hidden', state.phase !== 'play' || state.turn !== 0 || state.busy);
    $('pass').disabled = !state.lastPlay || state.lastPlayer === 0;
    $('status').textContent = state.status;

    if (state.lastPlay) {
      $('last-play').textContent = NAMES[state.lastPlayer] + ' 出了 ' + state.lastPlay.cards.map(C.cardText).join(' ') + '（' + describe(state.lastPlay) + '）';
    } else if (state.lastPlayer >= 0) {
      $('last-play').textContent = state.moves[state.lastPlayer] ? NAMES[state.lastPlayer] + ' 不要' : '新一轮，自由出牌';
    } else {
      $('last-play').textContent = state.phase === 'bid' ? '等待叫地主…' : '新一轮，自由出牌';
    }
  }

  function nextPlayer(i) { return (i + 1) % 3; }

  function bid(who, wants) {
    if (wants) {
      state.landlord = who;
      state.hands[who] = C.sortCards(state.hands[who].concat(state.bottom));
      state.phase = 'play';
      state.turn = who;
      state.lastPlay = null;
      state.lastPlayer = -1;
      state.passes = 0;
      state.moves = ['', '', ''];
      state.status = NAMES[who] + ' 成为地主，先出牌';
      addLog(NAMES[who] + ' 叫地主，获得 3 张底牌');
      render();
      maybeAiTurn();
      return;
    }
    state.bidCount++;
    addLog(NAMES[who] + ' 不叫');
    if (state.bidCount >= 3) {
      state.status = '无人叫地主，重新发牌';
      state.busy = true;
      addLog('无人叫地主，重新发牌');
      render();
      setTimeout(startGame, 900);
      return;
    }
    state.turn = nextPlayer(who);
    state.status = '轮到 ' + NAMES[state.turn] + ' 叫地主';
    render();
    maybeAiTurn();
  }

  function selectedCards() {
    return state.hands[0].filter(function (c) { return state.selected[c.id]; });
  }

  function play(who, combo) {
    state.hands[who] = state.hands[who].filter(function (c) { return combo.cards.indexOf(c) < 0; });
    state.lastPlay = combo;
    state.lastPlayer = who;
    state.passes = 0;
    state.moves[who] = describe(combo);
    addLog(NAMES[who] + ' 出 ' + describe(combo) + '（' + combo.cards.map(C.cardText).join(' ') + '）');
    state.selected = {};
    state.hintOptions = [];
    if (who === 0) state.hintIndex = 0;
    if (state.hands[who].length === 0) {
      finish(who);
      return;
    }
    state.turn = nextPlayer(who);
    state.status = '轮到 ' + NAMES[state.turn] + ' 出牌';
    render();
    maybeAiTurn();
  }

  function pass(who) {
    state.moves[who] = '不要';
    state.passes++;
    addLog(NAMES[who] + ' 不要');
    if (state.passes >= 2 && state.lastPlay) {
      state.lastPlay = null;
      state.lastPlayer = -1;
      state.passes = 0;
      addLog('无人压牌，' + NAMES[state.turn] + ' 获得出牌权');
    }
    state.turn = nextPlayer(who);
    if (!state.lastPlay) {
      state.moves = ['', '', ''];
      state.status = NAMES[state.turn] + ' 自由出牌';
    } else {
      state.status = '轮到 ' + NAMES[state.turn] + ' 出牌';
    }
    render();
    maybeAiTurn();
  }

  function finish(winner) {
    state.phase = 'over';
    const landlordWin = winner === state.landlord;
    state.status = (landlordWin ? '地主 ' : '农民阵营 ') + NAMES[winner] + ' 获胜！点击「重新开局」再来一局';
    addLog(state.status);
    render();
  }

  function chooseAiCombo(ai) {
    const hand = state.hands[ai];
    let options = C.findBeating(hand, state.lastPlay);
    if (!options.length) return null;

    // 农民之间不互相压牌（队友已出牌且不是地主时尽量放过）
    if (state.lastPlay && state.lastPlayer !== ai && state.landlord !== ai && state.landlord !== state.lastPlayer) {
      const emergency = state.hands[state.landlord].length <= 2;
      if (!emergency) return null;
    }

    const score = function (combo) {
      const bomb = BOMB_TYPES.indexOf(combo.type) >= 0 ? 100 : 0;
      const lead = !state.lastPlay;
      // 自由出牌时优先一次多出几张，跟牌时优先出最小的同型牌
      const lengthBonus = lead ? -combo.length * 3 : 0;
      return bomb + lengthBonus + combo.main + (combo.type === 'single' ? 2 : 0);
    };
    options.sort(function (a, b) { return score(a) - score(b); });
    if (state.lastPlay && BOMB_TYPES.indexOf(options[0].type) >= 0 && options.length > 1) {
      const nonBomb = options.filter(function (o) { return BOMB_TYPES.indexOf(o.type) < 0; });
      if (nonBomb.length) options = nonBomb;
    } else if (!state.lastPlay && BOMB_TYPES.indexOf(options[0].type) >= 0 && options.length > 1) {
      const nonBomb = options.filter(function (o) { return BOMB_TYPES.indexOf(o.type) < 0; });
      if (nonBomb.length) options = nonBomb;
    }
    return options[0];
  }

  function maybeAiTurn() {
    if (state.busy || state.phase === 'over' || state.turn === 0) return;
    state.busy = true;
    render();
    const who = state.turn;
    setTimeout(function () {
      if (state.phase === 'bid') {
        const strength = C.handStrength(state.hands[who]);
        bid(who, strength >= 6 || state.bidCount === 2);
      } else if (state.phase === 'play') {
        const combo = chooseAiCombo(who);
        if (combo) play(who, combo);
        else pass(who);
      }
      state.busy = false;
      render();
      maybeAiTurn();
    }, 700);
  }

  $('bid').addEventListener('click', function () { bid(0, true); });
  $('pass-bid').addEventListener('click', function () { bid(0, false); });
  $('restart').addEventListener('click', startGame);

  $('play').addEventListener('click', function () {
    if (state.phase !== 'play' || state.turn !== 0) return;
    const cards = selectedCards();
    if (!cards.length) { state.status = '请先选择要出的牌'; render(); return; }
    const combo = C.analyze(cards);
    if (!combo) { state.status = '这不是合法的牌型，请重新选择'; render(); return; }
    if (!C.canBeat(combo, state.lastPlay)) { state.status = '这手牌压不过上家，请重新选择'; render(); return; }
    play(0, combo);
  });

  $('pass').addEventListener('click', function () {
    if (state.phase !== 'play' || state.turn !== 0 || !state.lastPlay || state.lastPlayer === 0) return;
    pass(0);
  });

  $('clear').addEventListener('click', function () { state.selected = {}; state.hintOptions = []; render(); });

  $('hint').addEventListener('click', function () {
    if (state.phase !== 'play' || state.turn !== 0) return;
    if (!state.hintOptions.length) {
      state.hintOptions = C.findBeating(state.hands[0], state.lastPlay);
      state.hintOptions.sort(function (a, b) { return a.main - b.main || a.length - b.length; });
      state.hintIndex = 0;
    }
    if (!state.hintOptions.length) { state.status = '没有能压过的牌，建议不出'; render(); return; }
    const combo = state.hintOptions[state.hintIndex % state.hintOptions.length];
    state.hintIndex++;
    state.selected = {};
    combo.cards.forEach(function (c) { state.selected[c.id] = true; });
    state.status = '提示：' + describe(combo);
    render();
  });

  startGame();
})();
