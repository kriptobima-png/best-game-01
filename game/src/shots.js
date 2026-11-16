// The screenshot scenes behind ?shot=title|play|upgrade|victory. Each one plays the real
// rules forward from a fresh world, steered by a simple autopilot (repelled by nearby
// blight and goo, drawn to the nearest spore when safe, aiming at the closest enemy,
// dashing when cornered), so the frame is what a real game looks like and the same seed
// always gives the same frame. Upgrades are picked by a fixed priority list.
import { FIELD, STEP } from './config.js';
import {
  SCREEN_OVER, SCREEN_PLAY, SCREEN_UPGRADE, SCREEN_VICTORY, makeWorld, resetWorld, startRun, stepWorld,
} from './world.js';

const PLAY_SCOUT_SECONDS = 75;
const UPGRADE_LIMIT_SECONDS = 150;
const VICTORY_LIMIT_SECONDS = 900;
const SAMPLE = STEP;

// Upgrade priority for the autopilot: more bolts first, then faster shots, then hearts.
const PRIORITY = ['twin', 'rapid', 'thick', 'swift', 'magnet', 'longshot', 'dash'];

/** The autopilot's fake input: same shape as the real keyboard/mouse input. */
function makePilotInput() {
  const state = {
    move: { x: 0, y: 0 },
    mouseX: FIELD.width / 2,
    mouseY: FIELD.height / 2 - 120,
    dash: false,
    number: 0,
  };
  return {
    state,
    get mouseX() { return state.mouseX; },
    get mouseY() { return state.mouseY; },
    moveVector() { return state.move; },
    consumeEdges() {
      const edges = {
        clicked: false, clickX: 0, clickY: 0,
        dashPressed: state.dash, pausePressed: false, mutePressed: false,
        restartPressed: false, numberPressed: state.number, anyKey: false,
      };
      state.dash = false;
      state.number = 0;
      return edges;
    },
  };
}

/** Decide where to move, where to aim, and whether to dash, from the live world. */
function pilotThink(world, pilot) {
  const player = world.player;
  const s = pilot.state;

  // Aim: the closest enemy; the warden's bolts fire on their own.
  let target = null;
  let targetDist = Infinity;
  for (const e of world.enemies) {
    const d = Math.hypot(e.x - player.x, e.y - player.y);
    if (d < targetDist) { targetDist = d; target = e; }
  }
  if (target) {
    s.mouseX = target.x;
    s.mouseY = target.y;
  } else {
    s.mouseX = FIELD.width / 2;
    s.mouseY = FIELD.height / 2 - 120;
  }

  // Move: flee nearby blight and goo, chase spores when the coast is clear.
  let mx = 0;
  let my = 0;
  for (const e of world.enemies) {
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d < 150) {
      const w = (150 - d) / 150;
      mx += (dx / d) * w * 2.2;
      my += (dy / d) * w * 2.2;
    }
  }
  for (const g of world.goo) {
    const dx = player.x - g.x;
    const dy = player.y - g.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d < 110) {
      const w = (110 - d) / 110;
      mx += (dx / d) * w * 1.6;
      my += (dy / d) * w * 1.6;
    }
  }
  let nearestSpore = null;
  let sporeDist = Infinity;
  for (const p of world.pickups) {
    if (p.kind !== 'spore') continue;
    const d = Math.hypot(p.x - player.x, p.y - player.y);
    if (d < sporeDist) { sporeDist = d; nearestSpore = p; }
  }
  if (nearestSpore && targetDist > 110 && sporeDist < 260) {
    mx += ((nearestSpore.x - player.x) / sporeDist) * 0.9;
    my += ((nearestSpore.y - player.y) / sporeDist) * 0.9;
  }
  // Kite: keep a little distance from the closest enemy while shooting it.
  if (target && targetDist < 190) {
    mx += ((player.x - target.x) / targetDist) * 0.8;
    my += ((player.y - target.y) / targetDist) * 0.8;
  }
  // Drift back toward the centre so the warden never hugs a wall.
  mx += (FIELD.width / 2 - player.x) / FIELD.width * 0.35;
  my += (FIELD.height / 2 - player.y) / FIELD.height * 0.35;

  const len = Math.hypot(mx, my);
  if (len > 0.01) {
    s.move.x = mx / len;
    s.move.y = my / len;
  } else {
    s.move.x = 0;
    s.move.y = 0;
  }

  // Dash when something is about to touch the warden.
  s.dash = targetDist < 62 && player.dashLeft <= 0;
}

/** Pick the autopilot's favourite upgrade from the offers on screen. */
function pilotPickUpgrade(world, pilot) {
  for (const id of PRIORITY) {
    const index = world.upgradeOffers.findIndex((o) => o.id === id);
    if (index >= 0) {
      pilot.state.number = index + 1;
      return;
    }
  }
  pilot.state.number = 1;
}

/** Run the simulation forward until `stop` says so, or the time cap hits. */
function runUntil(world, pilot, seconds, stop) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (world.screen === SCREEN_UPGRADE) pilotPickUpgrade(world, pilot);
    else pilotThink(world, pilot);
    stepWorld(world, pilot, STEP);
    if (stop(world)) return true;
  }
  return stop(world);
}

/**
 * Set `world` to the named scene (title, play, upgrade or victory) and return the
 * screen to draw over it.
 */
export function stageShot(name, world, seed) {
  resetWorld(world, seed);
  const pilot = makePilotInput();

  if (name === 'title') {
    // Five quiet seconds of the demo grove.
    for (let i = 0; i < 5 / STEP; i += 1) stepWorld(world, pilot, STEP);
    return world.screen;
  }

  startRun(world);
  if (name === 'play') {
    // The busiest frame wins: scout the run for the step with the most blight on
    // screen, then replay the same seed to exactly that step. Deterministic, since
    // the seed and the pilot never change.
    const scout = makeWorld(seed);
    const scoutPilot = makePilotInput();
    startRun(scout);
    let bestStep = 0;
    let bestCount = -1;
    const cap = Math.floor(PLAY_SCOUT_SECONDS / STEP);
    for (let i = 0; i < cap; i += 1) {
      if (scout.screen === SCREEN_UPGRADE) pilotPickUpgrade(scout, scoutPilot);
      else pilotThink(scout, scoutPilot);
      stepWorld(scout, scoutPilot, STEP);
      if (scout.screen === SCREEN_PLAY && scout.time >= 6 && scout.enemies.length > bestCount) {
        bestCount = scout.enemies.length;
        bestStep = i + 1;
      }
      if (scout.screen === SCREEN_OVER || scout.screen === SCREEN_VICTORY) break;
    }
    for (let i = 0; i < bestStep; i += 1) {
      if (world.screen === SCREEN_UPGRADE) pilotPickUpgrade(world, pilot);
      else pilotThink(world, pilot);
      stepWorld(world, pilot, STEP);
    }
    return world.screen;
  }
  if (name === 'upgrade') {
    runUntil(world, pilot, UPGRADE_LIMIT_SECONDS, (w) => w.screen === SCREEN_UPGRADE);
    return world.screen;
  }
  // victory: play the whole run through wave 10.
  runUntil(world, pilot, VICTORY_LIMIT_SECONDS, (w) => w.screen === SCREEN_VICTORY);
  return world.screen;
}
