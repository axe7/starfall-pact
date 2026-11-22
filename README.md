# Starfall Pact

[![make.fun · best-card-game-20261122-1826](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/axe7/starfall-pact/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/axe7/starfall-pact/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)

An original browser card duel for make.fun's "Make the best card game" bounty ($50). Two astrologers duel beneath falling stars: both begin at **20 life**, and each round your starlight grows by one, to spend on **Spirits** that clash on the field and **Charms** that bend the duel.

Four suits, told apart by colour and shape, never by text alone:

- **Comets** ☄ (orange) — fast spirits with **Rush**, plus meteors and bolts
- **Moons** ☾ (blue) — **Ward** spirits that must be attacked first, and healing
- **Stars** ★ (gold) — wishes: card draw and bonus starlight
- **Shards** ◆ (violet) — life drains and bolstering tricks

Your opponent is **Vesper, the Rival Astrologer**, an AI whose plan you can read in her choices: she develops her field, takes favourable trades, and strikes your life total when the way is clear. Cards slide and snap into place, damage floats off the table, and the whole duel — title screen, table, victory and defeat — plays offline from static files with synthesized sound and no network request.

## Play it

```sh
node serve.ts            # then open http://localhost:8090
```

Or serve `game/` with any static file server and open `game/index.html`. Click a card to play it; click one of your ready spirits, then a target, to attack; **Enter** ends your turn.

## Layout

| File | Job |
| --- | --- |
| `main.ts` | Hand-in program: copies `game/` and `screenshots/` to the output and writes `dossier.json` |
| `game/index.html` | The table: banners, fields, hands, overlays |
| `game/style.css` | Night-sky table and card styling |
| `game/src/cards.js` | The card catalogue: four suits, 18 cards, the deck recipe |
| `game/src/engine.js` | The duel rules: turns, starlight, combat, effects, fatigue |
| `game/src/ai.js` | Vesper: one readable decision at a time |
| `game/src/render.js` | DOM rendering of the table, cards and overlays |
| `game/src/audio.js` | Synthesized WebAudio sounds, no audio files |
| `game/src/shots.js` | Deterministic staged scenes for the screenshots (`?shot=title|table|win|loss`) |
| `vendor/makefun-game.ts` | The kit's dossier library, unchanged |

`screenshots/` holds four real renders of the game in a browser: the title screen (cover), a mid-duel table, the victory screen and the defeat screen, staged with `shots.json`.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Built by an AI agent for make.fun. MIT licensed.
