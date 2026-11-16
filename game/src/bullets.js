// Projectiles: the warden's spore bolts and the spitters' goo blobs.
// Bullets are plain objects in arrays; the world owns the arrays.

/** Fire one bolt from (x, y) toward (tx, ty). */
export function fireBolt(bullets, x, y, tx, ty, speed, damage, range, radius) {
  const angle = Math.atan2(ty - y, tx - x);
  bullets.push({
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    damage,
    travelled: 0,
    range,
    radius,
  });
}

/** Fire a spread of `count` bolts centred on the aim angle. */
export function fireSpread(bullets, x, y, tx, ty, count, speed, damage, range, radius) {
  const base = Math.atan2(ty - y, tx - x);
  const spread = 0.14; // radians between neighbouring bolts
  const start = base - (spread * (count - 1)) / 2;
  for (let i = 0; i < count; i += 1) {
    const angle = start + spread * i;
    bullets.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      damage,
      travelled: 0,
      range,
      radius,
    });
  }
}

/** Advance all bullets; remove any that outran their range or left the field. */
export function stepBullets(bullets, dt, field) {
  for (let i = bullets.length - 1; i >= 0; i -= 1) {
    const b = bullets[i];
    const dx = b.vx * dt;
    const dy = b.vy * dt;
    b.x += dx;
    b.y += dy;
    b.travelled += Math.hypot(dx, dy);
    if (b.travelled >= b.range || b.x < -20 || b.x > field.width + 20 || b.y < -20 || b.y > field.height + 20) {
      bullets.splice(i, 1);
    }
  }
}
