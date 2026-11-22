// Starfall Pact — Vesper, the rival astrologer.
// A readable, greedy opponent: she develops her field, spends charms when
// they are clearly good, trades spirits when the trade is favourable and
// strikes your life total when the way is clear. Her plan shows in her
// choices, so a player can read and counter it. The functions resolve ONE
// action at a time so the caller can animate each step of her turn.

import {
  attack,
  canPlay,
  cardNeedsTarget,
  legalAttackTargets,
  legalTargets,
  playCard,
  readyAttackers,
} from './engine.js';

// Pick a target for one of Vesper's targeted cards, or null to hold it.
function chooseCharmTarget(state, card) {
  const targets = legalTargets(state, 'rival', card);
  if (card.effect.type === 'damageTarget') {
    // Finish a wounded spirit she can kill, else hit the biggest spirit,
    // else strike the player when ahead on life.
    const spirits = targets.filter((t) => t.uid !== 'duelist');
    let best = null;
    let bestScore = -1;
    for (const target of spirits) {
      const spirit = state.players[target.side].field.find((s) => s.uid === target.uid);
      if (!spirit) continue;
      let score = spirit.power;
      if (target.side === 'you' && spirit.guard <= card.effect.amount) score += 10 + spirit.power;
      if (target.side === 'rival') score = -10; // never blast her own spirits
      if (score > bestScore) {
        bestScore = score;
        best = target;
      }
    }
    if (best && bestScore >= 3) return best;
    const me = state.players.rival.life;
    const you = state.players.you.life;
    if (you <= card.effect.amount || me > you) return { side: 'you', uid: 'duelist' };
    return null;
  }
  if (card.effect.type === 'buffSpirit') {
    // Bolster her strongest spirit.
    let best = null;
    let bestPower = -1;
    for (const target of targets) {
      const spirit = state.players.rival.field.find((s) => s.uid === target.uid);
      if (spirit && spirit.power > bestPower) {
        bestPower = spirit.power;
        best = target;
      }
    }
    return best;
  }
  return targets[0] ?? null;
}

// Should Vesper cast this untargeted charm right now?
function charmIsTimely(state, card) {
  const effect = card.effect;
  if (!effect) return true;
  if (effect.type === 'damageAllEnemySpirits') {
    return state.players.you.field.some((s) => s.guard <= effect.amount)
      || state.players.you.field.length >= 2;
  }
  if (effect.type === 'healLife') return state.players.rival.life <= 12;
  if (effect.type === 'drainLife') return true;
  if (effect.type === 'drawCards') return state.players.rival.hand.length <= 5;
  return true;
}

// Play exactly one card from Vesper's hand: the most expensive spirit she
// can afford, else a timely charm. Returns { name, events } or null when
// she is done playing cards this turn.
export function rivalPlayStep(state) {
  const hand = state.players.rival.hand;
  let chosen = -1;
  for (let i = 0; i < hand.length; i += 1) {
    if (!canPlay(state, 'rival', i)) continue;
    const card = hand[i];
    if (card.kind === 'spirit' && (chosen === -1 || card.cost > hand[chosen].cost)) chosen = i;
  }
  if (chosen === -1) {
    for (let i = 0; i < hand.length; i += 1) {
      if (!canPlay(state, 'rival', i)) continue;
      const card = hand[i];
      if (card.kind === 'charm' && charmIsTimely(state, card)) {
        chosen = i;
        break;
      }
    }
  }
  if (chosen === -1) return null;
  const card = hand[chosen];
  let target = null;
  if (cardNeedsTarget(card)) {
    target = chooseCharmTarget(state, card);
    if (!target) return null; // hold the card for a better moment
  }
  const events = playCard(state, 'rival', chosen, target);
  return { name: card.name, events };
}

// Resolve exactly one attack: the first ready spirit with a sensible
// target. Returns { name, events } or null when no attack is sensible.
export function rivalAttackStep(state) {
  for (const attacker of readyAttackers(state, 'rival')) {
    const events = chooseAttack(state, attacker);
    if (events) return { name: attacker.name, events };
  }
  return null;
}

function chooseAttack(state, attacker) {
  const legal = legalAttackTargets(state, 'rival');
  if (legal.length === 0) return null;
  const face = legal.find((t) => t.uid === 'duelist');
  // Kill a spirit she can destroy, take a trade that favours her, and
  // strike the player when the way is clear or the hit is lethal.
  let bestTarget = null;
  let bestScore = -Infinity;
  for (const target of legal) {
    if (target.uid === 'duelist') continue;
    const defender = state.players.you.field.find((s) => s.uid === target.uid);
    if (!defender) continue;
    let score = 0;
    if (defender.guard <= attacker.power) score += 10 + defender.power; // she kills it
    if (attacker.guard > defender.power) score += 5; // and survives
    else if (defender.guard <= attacker.power) score += 2; // trades up
    else score -= defender.power; // bad trade
    if (defender.keywords.includes('ward')) score += 1;
    if (score > bestScore) {
      bestScore = score;
      bestTarget = target;
    }
  }
  if (face && (bestScore < 4 || state.players.you.life <= attacker.power)) {
    return attack(state, 'rival', attacker.uid, face);
  }
  if (bestTarget && bestScore >= 0) return attack(state, 'rival', attacker.uid, bestTarget);
  if (face) return attack(state, 'rival', attacker.uid, face);
  return null;
}
