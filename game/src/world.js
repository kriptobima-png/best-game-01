// The game itself: screens, waves, collisions, scoring, and the win/lose rules.
// Screens: title -> play -> (upgrade between waves) -> victory, or -> over.
// Pause freezes play; every screen is reachable from a mouse click or a key.
import {
  BEST_KEY, ENEMIES, FIELD, LAST_WAVE, PALETTE, SCORES, STEP, WAVES,
} from './config.js';
import { makeRng, shuffle } from './random.js';
import { makePlayer, stepPlayer, tryDash } from './player.js';
import { KIND_BRUTE, KIND_SPLITTER, edgeSpawn, makeEnemy, separateEnemies, updateEnemy } from './enemies.js';
import { stepBullets } from './bullets.js';
import { pickupScore, spawnHeart, spawnSpore, stepPickups } from './pickups.js';
import { addShake, burst, floatText, makeFx, stepFx } from './particles.js';
import { drawOffers, applyUpgrade } from './upgrades.js';
import { setMuted, sfx, unlockAudio } from './audio.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_UPGRADE = 'upgrade';
export const SCREEN_PAUSE = 'pause';
export const SCREEN_OVER = 'over';
export const SCREEN_VICTORY = 'victory';

export function loadBest() {
  try {
    return Number(window.localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

function saveBest(best) {
  try {
    window.localStorage.setItem(BEST_KEY, String(best));
  } catch {
    // Best score is a nicety; a browser that blocks storage still plays fine.
  }
}

export function makeWorld(seed) {
  const world = {
    rng: makeRng(seed),
    screen: SCREEN_TITLE,
    time: 0,
    wave: 0,
    score: 0,
    spores: 0,
    kills: 0,
    best: loadBest(),
    player: makePlayer(),
    enemies: [],
    bullets: [],
    goo: [],
    pickups: [],
    fx: makeFx(),
    spawnQueue: [],
    spawnTimer: 0,
    upgradeOffers: [],
    upgradeLevels: {},
    banner: '',
    bannerTime: 0,
    muted: false,
    attractTimer: 0,
  };
  return world;
}

/** Fresh world for a new run (same seed gives the same run). */
export function resetWorld(world, seed) {
  const fresh = makeWorld(seed);
  Object.keys(fresh).forEach((key) => { world[key] = fresh[key]; });
}

/** Build the spawn queue for a wave and announce it. */
function startWave(world, waveNumber) {
  const def = WAVES[waveNumber - 1];
  const queue = [];
  Object.keys(def).forEach((kind) => {
    if (kind === 'interval') return;
    for (let i = 0; i < def[kind]; i += 1) queue.push(kind);
  });
  shuffle(world.rng, queue);
  world.spawnQueue = queue;
  world.spawnTimer = 0.4;
  world.wave = waveNumber;
  world.banner = `Wave ${waveNumber} of ${LAST_WAVE}`;
  world.bannerTime = 2.2;
}

export function startRun(world) {
  world.player = makePlayer();
  world.enemies = [];
  world.bullets = [];
  world.goo = [];
  world.pickups = [];
  world.score = 0;
  world.spores = 0;
  world.kills = 0;
  world.upgradeLevels = {};
  world.upgradeOffers = [];
  world.time = 0;
  world.screen = SCREEN_PLAY;
  startWave(world, 1);
}

function endRun(world, victory) {
  if (world.score > world.best) {
    world.best = world.score;
    saveBest(world.best);
  }
  world.screen = victory ? SCREEN_VICTORY : SCREEN_OVER;
  if (victory) sfx.victory();
  else sfx.gameOver();
}

function damagePlayer(world, amount) {
  const player = world.player;
  if (player.invulnLeft > 0 || world.screen !== SCREEN_PLAY) return;
  player.hearts -= amount;
  player.invulnLeft = 1.2;
  addShake(world.fx, 7, 0.25);
  burst(world.fx, player.x, player.y, '#ff5d73', 14, 220);
  sfx.hurt();
  if (player.hearts <= 0) {
    player.hearts = 0;
    burst(world.fx, player.x, player.y, '#ffc94d', 40, 320);
    endRun(world, false);
  }
}

function killEnemy(world, index) {
  const e = world.enemies[index];
  world.enemies.splice(index, 1);
  world.kills += 1;
  world.score += e.score;
  floatText(world.fx, e.x, e.y - 10, `+${e.score}`, '#ffe9a8');
  burst(world.fx, e.x, e.y, { mite: PALETTE.mite, spitter: PALETTE.spitter, splitter: PALETTE.splitter, brute: PALETTE.brute }[e.kind], 12, 200);
  if (e.kind === KIND_BRUTE) addShake(world.fx, 4, 0.2);

  // Splitters divide into two mites.
  if (e.kind === KIND_SPLITTER) {
    for (let i = 0; i < 2; i += 1) {
      const child = makeEnemy(world.rng, 'mite', e.x + (i === 0 ? -14 : 14), e.y, world.wave);
      child.hp = 1;
      child.maxHp = 1;
      world.enemies.push(child);
    }
    sfx.split();
  } else {
    sfx.enemyDie();
  }

  // Drops: spores always, a heart sometimes from brutes.
  for (let i = 0; i < e.spores; i += 1) spawnSpore(world.pickups, world.rng, e.x, e.y);
  if (e.kind === KIND_BRUTE && world.rng() < ENEMIES.brute.heartChance) {
    spawnHeart(world.pickups, world.rng, e.x, e.y);
  }
}

function waveCleared(world) {
  const bonus = SCORES.waveClearBonus * world.wave;
  world.score += bonus;
  sfx.waveClear();
  if (world.wave >= LAST_WAVE) {
    endRun(world, true);
    return;
  }
  world.upgradeOffers = drawOffers(world.rng, world.upgradeLevels);
  world.screen = SCREEN_UPGRADE;
}

function stepPlay(world, input, edges, dt) {
  const player = world.player;
  world.time += dt;
  if (world.bannerTime > 0) world.bannerTime -= dt;

  if (edges.pausePressed) {
    world.screen = SCREEN_PAUSE;
    return;
  }
  if (edges.mutePressed) {
    world.muted = !world.muted;
    setMuted(world.muted);
  }
  if (edges.dashPressed) tryDash(player, input);

  stepPlayer(player, input, world.bullets, world.fx, dt);

  // Trickle the wave's spawn queue in from the edges.
  if (world.spawnQueue.length > 0) {
    world.spawnTimer -= dt;
    if (world.spawnTimer <= 0) {
      const kind = world.spawnQueue.shift();
      const pos = edgeSpawn(world.rng);
      world.enemies.push(makeEnemy(world.rng, kind, pos.x, pos.y, world.wave));
      world.spawnTimer = WAVES[world.wave - 1].interval;
    }
  }

  for (const e of world.enemies) updateEnemy(e, world, dt);
  separateEnemies(world.enemies);
  stepBullets(world.bullets, dt, FIELD);
  stepBullets(world.goo, dt, FIELD);

  // Bolts vs enemies.
  for (let bi = world.bullets.length - 1; bi >= 0; bi -= 1) {
    const b = world.bullets[bi];
    let hit = false;
    for (let ei = world.enemies.length - 1; ei >= 0; ei -= 1) {
      const e = world.enemies[ei];
      const dx = b.x - e.x;
      const dy = b.y - e.y;
      if (dx * dx + dy * dy < (b.radius + e.radius) * (b.radius + e.radius)) {
        e.hp -= b.damage;
        e.flash = 0.08;
        burst(world.fx, b.x, b.y, '#ffe9a8', 4, 120);
        sfx.hit();
        hit = true;
        if (e.hp <= 0) killEnemy(world, ei);
        break;
      }
    }
    if (hit) world.bullets.splice(bi, 1);
  }

  // Goo vs player.
  for (let gi = world.goo.length - 1; gi >= 0; gi -= 1) {
    const g = world.goo[gi];
    const dx = g.x - player.x;
    const dy = g.y - player.y;
    if (dx * dx + dy * dy < (g.radius + player.radius) * (g.radius + player.radius)) {
      world.goo.splice(gi, 1);
      damagePlayer(world, 1);
      if (world.screen !== SCREEN_PLAY) return;
    }
  }

  // Touch damage.
  for (const e of world.enemies) {
    const dx = e.x - player.x;
    const dy = e.y - player.y;
    if (dx * dx + dy * dy < (e.radius + player.radius - 4) * (e.radius + player.radius - 4)) {
      damagePlayer(world, e.touch);
      if (world.screen !== SCREEN_PLAY) return;
      break;
    }
  }

  // Pickups.
  const collected = stepPickups(world.pickups, player, dt);
  for (const c of collected) {
    if (c.kind === 'spore') {
      world.spores += 1;
      world.score += pickupScore('spore');
      burst(world.fx, c.x, c.y, '#ffd76a', 5, 110);
      sfx.pickup();
    } else if (c.kind === 'heart') {
      player.hearts = Math.min(player.maxHearts, player.hearts + 1);
      floatText(world.fx, c.x, c.y - 12, '+1 ♥', '#ff6b81');
      sfx.heal();
    }
  }

  stepFx(world.fx, dt);

  // Wave clear: queue empty and field empty.
  if (world.spawnQueue.length === 0 && world.enemies.length === 0 && world.screen === SCREEN_PLAY) {
    waveCleared(world);
  }
}

/** Title screen: a quiet demo grove — blight wanders, the warden waits. */
function stepTitle(world, edges, dt) {
  world.time += dt;
  world.attractTimer -= dt;
  if (world.attractTimer <= 0) {
    world.attractTimer = 1.6;
    if (world.enemies.length < 7) {
      const pos = edgeSpawn(world.rng);
      const kind = world.rng() < 0.6 ? 'mite' : 'spitter';
      const e = makeEnemy(world.rng, kind, pos.x, pos.y, 1);
      world.enemies.push(e);
    }
  }
  // Wanderers drift toward the grove centre, never attacking.
  for (const e of world.enemies) {
    const tx = FIELD.width / 2 + Math.sin(e.wobble) * 260;
    const ty = FIELD.height / 2 + Math.cos(e.wobble * 0.7) * 160;
    const dx = tx - e.x;
    const dy = ty - e.y;
    const d = Math.hypot(dx, dy) || 1;
    e.x += (dx / d) * e.speed * 0.4 * dt;
    e.y += (dy / d) * e.speed * 0.4 * dt;
    e.wobble += dt;
  }
  stepFx(world.fx, dt);
  if (edges.clicked || edges.anyKey || edges.restartPressed) {
    unlockAudio();
    startRun(world);
  }
}

function stepUpgrade(world, edges) {
  let chosen = -1;
  if (edges.numberPressed >= 1 && edges.numberPressed <= world.upgradeOffers.length) {
    chosen = edges.numberPressed - 1;
  } else if (edges.clicked) {
    chosen = upgradeCardAt(world, edges.clickX, edges.clickY);
  }
  if (chosen >= 0) {
    applyUpgrade(world, world.upgradeOffers[chosen]);
    sfx.upgrade();
    world.upgradeOffers = [];
    world.screen = SCREEN_PLAY;
    startWave(world, world.wave + 1);
  }
}

/** Which upgrade card (0..2) contains a point, or -1. Shared with the renderer. */
export function upgradeCardAt(world, x, y) {
  const n = world.upgradeOffers.length;
  if (n === 0) return -1;
  const cardW = 300;
  const cardH = 190;
  const gap = 28;
  const totalW = n * cardW + (n - 1) * gap;
  const x0 = (FIELD.width - totalW) / 2;
  const y0 = 268;
  for (let i = 0; i < n; i += 1) {
    const cx = x0 + i * (cardW + gap);
    if (x >= cx && x <= cx + cardW && y >= y0 && y <= y0 + cardH) return i;
  }
  return -1;
}

/** Button rectangles used by the title / end screens. Shared with the renderer. */
export function buttonRects() {
  return {
    start: { x: FIELD.width / 2 - 150, y: 500, w: 300, h: 64 },
    again: { x: FIELD.width / 2 - 150, y: 516, w: 300, h: 64 },
  };
}

function inside(rect, x, y) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

function stepEnd(world, edges) {
  if (edges.clicked) {
    const rects = buttonRects();
    if (inside(rects.again, edges.clickX, edges.clickY)) {
      unlockAudio();
      startRun(world);
      return;
    }
  }
  if (edges.restartPressed) {
    unlockAudio();
    startRun(world);
  }
}

/** One fixed step of the game. `input` follows the input.js contract. */
export function stepWorld(world, input, dt = STEP) {
  const edges = input.consumeEdges();
  if (world.screen === SCREEN_TITLE) stepTitle(world, edges, dt);
  else if (world.screen === SCREEN_PLAY) stepPlay(world, input, edges, dt);
  else if (world.screen === SCREEN_UPGRADE) stepUpgrade(world, edges);
  else if (world.screen === SCREEN_PAUSE) {
    if (edges.pausePressed || edges.clicked || edges.restartPressed) world.screen = SCREEN_PLAY;
  } else if (world.screen === SCREEN_OVER || world.screen === SCREEN_VICTORY) {
    stepEnd(world, edges);
  }
  return world.screen;
}
