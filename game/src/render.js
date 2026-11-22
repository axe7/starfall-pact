// Starfall Pact — the renderer.
// Draws the whole table from game state as DOM: duelist banners with life
// totals, the rival's face-down hand, both spirit fields, your hand of
// readable cards, starlight crystals and the message log. Cards are told
// apart by suit colour and glyph, never by text alone.

import { SUITS } from './cards.js';
import { MAX_STARLIGHT } from './engine.js';

const seenFieldUids = new Set();

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// One card face. Spirits show power (bottom left) and guard (bottom
// right); charms show their effect text. The cost sits in a crystal at
// the top left and the suit glyph fills the art box.
export function makeCardElement(card, options = {}) {
  const suit = SUITS[card.suit];
  const node = el('div', `card suit-${card.suit}${options.mini ? ' mini' : ''}`);
  node.style.setProperty('--suit-color', suit.color);
  node.dataset.uid = String(card.uid ?? '');

  const top = el('div', 'card-top');
  top.append(el('span', 'cost', String(card.cost)));
  top.append(el('span', 'card-name', card.name));
  top.append(el('span', 'suit-glyph', suit.glyph));
  node.append(top);

  node.append(el('div', 'card-art', suit.glyph));

  const body = el('div', 'card-body');
  if (card.kind === 'spirit') {
    body.append(el('div', 'card-kind', `${suit.name} Spirit`));
  } else {
    body.append(el('div', 'card-kind', `${suit.name} Charm`));
  }
  if (card.text) body.append(el('div', 'card-text', card.text));
  node.append(body);

  if (card.kind === 'spirit') {
    const stats = el('div', 'card-stats');
    stats.append(el('span', 'power', `⚔ ${card.power}`));
    const guard = el('span', 'guard', `⛨ ${card.guard}`);
    if (card.guard < card.maxGuard) guard.classList.add('wounded');
    stats.append(guard);
    node.append(stats);
    if (options.onField && card.tired) node.append(el('div', 'tired-badge', 'resting'));
    if (options.onField && card.attacked) node.append(el('div', 'tired-badge', 'spent'));
  }
  if (options.extraClass) node.classList.add(options.extraClass);
  return node;
}

function makeCardBack() {
  const node = el('div', 'card back mini');
  node.append(el('div', 'back-star', '★'));
  return node;
}

function renderDuelist(zone, state, who, ui, handlers) {
  const player = state.players[who];
  zone.innerHTML = '';
  const banner = el('div', `duelist${ui.flashDuelist === who ? ' shake' : ''}`);
  banner.append(el('div', 'duelist-face', who === 'you' ? '✦' : '☾'));
  const words = el('div', 'duelist-words');
  words.append(el('div', 'duelist-name', player.name));
  words.append(el('div', 'duelist-sub', `deck ${player.deck.length} · hand ${player.hand.length} · faded ${player.discard.length}`));
  banner.append(words);
  const life = el('div', 'life', `♥ ${Math.max(player.life, 0)}`);
  if (player.life <= 6) life.classList.add('low');
  banner.append(life);
  if (ui.targetSet && ui.targetSet.has(`${who}:duelist`)) {
    banner.classList.add('targetable');
    banner.addEventListener('click', () => handlers.onDuelist(who));
  }
  zone.append(banner);
}

function renderField(zone, state, who, ui, handlers) {
  zone.innerHTML = '';
  const player = state.players[who];
  if (player.field.length === 0) {
    zone.append(el('div', 'field-empty', who === 'you' ? 'Your field is empty — play a spirit.' : 'No spirits yet.'));
    return;
  }
  for (const spirit of player.field) {
    const isNew = !seenFieldUids.has(spirit.uid);
    seenFieldUids.add(spirit.uid);
    const cardEl = makeCardElement(spirit, { extraClass: isNew ? 'enter' : '', onField: true });
    if (ui.flashUids && ui.flashUids.has(spirit.uid)) cardEl.classList.add('hurt');
    if (ui.selectedAttacker === spirit.uid) cardEl.classList.add('selected');
    if (who === 'you' && state.active === 'you' && !spirit.tired && !spirit.attacked && state.phase === 'play' && !ui.busy) {
      cardEl.classList.add('ready');
    }
    if (ui.targetSet && ui.targetSet.has(`${who}:${spirit.uid}`)) cardEl.classList.add('targetable');
    cardEl.addEventListener('click', () => handlers.onFieldSpirit(who, spirit.uid));
    zone.append(cardEl);
  }
}

function renderHands(root, state, ui, handlers) {
  const rivalHand = root.querySelector('#rival-hand');
  rivalHand.innerHTML = '';
  for (let i = 0; i < state.players.rival.hand.length; i += 1) rivalHand.append(makeCardBack());

  const yourHand = root.querySelector('#your-hand');
  yourHand.innerHTML = '';
  state.players.you.hand.forEach((card, index) => {
    const cardEl = makeCardElement(card);
    const playable = state.active === 'you' && state.phase === 'play' && !ui.busy
      && card.cost <= state.starlight
      && (card.kind !== 'spirit' || state.players.you.field.length < 5);
    cardEl.classList.add(playable ? 'playable' : 'unplayable');
    if (ui.selectedHand === index) cardEl.classList.add('selected');
    cardEl.addEventListener('click', () => handlers.onHandCard(index));
    yourHand.append(cardEl);
  });
}

function renderCentre(root, state, ui, handlers) {
  const turn = root.querySelector('#turn-label');
  turn.textContent = state.phase === 'over'
    ? 'The duel is decided'
    : state.active === 'you' ? `Your turn · round ${state.turn}` : `Vesper's turn · round ${state.turn}`;

  const crystals = root.querySelector('#starlight');
  crystals.innerHTML = '';
  for (let i = 0; i < MAX_STARLIGHT; i += 1) {
    const pip = el('span', 'pip', '◆');
    if (i < state.starlight) pip.classList.add('lit');
    else if (i >= state.maxStarlight) pip.classList.add('locked');
    crystals.append(pip);
  }
  crystals.append(el('span', 'starlight-count', `${state.starlight}/${state.maxStarlight} starlight`));

  const log = root.querySelector('#log');
  log.innerHTML = '';
  for (const line of state.log.slice(-2)) log.append(el('div', 'log-line', line));

  const endBtn = root.querySelector('#end-turn');
  endBtn.disabled = !(state.active === 'you' && state.phase === 'play' && !ui.busy);
  endBtn.onclick = () => handlers.onEndTurn();

  const hint = root.querySelector('#hint');
  hint.textContent = ui.hint ?? '';
}

// The full table: banners, fields, hands, centre row.
export function renderTable(root, state, ui, handlers) {
  renderDuelist(root.querySelector('#rival-banner'), state, 'rival', ui, handlers);
  renderDuelist(root.querySelector('#your-banner'), state, 'you', ui, handlers);
  renderField(root.querySelector('#rival-field'), state, 'rival', ui, handlers);
  renderField(root.querySelector('#your-field'), state, 'you', ui, handlers);
  renderHands(root, state, ui, handlers);
  renderCentre(root, state, ui, handlers);
}

// Title, victory and defeat overlays.
export function renderOverlay(root, state, ui, handlers) {
  const overlay = root.querySelector('#overlay');
  overlay.innerHTML = '';
  if (ui.screen === 'game') {
    overlay.classList.add('hidden');
    return;
  }
  overlay.classList.remove('hidden');
  const panel = el('div', 'panel');
  if (ui.screen === 'title') {
    panel.append(el('div', 'game-logo', '★'));
    panel.append(el('h1', 'game-title', 'STARFALL PACT'));
    panel.append(el('p', 'game-sub', 'A card duel beneath falling stars.'));
    panel.append(el('p', 'rules',
      'Both duelists begin at 20 life. Each round your starlight grows: spend it on Spirits that clash on the field and Charms that bend the duel. Comet spirits rush, Moon wardens guard, Stars grant wishes, Shards drain and bolster. Break Vesper\'s 20 life before she breaks yours.'));
    const start = el('button', 'big-button', 'Begin the duel');
    start.addEventListener('click', () => handlers.onStart());
    panel.append(start);
    panel.append(el('p', 'fine-print', 'Click a card to play it · click a ready spirit, then a target, to attack · Enter ends your turn'));
  } else if (ui.screen === 'over') {
    const won = state.winner === 'you';
    panel.append(el('div', 'game-logo', won ? '★' : '☾'));
    panel.append(el('h1', 'game-title', won ? 'THE PACT IS YOURS' : 'YOUR LIGHT GOES OUT'));
    panel.append(el('p', 'game-sub', won
      ? `Vesper's stars fade at round ${state.turn}. Final life — you ${Math.max(state.players.you.life, 0)}, Vesper ${Math.max(state.players.rival.life, 0)}.`
      : `Vesper seals the pact at round ${state.turn}. Final life — you ${Math.max(state.players.you.life, 0)}, Vesper ${Math.max(state.players.rival.life, 0)}.`));
    const again = el('button', 'big-button', 'Duel again');
    again.addEventListener('click', () => handlers.onRestart());
    panel.append(again);
  }
  overlay.append(panel);
}

// A floating number over the table (damage, healing).
export function spawnFloater(root, text, anchorSelector, className) {
  const table = root.querySelector('#table');
  const anchor = root.querySelector(anchorSelector);
  if (!table || !anchor) return;
  const tableRect = table.getBoundingClientRect();
  const rect = anchor.getBoundingClientRect();
  const floater = el('div', `floater ${className ?? ''}`, text);
  floater.style.left = `${rect.left - tableRect.left + rect.width / 2}px`;
  floater.style.top = `${rect.top - tableRect.top}px`;
  table.append(floater);
  setTimeout(() => floater.remove(), 1200);
}
