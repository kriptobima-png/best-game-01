// Boot + game loop. Sporehold is a static browser game: index.html loads this module,
// which owns the canvas, the fixed-timestep loop, and the ?shot= scenes used for the
// entry's screenshots (deterministic: same seed, same frame).
import { STEP, VIEW } from './config.js';
import { makeWorld, stepWorld } from './world.js';
import { draw } from './render.js';
import { makeInput } from './input.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW.width;
canvas.height = VIEW.height;

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') ?? '1') || 1;

const world = makeWorld(seed);
const input = makeInput(canvas);
// Debug handle (read-only inspection for play-testing; the game never reads it).
window.__sporehold = world;

if (shotName) {
  // Screenshot mode: stage the scene, draw one frame, signal readiness.
  stageShot(shotName, world, seed);
  draw(ctx, world);
  window.__shotReady = true;
  window.__shotScreen = world.screen;
  window.__shotInfo = { screen: world.screen, wave: world.wave, score: world.score, kills: world.kills };
} else {
  // Live mode: fixed 60 Hz steps, render every animation frame.
  let last = performance.now();
  let acc = 0;
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    acc += dt;
    let guard = 0;
    while (acc >= STEP && guard < 5) {
      stepWorld(world, input, STEP);
      acc -= STEP;
      guard += 1;
    }
    draw(ctx, world);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
