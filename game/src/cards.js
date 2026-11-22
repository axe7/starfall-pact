// Starfall Pact — the card catalogue.
// Every card in the game is defined here: four suits told apart by colour and
// shape (Comet, Moon, Star, Shard), two kinds (Spirit stays on the field,
// Charm is an instant effect), and the deck recipe both duelists share.

export const SUITS = {
  comet: { name: 'Comet', glyph: '☄', color: '#ff7a3c' },
  moon: { name: 'Moon', glyph: '☾', color: '#7ec8ff' },
  star: { name: 'Star', glyph: '★', color: '#ffd94d' },
  shard: { name: 'Shard', glyph: '◆', color: '#c792ff' },
};

// kind: 'spirit' | 'charm'
// power: attack strength of a spirit; guard: health of a spirit
// keywords: rush (may attack the turn it is played), ward (enemies must
//   attack this spirit before any other target)
// effect: for charms and for spirits with an arrival effect:
//   { type: 'damageTarget'|'damageAllEnemySpirits'|'healLife'|'drawCards'|
//           'drainLife'|'gainStarlight'|'buffSpirit', amount }
export const CARD_CATALOGUE = [
  // --- Comet: fast and aggressive -------------------------------------
  { id: 'ember-imp', name: 'Ember Imp', suit: 'comet', kind: 'spirit', cost: 1, power: 2, guard: 1, keywords: ['rush'], text: 'Rush.' },
  { id: 'comet-rider', name: 'Comet Rider', suit: 'comet', kind: 'spirit', cost: 2, power: 3, guard: 2, keywords: ['rush'], text: 'Rush.' },
  { id: 'flare-drake', name: 'Flare Drake', suit: 'comet', kind: 'spirit', cost: 4, power: 5, guard: 3, keywords: [], text: '' },
  { id: 'meteor-rain', name: 'Meteor Rain', suit: 'comet', kind: 'charm', cost: 3, power: 0, guard: 0, keywords: [], effect: { type: 'damageAllEnemySpirits', amount: 2 }, text: 'Deal 2 damage to every enemy spirit.' },
  { id: 'starfall-bolt', name: 'Starfall Bolt', suit: 'comet', kind: 'charm', cost: 2, power: 0, guard: 0, keywords: [], effect: { type: 'damageTarget', amount: 3 }, text: 'Deal 3 damage to any spirit or duelist.' },

  // --- Moon: patient defence and healing -------------------------------
  { id: 'moon-warden', name: 'Moon Warden', suit: 'moon', kind: 'spirit', cost: 2, power: 1, guard: 5, keywords: ['ward'], text: 'Ward.' },
  { id: 'tide-priest', name: 'Tide Priest', suit: 'moon', kind: 'spirit', cost: 3, power: 2, guard: 4, keywords: [], effect: { type: 'healLife', amount: 2 }, text: 'Arrival: restore 2 life.' },
  { id: 'lunar-tortoise', name: 'Lunar Tortoise', suit: 'moon', kind: 'spirit', cost: 4, power: 2, guard: 8, keywords: ['ward'], text: 'Ward.' },
  { id: 'moonwell', name: 'Moonwell', suit: 'moon', kind: 'charm', cost: 2, power: 0, guard: 0, keywords: [], effect: { type: 'healLife', amount: 4 }, text: 'Restore 4 life.' },

  // --- Star: wishes, draws and starlight -------------------------------
  { id: 'wish-sprite', name: 'Wish Sprite', suit: 'star', kind: 'spirit', cost: 1, power: 1, guard: 1, keywords: [], effect: { type: 'drawCards', amount: 1 }, text: 'Arrival: draw a card.' },
  { id: 'star-herald', name: 'Star Herald', suit: 'star', kind: 'spirit', cost: 3, power: 3, guard: 3, keywords: [], effect: { type: 'gainStarlight', amount: 1 }, text: 'Arrival: gain 1 starlight this turn.' },
  { id: 'aurora-seer', name: 'Aurora Seer', suit: 'star', kind: 'spirit', cost: 5, power: 4, guard: 5, keywords: [], effect: { type: 'drawCards', amount: 1 }, text: 'Arrival: draw a card.' },
  { id: 'wish-upon', name: 'Wish Upon a Star', suit: 'star', kind: 'charm', cost: 2, power: 0, guard: 0, keywords: [], effect: { type: 'drawCards', amount: 2 }, text: 'Draw 2 cards.' },

  // --- Shard: tricks that bend the duel --------------------------------
  { id: 'shard-stalker', name: 'Shard Stalker', suit: 'shard', kind: 'spirit', cost: 2, power: 3, guard: 1, keywords: [], text: '' },
  { id: 'void-cantor', name: 'Void Cantor', suit: 'shard', kind: 'spirit', cost: 3, power: 2, guard: 3, keywords: [], effect: { type: 'drainLife', amount: 1 }, text: 'Arrival: drain 1 life from the rival.' },
  { id: 'prism-golem', name: 'Prism Golem', suit: 'shard', kind: 'spirit', cost: 5, power: 5, guard: 6, keywords: [], text: '' },
  { id: 'siphon', name: 'Siphon', suit: 'shard', kind: 'charm', cost: 3, power: 0, guard: 0, keywords: [], effect: { type: 'drainLife', amount: 2 }, text: 'Drain 2 life from the rival.' },
  { id: 'bolster', name: 'Bolster', suit: 'shard', kind: 'charm', cost: 1, power: 0, guard: 0, keywords: [], effect: { type: 'buffSpirit', amount: 2 }, text: 'Give one of your spirits +2 guard.' },
];

// How many copies of each card go into a deck (both duelists use this).
export const DECK_RECIPE = {
  'ember-imp': 3,
  'comet-rider': 2,
  'flare-drake': 2,
  'meteor-rain': 2,
  'starfall-bolt': 2,
  'moon-warden': 2,
  'tide-priest': 2,
  'lunar-tortoise': 1,
  'moonwell': 2,
  'wish-sprite': 3,
  'star-herald': 2,
  'aurora-seer': 1,
  'wish-upon': 2,
  'shard-stalker': 2,
  'void-cantor': 2,
  'prism-golem': 1,
  'siphon': 1,
  'bolster': 2,
};

export function cardById(id) {
  return CARD_CATALOGUE.find((card) => card.id === id);
}

// A fresh, unshuffled deck of card ids in recipe order.
export function buildDeckIds() {
  const ids = [];
  for (const card of CARD_CATALOGUE) {
    const copies = DECK_RECIPE[card.id] ?? 0;
    for (let i = 0; i < copies; i += 1) ids.push(card.id);
  }
  return ids;
}
