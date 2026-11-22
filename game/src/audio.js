// Starfall Pact — sound.
// Tiny original synth blips made with WebAudio oscillators: no audio files,
// nothing loaded. Sound starts only after the player's first click, as
// browsers require, and the mute button silences it.

let context = null;
let muted = false;

export function initAudio() {
  if (context) {
    if (context.state === 'suspended') context.resume();
    return;
  }
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) return;
  context = new AudioCtor();
}

export function toggleMuted() {
  muted = !muted;
  return muted;
}

export function isMuted() {
  return muted;
}

function tone(freq, start, duration, type = 'sine', volume = 0.08) {
  if (!context || muted) return;
  const t0 = context.currentTime + start;
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(volume, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(context.destination);
  osc.start(t0);
  osc.stop(t0 + duration);
}

export function playSound(name) {
  if (!context || muted) return;
  if (name === 'play') {
    tone(520, 0, 0.09, 'triangle');
    tone(780, 0.05, 0.1, 'triangle');
  } else if (name === 'draw') {
    tone(660, 0, 0.06, 'sine', 0.05);
  } else if (name === 'attack') {
    tone(220, 0, 0.12, 'sawtooth', 0.06);
    tone(160, 0.04, 0.14, 'sawtooth', 0.05);
  } else if (name === 'hurt') {
    tone(300, 0, 0.1, 'square', 0.05);
    tone(210, 0.06, 0.12, 'square', 0.04);
  } else if (name === 'fade') {
    tone(880, 0, 0.2, 'sine', 0.05);
    tone(440, 0.08, 0.24, 'sine', 0.04);
  } else if (name === 'win') {
    tone(523, 0, 0.14, 'triangle');
    tone(659, 0.12, 0.14, 'triangle');
    tone(784, 0.24, 0.14, 'triangle');
    tone(1046, 0.36, 0.3, 'triangle');
  } else if (name === 'lose') {
    tone(392, 0, 0.18, 'triangle');
    tone(330, 0.16, 0.18, 'triangle');
    tone(262, 0.32, 0.34, 'triangle');
  } else if (name === 'turn') {
    tone(440, 0, 0.07, 'sine', 0.05);
    tone(587, 0.06, 0.09, 'sine', 0.05);
  }
}
