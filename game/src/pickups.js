// Pickups: golden spores (score) and rare hearts (heal). Spores drift toward the
// player once inside the pickup radius, faster the closer they are.
import { SCORES } from './config.js';
import { range } from './random.js';

export function spawnSpore(pickups, rng, x, y) {
  pickups.push({
    kind: 'spore',
    x: x + range(rng, -8, 8),
    y: y + range(rng, -8, 8),
    vx: range(rng, -30, 30),
    vy: range(rng, -30, 30),
    age: 0,
    life: 12,
  });
}

export function spawnHeart(pickups, rng, x, y) {
  pickups.push({
    kind: 'heart',
    x, y,
    vx: 0,
    vy: 0,
    age: 0,
    life: 15,
  });
}

/** Move pickups; magnet pulls spores in. Returns collected items (kind + x + y). */
export function stepPickups(pickups, player, dt) {
  const collected = [];
  for (let i = pickups.length - 1; i >= 0; i -= 1) {
    const p = pickups[i];
    p.age += dt;
    const dx = player.x - p.x;
    const dy = player.y - p.y;
    const dist = Math.hypot(dx, dy);
    if (dist < player.pickupRadius && dist > 1) {
      const pull = 520 * (1 - dist / (player.pickupRadius + 40));
      p.vx += (dx / dist) * pull * dt * 4;
      p.vy += (dy / dist) * pull * dt * 4;
    }
    p.vx *= 0.92;
    p.vy *= 0.92;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (dist < player.radius + 14) {
      collected.push({ kind: p.kind, x: p.x, y: p.y });
      pickups.splice(i, 1);
    } else if (p.age >= p.life) {
      pickups.splice(i, 1);
    }
  }
  return collected;
}

/** Score value of a collected pickup. */
export function pickupScore(kind) {
  return kind === 'spore' ? SCORES.spore : 0;
}
