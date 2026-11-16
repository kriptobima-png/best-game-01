// The warden: movement, auto-fire toward the mouse, dash, and taking hits.
import { FIELD, PLAYER } from './config.js';
import { fireSpread } from './bullets.js';
import { sfx } from './audio.js';

export function makePlayer() {
  return {
    x: FIELD.width / 2,
    y: FIELD.height / 2,
    radius: PLAYER.radius,
    speed: PLAYER.speed,
    hearts: PLAYER.hearts,
    maxHearts: PLAYER.maxHearts,
    fireInterval: PLAYER.fireInterval,
    fireTimer: 0,
    bulletSpeed: PLAYER.bulletSpeed,
    bulletDamage: PLAYER.bulletDamage,
    bulletRange: PLAYER.bulletRange,
    bulletRadius: PLAYER.bulletRadius,
    pickupRadius: PLAYER.pickupRadius,
    shots: 1,
    dashCooldown: PLAYER.dashCooldown,
    dashLeft: 0, // cooldown remaining
    dashTimeLeft: 0, // active dash time remaining
    dashX: 0,
    dashY: 0,
    invulnLeft: 0,
    aimX: FIELD.width / 2,
    aimY: FIELD.height / 2 - 120,
    moving: false,
  };
}

/** Move the player, handle dash, and auto-fire. Returns true if a dash started. */
export function stepPlayer(player, input, bullets, fx, dt) {
  const move = input.moveVector();
  player.moving = move.x !== 0 || move.y !== 0;
  player.aimX = input.mouseX;
  player.aimY = input.mouseY;

  if (player.dashLeft > 0) player.dashLeft -= dt;
  if (player.invulnLeft > 0) player.invulnLeft -= dt;

  if (player.dashTimeLeft > 0) {
    player.dashTimeLeft -= dt;
    player.x += player.dashX * PLAYER.dashSpeed * dt;
    player.y += player.dashY * PLAYER.dashSpeed * dt;
  } else {
    player.x += move.x * player.speed * dt;
    player.y += move.y * player.speed * dt;
  }

  // Stay inside the grove clearing.
  const m = player.radius + 10;
  player.x = Math.min(FIELD.width - m, Math.max(m, player.x));
  player.y = Math.min(FIELD.height - m, Math.max(m, player.y));

  // Auto-fire toward the mouse.
  player.fireTimer -= dt;
  if (player.fireTimer <= 0) {
    fireSpread(
      bullets, player.x, player.y, player.aimX, player.aimY,
      player.shots, player.bulletSpeed, player.bulletDamage, player.bulletRange, player.bulletRadius,
    );
    player.fireTimer = player.fireInterval;
    sfx.shoot();
  }
  return false;
}

/** Try to start a dash; returns true when it fires. */
export function tryDash(player, input) {
  if (player.dashLeft > 0 || player.dashTimeLeft > 0) return false;
  const move = input.moveVector();
  let dx = move.x;
  let dy = move.y;
  if (dx === 0 && dy === 0) {
    dx = player.aimX - player.x;
    dy = player.aimY - player.y;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
  }
  player.dashX = dx;
  player.dashY = dy;
  player.dashTimeLeft = PLAYER.dashTime;
  player.dashLeft = player.dashCooldown;
  player.invulnLeft = Math.max(player.invulnLeft, PLAYER.dashTime + 0.1);
  sfx.dash();
  return true;
}
