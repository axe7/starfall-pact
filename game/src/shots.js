// Starfall Pact — staged scenes for screenshots.
// The game's screenshots are real renders of this code in a browser,
// staged deterministically with ?shot=<name>&seed=<n>: title shows the
// title screen, table a mid-duel position, win and loss the two endings.

import { createGame, makeSpiritInstance } from './engine.js';

function putSpirit(state, who, cardId, guard, tired) {
  const spirit = makeSpiritInstance(cardId);
  if (guard !== undefined) spirit.guard = guard;
  spirit.tired = tired ?? false;
  spirit.attacked = false;
  state.players[who].field.push(spirit);
  return spirit;
}

function setHand(state, who, cardIds) {
  state.players[who].hand = cardIds.map((id) => makeSpiritInstance(id));
}

// A believable mid-duel: round 4, both fields developed, Vesper slightly
// ahead on life, the player holding answers.
export function stageTable(seed) {
  const state = createGame(seed);
  state.turn = 4;
  state.maxStarlight = 4;
  state.starlight = 3;
  state.players.you.life = 13;
  state.players.rival.life = 16;
  state.players.you.field = [];
  state.players.rival.field = [];
  putSpirit(state, 'you', 'comet-rider', 2, false);
  putSpirit(state, 'you', 'moon-warden', 3, false);
  putSpirit(state, 'you', 'wish-sprite', 1, true);
  putSpirit(state, 'rival', 'shard-stalker', 1, false);
  putSpirit(state, 'rival', 'tide-priest', 4, false);
  setHand(state, 'you', ['starfall-bolt', 'flare-drake', 'moonwell', 'ember-imp']);
  setHand(state, 'rival', ['prism-golem', 'siphon', 'ember-imp']);
  state.log = [
    'Vesper plays Tide Priest and restores 2 life.',
    'Your turn: Comet Rider and Moon Warden are ready to attack.',
  ];
  return state;
}

export function stageWin(seed) {
  const state = stageTable(seed);
  state.turn = 7;
  state.phase = 'over';
  state.winner = 'you';
  state.players.you.life = 7;
  state.players.rival.life = 0;
  state.players.rival.field = [];
  state.log = ['Flare Drake strikes Vesper directly.', 'Vesper falls. The pact is yours.'];
  return state;
}

export function stageLoss(seed) {
  const state = stageTable(seed);
  state.turn = 6;
  state.phase = 'over';
  state.winner = 'rival';
  state.players.you.life = 0;
  state.players.rival.life = 9;
  state.players.you.field = [];
  state.log = ['Prism Golem strikes you directly.', 'Your light goes out. The pact is lost.'];
  return state;
}

// Returns { state, screen } for a ?shot= name, or null for normal play.
export function shotScene(name, seed) {
  if (name === 'title') return { state: createGame(seed), screen: 'title' };
  if (name === 'table') return { state: stageTable(seed), screen: 'game' };
  if (name === 'win') return { state: stageWin(seed), screen: 'over' };
  if (name === 'loss') return { state: stageLoss(seed), screen: 'over' };
  return null;
}
