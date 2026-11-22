// Starfall Pact — hand-in program (Node 22, standard library only).
//
// The game itself is the static site in game/ (open game/index.html in a
// desktop browser; it plays fully offline). This program packages the
// entry for make.fun: it copies game/ and screenshots/ into the output
// directory and writes dossier.json there with the vendored make.fun
// library, byte for byte as the scorer expects.
//
// Run it locally the same way the grader does:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// (MAKEFUN_OUTPUT_DIR stands in for /output outside the grader.)

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Fail loudly rather than hand in an empty entry if the game tree is not
// where this program expects it.
if (!existsSync(join(repoDir, 'game', 'index.html'))) {
  throw new Error('starfall-pact: game/index.html is missing beside main.ts');
}

function copyTree(from, to) {
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
}

copyTree(join(repoDir, 'game'), join(outputDir, 'game'));
if (existsSync(join(repoDir, 'screenshots'))) {
  copyTree(join(repoDir, 'screenshots'), join(outputDir, 'screenshots'));
} else {
  mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
}

// The caps are the scorer's own: at most 4 screenshots of 256 KiB each,
// at most 993 files and 48 MiB under game/, no game path over 1,000
// bytes, and the dossier's source text capped at 160 KiB.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);

const gameFiles = readdirSync(join(outputDir, 'game'), { recursive: true }).length;
const shotFiles = readdirSync(join(outputDir, 'screenshots')).length;
console.log(`starfall-pact: wrote ${gameFiles} game files, ${shotFiles} screenshots, dossier ${dossier.length} bytes`);
