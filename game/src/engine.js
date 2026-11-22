// Starfall Pact — the duel engine.
// Pure rules, no rendering: create a game, play cards, attack, end turns.
// Every action appends human-readable lines to state.log and structured
// entries to the returned events list so the renderer can animate them.

import { buildDeckIds, cardById } from './cards.js';

export const STARTING_LIFE = 20;
export const FIELD_LIMIT = 5;
export const HAND_LIMIT = 8;
export const MAX_STARLIGHT = 8;

// A small seeded random number generator (mulberry32), so screenshot
// scenes and tests can replay the exact same shuffle.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(ids, rng) {
  const out = ids.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

let nextUid = 1;

export function makeSpiritInstance(cardId) {
  const card = cardById(cardId);
  return {
    uid: nextUid++,
    cardId,
    name: card.name,
    suit: card.suit,
    kind: card.kind,
    cost: card.cost,
    power: card.power,
    guard: card.guard,
    maxGuard: card.guard,
    keywords: card.keywords.slice(),
    text: card.text,
    effect: card.effect ? { ...card.effect } : null,
    tired: true, // a spirit cannot attack the turn it arrives, unless Rush
    attacked: false,
  };
}

function makePlayer(name) {
  return {
    name,
    life: STARTING_LIFE,
    deck: [],
    hand: [],
    field: [],
    discard: [],
    fatigue: 0,
  };
}

export function otherSide(who) {
  return who === 'you' ? 'rival' : 'you';
}

export function createGame(seed) {
  const rng = makeRng(seed);
  const state = {
    rng,
    turn: 1,
    active: 'you',
    phase: 'play', // 'play' | 'over'
    winner: null,
    starlight: 1,
    maxStarlight: 1,
    log: [],
    players: {
      you: makePlayer('You, the Stargazer'),
      rival: makePlayer('Vesper, Rival Astrologer'),
    },
  };
  for (const who of ['you', 'rival']) {
    const player = state.players[who];
    player.deck = shuffle(buildDeckIds(), rng).map((id) => makeSpiritInstance(id));
    drawCards(state, who, who === 'you' ? 4 : 4);
  }
  state.log.push('The stars fall. The pact is sealed: first to break 20 life wins.');
  return state;
}

export function drawCards(state, who, count) {
  const player = state.players[who];
  const events = [];
  for (let i = 0; i < count; i += 1) {
    if (player.deck.length === 0) {
      player.fatigue += 1;
      damageDuelist(state, who, player.fatigue, events, 'the empty sky');
      continue;
    }
    const card = player.deck.pop();
    if (player.hand.length >= HAND_LIMIT) {
      player.discard.push(card);
      state.log.push(`${player.name} overdraws and discards ${card.name}.`);
    } else {
      player.hand.push(card);
    }
  }
  return events;
}

export function damageDuelist(state, who, amount, events, source) {
  const player = state.players[who];
  player.life -= amount;
  events.push({ type: 'duelistDamage', who, amount, source });
  state.log.push(`${player.name} take ${amount} damage (${source}). Life: ${Math.max(player.life, 0)}.`);
  checkForEnd(state);
}

export function healDuelist(state, who, amount) {
  const player = state.players[who];
  const before = player.life;
  player.life = Math.min(STARTING_LIFE, player.life + amount);
  state.log.push(`${player.name} restore ${player.life - before} life. Life: ${player.life}.`);
}

export function checkForEnd(state) {
  if (state.phase === 'over') return;
  const you = state.players.you.life;
  const rival = state.players.rival.life;
  if (you <= 0 || rival <= 0) {
    state.phase = 'over';
    state.winner = rival <= 0 && you > 0 ? 'you' : you <= 0 && rival > 0 ? 'rival' : 'rival';
    state.log.push(state.winner === 'you' ? 'Vesper falls. The pact is yours.' : 'Your light goes out. The pact is lost.');
  }
}

// Begin the active player's turn: grow and refill starlight, wake spirits,
// draw a card (two on the very first turn of the game is handled by the
// opening hand instead).
export function beginTurn(state) {
  const who = state.active;
  const player = state.players[who];
  state.maxStarlight = Math.min(MAX_STARLIGHT, state.turn);
  state.starlight = state.maxStarlight;
  for (const spirit of player.field) {
    spirit.tired = false;
    spirit.attacked = false;
  }
  const events = drawCards(state, who, 1);
  state.log.push(`Turn ${state.turn}: ${player.name} to move, ${state.starlight} starlight.`);
  return events;
}

export function endTurn(state) {
  state.active = otherSide(state.active);
  if (state.active === 'you') state.turn += 1;
  return beginTurn(state);
}

export function canPlay(state, who, handIndex) {
  if (state.phase !== 'play' || state.active !== who) return false;
  const player = state.players[who];
  const card = player.hand[handIndex];
  if (!card) return false;
  if (card.cost > state.starlight) return false;
  if (card.kind === 'spirit' && player.field.length >= FIELD_LIMIT) return false;
  return true;
}

// Does this card need the player to click a target before it resolves?
export function cardNeedsTarget(card) {
  if (!card.effect) return false;
  return card.effect.type === 'damageTarget' || card.effect.type === 'buffSpirit';
}

// Legal targets for a targeted effect: { side, uid } for a spirit, or
// { side, uid: 'duelist' } for a duelist.
export function legalTargets(state, who, card) {
  const targets = [];
  const foe = otherSide(who);
  if (!card.effect) return targets;
  if (card.effect.type === 'damageTarget') {
    for (const spirit of state.players[foe].field) targets.push({ side: foe, uid: spirit.uid });
    for (const spirit of state.players[who].field) targets.push({ side: who, uid: spirit.uid });
    targets.push({ side: foe, uid: 'duelist' });
    targets.push({ side: who, uid: 'duelist' });
  }
  if (card.effect.type === 'buffSpirit') {
    for (const spirit of state.players[who].field) targets.push({ side: who, uid: spirit.uid });
  }
  return targets;
}

function applyEffect(state, who, card, target, events) {
  const effect = card.effect;
  if (!effect) return;
  const foe = otherSide(who);
  if (effect.type === 'healLife') healDuelist(state, who, effect.amount);
  if (effect.type === 'drawCards') events.push(...drawCards(state, who, effect.amount));
  if (effect.type === 'gainStarlight') {
    state.starlight += effect.amount;
    state.log.push(`${state.players[who].name} gain ${effect.amount} starlight.`);
  }
  if (effect.type === 'drainLife') {
    state.players[who].life = Math.min(STARTING_LIFE, state.players[who].life + effect.amount);
    damageDuelist(state, foe, effect.amount, events, card.name);
  }
  if (effect.type === 'damageAllEnemySpirits') {
    for (const spirit of state.players[foe].field.slice()) {
      damageSpirit(state, foe, spirit, effect.amount, events, card.name);
    }
  }
  if (effect.type === 'damageTarget' && target) {
    if (target.uid === 'duelist') {
      damageDuelist(state, target.side, effect.amount, events, card.name);
    } else {
      const spirit = state.players[target.side].field.find((s) => s.uid === target.uid);
      if (spirit) damageSpirit(state, target.side, spirit, effect.amount, events, card.name);
    }
  }
  if (effect.type === 'buffSpirit' && target && target.uid !== 'duelist') {
    const spirit = state.players[target.side].field.find((s) => s.uid === target.uid);
    if (spirit) {
      spirit.guard += effect.amount;
      spirit.maxGuard += effect.amount;
      state.log.push(`${spirit.name} grows by ${effect.amount} guard.`);
    }
  }
}

export function damageSpirit(state, owner, spirit, amount, events, source) {
  spirit.guard -= amount;
  events.push({ type: 'spiritDamage', owner, uid: spirit.uid, amount, source });
  state.log.push(`${spirit.name} takes ${amount} damage (${source}). Guard: ${Math.max(spirit.guard, 0)}.`);
  if (spirit.guard <= 0) {
    const field = state.players[owner].field;
    const index = field.indexOf(spirit);
    if (index >= 0) field.splice(index, 1);
    state.players[owner].discard.push(spirit);
    events.push({ type: 'spiritFades', owner, uid: spirit.uid, name: spirit.name });
    state.log.push(`${spirit.name} fades into starlight.`);
  }
}

// Play the card at handIndex. For targeted cards, target must be one of
// legalTargets(). Returns the events the action produced.
export function playCard(state, who, handIndex, target = null) {
  const events = [];
  if (!canPlay(state, who, handIndex)) return events;
  const player = state.players[who];
  const card = player.hand[handIndex];
  if (cardNeedsTarget(card) && !target) return events;
  player.hand.splice(handIndex, 1);
  state.starlight -= card.cost;
  state.log.push(`${player.name} play ${card.name}.`);
  if (card.kind === 'spirit') {
    card.tired = !card.keywords.includes('rush');
    player.field.push(card);
    events.push({ type: 'spiritArrives', who, uid: card.uid, name: card.name });
    if (card.effect) applyEffect(state, who, card, target, events);
  } else {
    applyEffect(state, who, card, target, events);
    player.discard.push(card);
  }
  return events;
}

export function readyAttackers(state, who) {
  return state.players[who].field.filter((s) => !s.tired && !s.attacked);
}

// Spirits with Ward must be attacked before any other target on that side.
export function legalAttackTargets(state, who) {
  const foe = otherSide(who);
  const enemyField = state.players[foe].field;
  const wards = enemyField.filter((s) => s.keywords.includes('ward'));
  const targets = (wards.length > 0 ? wards : enemyField).map((s) => ({ side: foe, uid: s.uid }));
  if (wards.length === 0) targets.push({ side: foe, uid: 'duelist' });
  return targets;
}

export function attack(state, who, attackerUid, target) {
  const events = [];
  if (state.phase !== 'play' || state.active !== who) return events;
  const player = state.players[who];
  const attacker = player.field.find((s) => s.uid === attackerUid);
  if (!attacker || attacker.tired || attacker.attacked) return events;
  const legal = legalAttackTargets(state, who);
  if (!legal.some((t) => t.side === target.side && t.uid === target.uid)) return events;
  attacker.attacked = true;
  const foe = otherSide(who);
  if (target.uid === 'duelist') {
    state.log.push(`${attacker.name} strikes ${state.players[foe].name} directly.`);
    damageDuelist(state, foe, attacker.power, events, attacker.name);
  } else {
    const defender = state.players[foe].field.find((s) => s.uid === target.uid);
    if (!defender) return events;
    state.log.push(`${attacker.name} clashes with ${defender.name}.`);
    const defenderPower = defender.power;
    damageSpirit(state, foe, defender, attacker.power, events, attacker.name);
    if (attacker.guard > 0 && state.players[who].field.includes(attacker)) {
      damageSpirit(state, who, attacker, defenderPower, events, defender.name);
    }
  }
  return events;
}
