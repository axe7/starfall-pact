// Starfall Pact — the table itself.
// Wires the engine, the rival and the renderer together: clicking cards,
// choosing targets, attacking, ending turns, and running Vesper's turn
// one visible step at a time.

import {
  attack,
  canPlay,
  cardNeedsTarget,
  createGame,
  endTurn,
  legalAttackTargets,
  legalTargets,
  playCard,
} from './engine.js';
import { rivalAttackStep, rivalPlayStep } from './ai.js';
import { renderOverlay, renderTable, spawnFloater } from './render.js';
import { initAudio, playSound, toggleMuted } from './audio.js';
import { shotScene } from './shots.js';

const root = document.querySelector('#app');
const params = new URLSearchParams(location.search);
const shotName = params.get('shot');
const shotSeed = Number(params.get('seed') ?? 7);

const ui = {
  screen: 'title',
  selectedHand: -1,
  selectedAttacker: null,
  targetSet: null,
  hint: '',
  busy: false,
  flashUids: new Set(),
  flashDuelist: null,
};

let state = createGame((Math.random() * 1e9) >>> 0);
if (shotName) {
  const scene = shotScene(shotName, shotSeed);
  if (scene) {
    state = scene.state;
    ui.screen = scene.screen;
  }
}

function targetKeySet(targets) {
  return new Set(targets.map((t) => `${t.side}:${t.uid}`));
}

function clearSelection() {
  ui.selectedHand = -1;
  ui.selectedAttacker = null;
  ui.targetSet = null;
  ui.hint = '';
}

function refresh() {
  renderTable(root, state, ui, handlers);
  renderOverlay(root, state, ui, handlers);
  const status = document.querySelector('#status');
  if (status) {
    status.textContent = state.phase === 'over'
      ? (state.winner === 'you' ? 'You won the duel.' : 'Vesper won the duel.')
      : `${state.active === 'you' ? 'Your' : "Vesper's"} turn. Your life ${state.players.you.life}, Vesper's life ${state.players.rival.life}.`;
  }
}

// Turn engine events into sound and floating numbers.
function presentEvents(events) {
  for (const event of events) {
    if (event.type === 'spiritDamage') {
      ui.flashUids.add(event.uid);
      playSound('hurt');
    }
    if (event.type === 'spiritFades') playSound('fade');
    if (event.type === 'duelistDamage') {
      ui.flashDuelist = event.who;
      spawnFloater(root, `-${event.amount}`, event.who === 'you' ? '#your-banner .life' : '#rival-banner .life', 'damage');
      playSound('hurt');
    }
    if (event.type === 'spiritArrives') playSound('play');
  }
}

function afterAction(events) {
  presentEvents(events);
  refresh();
  setTimeout(() => {
    ui.flashUids.clear();
    ui.flashDuelist = null;
    refresh();
  }, 450);
  if (state.phase === 'over') {
    ui.screen = 'over';
    playSound(state.winner === 'you' ? 'win' : 'lose');
    refresh();
  }
}

function runRivalTurn() {
  ui.busy = true;
  clearSelection();
  refresh();
  const step = () => {
    if (state.phase === 'over') {
      ui.busy = false;
      afterAction([]);
      return;
    }
    const played = rivalPlayStep(state);
    if (played) {
      afterAction(played.events);
      setTimeout(step, 750);
      return;
    }
    const attacked = rivalAttackStep(state);
    if (attacked) {
      playSound('attack');
      afterAction(attacked.events);
      setTimeout(step, 750);
      return;
    }
    const events = endTurn(state);
    ui.busy = false;
    playSound('turn');
    afterAction(events);
  };
  setTimeout(step, 650);
}

const handlers = {
  onStart() {
    initAudio();
    state = createGame((Math.random() * 1e9) >>> 0);
    ui.screen = 'game';
    clearSelection();
    playSound('turn');
    refresh();
  },
  onRestart() {
    handlers.onStart();
  },
  onHandCard(index) {
    if (ui.busy || state.active !== 'you' || state.phase !== 'play') return;
    initAudio();
    if (ui.selectedAttacker !== null) clearSelection();
    const card = state.players.you.hand[index];
    if (!card) return;
    if (!canPlay(state, 'you', index)) {
      ui.hint = card.cost > state.starlight ? `Not enough starlight for ${card.name}.` : `${card.name} cannot be played now.`;
      refresh();
      return;
    }
    if (cardNeedsTarget(card)) {
      ui.selectedHand = index;
      ui.targetSet = targetKeySet(legalTargets(state, 'you', card));
      ui.hint = `Choose a target for ${card.name}.`;
      refresh();
      return;
    }
    const events = playCard(state, 'you', index);
    playSound('play');
    clearSelection();
    afterAction(events);
  },
  onFieldSpirit(who, uid) {
    if (ui.busy || state.phase !== 'play') return;
    initAudio();
    // Clicking a target while a card or attacker is selected.
    if (ui.targetSet && ui.targetSet.has(`${who}:${uid}`)) {
      resolveTarget({ side: who, uid });
      return;
    }
    if (state.active !== 'you' || who !== 'you') return;
    const spirit = state.players.you.field.find((s) => s.uid === uid);
    if (!spirit || spirit.tired || spirit.attacked) {
      ui.hint = spirit ? `${spirit.name} cannot attack now.` : '';
      refresh();
      return;
    }
    ui.selectedAttacker = uid;
    ui.selectedHand = -1;
    ui.targetSet = targetKeySet(legalAttackTargets(state, 'you'));
    ui.hint = `${spirit.name} strikes: choose a target.`;
    refresh();
  },
  onDuelist(who) {
    if (ui.targetSet && ui.targetSet.has(`${who}:duelist`)) resolveTarget({ side: who, uid: 'duelist' });
  },
  onEndTurn() {
    if (ui.busy || state.active !== 'you' || state.phase !== 'play') return;
    clearSelection();
    const events = endTurn(state);
    afterAction(events);
    if (state.phase !== 'over') runRivalTurn();
  },
};

function resolveTarget(target) {
  let events = [];
  if (ui.selectedHand >= 0) {
    events = playCard(state, 'you', ui.selectedHand, target);
    playSound('play');
  } else if (ui.selectedAttacker !== null) {
    events = attack(state, 'you', ui.selectedAttacker, target);
    playSound('attack');
  }
  clearSelection();
  afterAction(events);
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && ui.screen === 'game') handlers.onEndTurn();
  if (event.key === 'Escape') {
    clearSelection();
    refresh();
  }
});

const muteButton = document.querySelector('#mute');
if (muteButton) {
  muteButton.addEventListener('click', () => {
    initAudio();
    muteButton.textContent = toggleMuted() ? '🔇' : '🔊';
  });
}

refresh();
