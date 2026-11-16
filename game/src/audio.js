// All sound is synthesized with WebAudio: no audio files, no network.
// The context is created lazily on the first user gesture (browsers block audio before
// that) and every call is guarded, so headless screenshot runs never throw.
const NOTES = [262, 294, 330, 392, 440, 523, 587, 659];

let ctx = null;
let master = null;
let musicTimer = null;
let muted = false;
let musicStep = 0;

function ensure() {
  if (ctx !== null) return ctx;
  try {
    const AC = window.AudioContext ?? window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
  } catch {
    ctx = null;
  }
  return ctx;
}

export function unlockAudio() {
  const c = ensure();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
  startMusic();
}

export function setMuted(value) {
  muted = value;
  if (master) master.gain.value = muted ? 0 : 0.5;
}
export function isMuted() {
  return muted;
}

/** One short oscillator blip. */
function blip(freqFrom, freqTo, duration, type, gain) {
  const c = ensure();
  if (!c || muted) return;
  try {
    const now = c.currentTime;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqFrom, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqTo), now + duration);
    g.gain.setValueAtTime(gain, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(g);
    g.connect(master);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  } catch {
    // Audio is decoration; never let it break the game.
  }
}

function arpeggio(notes, step, duration, type, gain) {
  notes.forEach((freq, i) => {
    setTimeout(() => blip(freq, freq, duration, type, gain), i * step);
  });
}

export const sfx = {
  shoot() { blip(720, 380, 0.06, 'square', 0.05); },
  hit() { blip(220, 140, 0.05, 'triangle', 0.08); },
  enemyDie() { blip(320, 70, 0.16, 'sawtooth', 0.09); },
  split() { blip(500, 240, 0.1, 'triangle', 0.08); },
  pickup() { blip(880, 1320, 0.09, 'sine', 0.1); },
  heal() { arpeggio([523, 659, 784], 70, 0.12, 'sine', 0.09); },
  hurt() { blip(140, 60, 0.22, 'square', 0.16); },
  dash() { blip(300, 700, 0.1, 'sine', 0.07); },
  waveClear() { arpeggio([523, 659, 784], 90, 0.14, 'triangle', 0.1); },
  upgrade() { arpeggio([392, 523, 659], 70, 0.12, 'sine', 0.1); },
  gameOver() { arpeggio([392, 311, 233, 175], 160, 0.22, 'triangle', 0.12); },
  victory() { arpeggio([523, 659, 784, 1046, 1318], 110, 0.18, 'triangle', 0.11); },
};

/** A quiet pentatonic pad loop: one soft note every half second. */
function startMusic() {
  if (musicTimer !== null) return;
  const c = ensure();
  if (!c) return;
  musicTimer = setInterval(() => {
    if (muted || document.hidden) return;
    const note = NOTES[musicStep % NOTES.length];
    musicStep += 1;
    // A gentle two-note chord: root + fifth, very low gain.
    blip(note, note, 0.9, 'sine', 0.02);
    blip(note * 1.5, note * 1.5, 0.9, 'sine', 0.012);
  }, 500);
}
