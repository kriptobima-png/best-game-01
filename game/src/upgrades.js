// The upgrade draft between waves: three distinct cards drawn from the pool,
// skipping any upgrade already at its max stack.
import { UPGRADES } from './config.js';
import { shuffle } from './random.js';

/** Draw up to 3 upgrade offers the player has not maxed out. */
export function drawOffers(rng, levels) {
  const pool = UPGRADES.filter((u) => (levels[u.id] ?? 0) < u.max);
  shuffle(rng, pool);
  return pool.slice(0, 3).map((u) => ({
    id: u.id,
    name: u.name,
    desc: u.desc,
    level: (levels[u.id] ?? 0) + 1,
    max: u.max,
  }));
}

/** Apply an upgrade's effect to the player's stats and record the stack. */
export function applyUpgrade(world, offer) {
  const def = UPGRADES.find((u) => u.id === offer.id);
  if (!def) return;
  def.apply(world.player);
  world.upgradeLevels[offer.id] = (world.upgradeLevels[offer.id] ?? 0) + 1;
}
