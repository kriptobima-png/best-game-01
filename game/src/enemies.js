// Blight enemies: four kinds, each with its own steering, and the spawn helper.
// Kinds are told apart by shape and colour as well as name, so the game stays readable
// without colour alone: mite = small triangle, spitter = ring, splitter = diamond,
// brute = big hexagon.
import { ENEMIES, FIELD, WAVE_SPEED_PER_LEVEL } from './config.js';
import { range } from './random.js';

export const KIND_MITE = 'mite';
export const KIND_SPITTER = 'spitter';
export const KIND_SPLITTER = 'splitter';
export const KIND_BRUTE = 'brute';

export function makeEnemy(rng, kind, x, y, wave) {
  const def = ENEMIES[kind];
  const speedScale = 1 + WAVE_SPEED_PER_LEVEL * (wave - 1);
  return {
    kind,
    x, y,
    radius: def.radius,
    hp: def.hp,
    maxHp: def.hp,
    speed: def.speed * speedScale * range(rng, 0.9, 1.1),
    score: def.score,
    touch: def.touch,
    spores: def.spores,
    wobble: rng() * Math.PI * 2,
    shootTimer: range(rng, 1.2, 2.2),
    telegraph: 0, // >0 while a spitter is winding up a shot
    flash: 0, // hit flash, seconds remaining
  };
}

/** A random point just inside one of the four edges: where the blight creeps in. */
export function edgeSpawn(rng) {
  const edge = Math.floor(rng() * 4);
  const m = 30;
  if (edge === 0) return { x: range(rng, m, FIELD.width - m), y: m };
  if (edge === 1) return { x: range(rng, m, FIELD.width - m), y: FIELD.height - m };
  if (edge === 2) return { x: m, y: range(rng, m, FIELD.height - m) };
  return { x: FIELD.width - m, y: range(rng, m, FIELD.height - m) };
}

function moveToward(e, tx, ty, speed, dt) {
  const dx = tx - e.x;
  const dy = ty - e.y;
  const dist = Math.hypot(dx, dy) || 1;
  e.x += (dx / dist) * speed * dt;
  e.y += (dy / dist) * speed * dt;
  return dist;
}

/** Steer one enemy for a step. May push goo blobs into `goo`. */
export function updateEnemy(e, world, dt) {
  const player = world.player;
  if (e.flash > 0) e.flash -= dt;
  e.wobble += dt * 3;

  if (e.kind === KIND_MITE || e.kind === KIND_SPLITTER || e.kind === KIND_BRUTE) {
    // Chase, with a gentle sideways wobble so the swarm never moves in lockstep.
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    const wob = Math.sin(e.wobble) * 0.45;
    const nx = dx / dist;
    const ny = dy / dist;
    const sx = nx - ny * wob;
    const sy = ny + nx * wob;
    const len = Math.hypot(sx, sy) || 1;
    e.x += (sx / len) * e.speed * dt;
    e.y += (sy / len) * e.speed * dt;
    return;
  }

  // Spitter: hold its distance, strafe, and lob goo with a visible wind-up.
  const def = ENEMIES.spitter;
  const dist = moveToward(e, player.x, player.y, 0, dt); // dist only
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    if (e.telegraph <= 0) {
      const d = Math.hypot(player.x - e.x, player.y - e.y) || 1;
      world.goo.push({
        x: e.x, y: e.y,
        vx: ((player.x - e.x) / d) * 300,
        vy: ((player.y - e.y) / d) * 300,
        radius: 7,
        travelled: 0,
        range: 700,
      });
      e.shootTimer = def.shootInterval * range(world.rng, 0.85, 1.15);
    }
    return;
  }
  if (dist > def.range + 50) {
    moveToward(e, player.x, player.y, e.speed, dt);
  } else if (dist < def.range - 70) {
    moveToward(e, e.x - (player.x - e.x), e.y - (player.y - e.y), e.speed, dt);
  } else {
    // Strafe slowly around the player.
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    const dir = e.wobble % 2 < 1 ? 1 : -1;
    e.x += (-dy / d) * dir * e.speed * 0.5 * dt;
    e.y += (dx / d) * dir * e.speed * 0.5 * dt;
  }
  e.shootTimer -= dt;
  if (e.shootTimer <= 0 && dist < 560) e.telegraph = 0.45;
}

/** Push overlapping enemies apart so the swarm does not stack into one blob. */
export function separateEnemies(enemies) {
  for (let i = 0; i < enemies.length; i += 1) {
    for (let j = i + 1; j < enemies.length; j += 1) {
      const a = enemies[i];
      const b = enemies[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      const min = a.radius + b.radius - 2;
      if (dist > 0.01 && dist < min) {
        const push = (min - dist) / 2;
        const nx = dx / dist;
        const ny = dy / dist;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
      }
    }
  }
}
