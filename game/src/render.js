// All drawing: the grove, the warden, the blight, the HUD, and every menu screen.
// Nothing here changes game state; the same draw runs for live play and screenshots.
import { FIELD, FONT, PALETTE, VIEW } from './config.js';
import {
  SCREEN_OVER, SCREEN_PAUSE, SCREEN_PLAY, SCREEN_TITLE, SCREEN_UPGRADE, SCREEN_VICTORY,
  buttonRects, upgradeCardAt,
} from './world.js';
import { shakeOffset } from './particles.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function heart(ctx, x, y, size, filled) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 16, size / 16);
  ctx.beginPath();
  ctx.moveTo(0, 5);
  ctx.bezierCurveTo(-11, -4, -6, -12, 0, -6);
  ctx.bezierCurveTo(6, -12, 11, -4, 0, 5);
  ctx.closePath();
  ctx.fillStyle = filled ? PALETTE.heart : '#3a4a40';
  ctx.fill();
  ctx.restore();
}

function drawMushroom(ctx, x, y, scale, hue) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = '#e8e0c8';
  ctx.fillRect(-3, 0, 6, 14);
  ctx.fillStyle = hue;
  ctx.beginPath();
  ctx.arc(0, 0, 12, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath();
  ctx.arc(-5, -6, 2, 0, Math.PI * 2);
  ctx.arc(4, -8, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBackground(ctx, world) {
  ctx.fillStyle = PALETTE.backdrop;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  // Soft radial glow in the middle of the clearing.
  const glow = ctx.createRadialGradient(640, 360, 40, 640, 360, 520);
  glow.addColorStop(0, '#1a3a28');
  glow.addColorStop(1, 'rgba(16,36,26,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  // Grove floor.
  ctx.fillStyle = PALETTE.floor;
  ctx.beginPath();
  ctx.ellipse(640, 360, 600, 330, 0, 0, Math.PI * 2);
  ctx.fill();

  // The ring of the grove: the safe clearing's edge.
  ctx.strokeStyle = PALETTE.groveRing;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.ellipse(640, 360, 600, 330, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = PALETTE.groveRingGlow;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(640, 360, 594, 324, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Decorative mushrooms around the ring, swaying gently with time.
  const spots = [
    [90, 120, 1.0, '#7a5cff'], [1180, 110, 0.8, '#ff8a3d'], [60, 620, 0.9, '#3ddbd9'],
    [1210, 600, 1.1, '#ff5d73'], [330, 60, 0.7, '#ffd76a'], [950, 660, 0.9, '#7a5cff'],
    [640, 40, 0.8, '#3ddbd9'], [640, 690, 0.7, '#ff8a3d'],
  ];
  for (const [x, y, s, hue] of spots) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(world.time * 0.8 + x) * 0.04);
    ctx.translate(-x, -y);
    drawMushroom(ctx, x, y, s, hue);
    ctx.restore();
  }

  // Drifting glow-spores for atmosphere.
  ctx.fillStyle = 'rgba(255, 215, 106, 0.25)';
  for (let i = 0; i < 14; i += 1) {
    const px = (i * 173 + world.time * 12) % 1280;
    const py = 80 + ((i * 97) % 560) + Math.sin(world.time + i) * 8;
    ctx.beginPath();
    ctx.arc(px, py, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

const ENEMY_COLORS = {
  mite: PALETTE.mite, spitter: PALETTE.spitter, splitter: PALETTE.splitter, brute: PALETTE.brute,
};

function drawEnemy(ctx, e) {
  const color = ENEMY_COLORS[e.kind];
  ctx.save();
  ctx.translate(e.x, e.y);
  if (e.flash > 0) ctx.globalAlpha = 0.6;

  if (e.kind === 'mite') {
    ctx.rotate(Math.sin(e.wobble) * 0.3);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -e.radius);
    ctx.lineTo(e.radius, e.radius);
    ctx.lineTo(-e.radius, e.radius);
    ctx.closePath();
    ctx.fill();
  } else if (e.kind === 'spitter') {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.backdrop;
    ctx.beginPath();
    ctx.arc(0, 0, e.radius * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, e.radius * 0.25, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.kind === 'splitter') {
    ctx.rotate(Math.PI / 4 + Math.sin(e.wobble * 0.5) * 0.15);
    ctx.fillStyle = color;
    ctx.fillRect(-e.radius * 0.8, -e.radius * 0.8, e.radius * 1.6, e.radius * 1.6);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(-e.radius * 0.35, -e.radius * 0.35, e.radius * 0.7, e.radius * 0.7);
  } else {
    // Brute: big hexagon with a dark core.
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      const px = Math.cos(a) * e.radius;
      const py = Math.sin(a) * e.radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.backdrop;
    ctx.beginPath();
    ctx.arc(0, 0, e.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }

  // Eyes: every kind watches the player.
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-e.radius * 0.3, -e.radius * 0.2, 2.5, 0, Math.PI * 2);
  ctx.arc(e.radius * 0.3, -e.radius * 0.2, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Spitter wind-up: a pulsing ring says "dodge now".
  if (e.telegraph > 0) {
    ctx.strokeStyle = PALETTE.spitter;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.4 + 0.6 * (e.telegraph / 0.45);
    ctx.beginPath();
    ctx.arc(0, 0, e.radius + 10, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  // HP bar for tough enemies.
  if (e.maxHp >= 3 && e.hp < e.maxHp) {
    const w = e.radius * 2;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(e.x - w / 2, e.y - e.radius - 12, w, 5);
    ctx.fillStyle = color;
    ctx.fillRect(e.x - w / 2, e.y - e.radius - 12, w * (e.hp / e.maxHp), 5);
  }
}

function drawPlayer(ctx, player, world) {
  const blink = player.invulnLeft > 0 && Math.floor(world.time * 14) % 2 === 0;
  ctx.save();
  ctx.translate(player.x, player.y);
  if (blink) ctx.globalAlpha = 0.45;

  // Lantern glow.
  const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 70);
  glow.addColorStop(0, 'rgba(255, 201, 77, 0.35)');
  glow.addColorStop(1, 'rgba(255, 201, 77, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 70, 0, Math.PI * 2);
  ctx.fill();

  // Warden: a round keeper with a wide-brim hat.
  ctx.fillStyle = PALETTE.player;
  ctx.beginPath();
  ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8a6d2f';
  ctx.beginPath();
  ctx.ellipse(0, -4, player.radius + 6, 6, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = PALETTE.playerCore;
  ctx.beginPath();
  ctx.arc(0, 2, 6, 0, Math.PI * 2);
  ctx.fill();
  // Eyes look toward the aim.
  const aimAngle = Math.atan2(player.aimY - player.y, player.aimX - player.x);
  ctx.fillStyle = '#1a2a20';
  ctx.beginPath();
  ctx.arc(Math.cos(aimAngle) * 6 - 4, Math.sin(aimAngle) * 4 - 2, 2, 0, Math.PI * 2);
  ctx.arc(Math.cos(aimAngle) * 6 + 4, Math.sin(aimAngle) * 4 - 2, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHud(ctx, world) {
  const player = world.player;
  ctx.textBaseline = 'alphabetic';

  // Top bar.
  ctx.fillStyle = 'rgba(10, 22, 15, 0.72)';
  roundRect(ctx, 12, 10, 1256, 52, 10);
  ctx.fill();

  // Hearts.
  for (let i = 0; i < player.maxHearts; i += 1) {
    heart(ctx, 40 + i * 30, 38, 22, i < player.hearts);
  }

  // Score, wave, spores.
  ctx.fillStyle = PALETTE.text;
  ctx.font = `700 26px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${world.score}`, 250, 42);
  ctx.font = `600 20px ${FONT}`;
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText(`Best ${world.best}`, 430, 41);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `700 26px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(`Wave ${world.wave} / 10`, 640, 42);
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.spore;
  ctx.fillText(`✦ ${world.spores}`, 1240, 42);

  // Dash cooldown: a small bar under the hearts.
  const dashFrac = player.dashLeft > 0 ? 1 - player.dashLeft / player.dashCooldown : 1;
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  roundRect(ctx, 28, 50, 120, 6, 3);
  ctx.fill();
  ctx.fillStyle = dashFrac >= 1 ? PALETTE.player : PALETTE.muted;
  roundRect(ctx, 28, 50, 120 * dashFrac, 6, 3);
  ctx.fill();
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `600 12px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText('DASH [Shift]', 154, 57);

  // Wave banner.
  if (world.bannerTime > 0 && world.screen === SCREEN_PLAY) {
    const alpha = Math.min(1, world.bannerTime / 0.5);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = PALETTE.text;
    ctx.font = `800 44px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(world.banner, 640, 180);
    ctx.restore();
  }

  // Bottom hint.
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `500 14px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('WASD / arrows move · mouse aims · auto-fire · Shift dash · P pause · M mute', 640, 706);
}

function drawEntities(ctx, world) {
  // Pickups.
  for (const p of world.pickups) {
    const bob = Math.sin(world.time * 4 + p.x) * 3;
    if (p.kind === 'spore') {
      ctx.fillStyle = PALETTE.spore;
      ctx.save();
      ctx.translate(p.x, p.y + bob);
      ctx.rotate(world.time * 2 + p.x);
      ctx.fillRect(-5, -5, 10, 10);
      ctx.restore();
    } else {
      heart(ctx, p.x, p.y + bob, 26, true);
    }
  }
  // Goo blobs.
  for (const g of world.goo) {
    ctx.fillStyle = PALETTE.goo;
    ctx.beginPath();
    ctx.arc(g.x, g.y, g.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.arc(g.x - 2, g.y - 2, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  // Enemies.
  for (const e of world.enemies) drawEnemy(ctx, e);
  // Bullets.
  for (const b of world.bullets) {
    ctx.fillStyle = PALETTE.bullet;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 233, 168, 0.35)';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius + 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Player (hidden on the title screen's demo? No: the warden stands in the grove).
  drawPlayer(ctx, world.player, world);
  // Particles.
  for (const p of world.fx.particles) {
    ctx.globalAlpha = 1 - p.age / p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Floating texts.
  ctx.font = `700 16px ${FONT}`;
  ctx.textAlign = 'center';
  for (const t of world.fx.texts) {
    ctx.globalAlpha = 1 - t.age / t.life;
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}

function dim(ctx) {
  ctx.fillStyle = 'rgba(6, 14, 10, 0.66)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = PALETTE.panel;
  roundRect(ctx, x, y, w, h, 16);
  ctx.fill();
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, 16);
  ctx.stroke();
}

function drawTitle(ctx, world) {
  dim(ctx);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.text;
  ctx.font = `800 92px ${FONT}`;
  ctx.fillText('SPOREHOLD', 640, 210);
  ctx.fillStyle = PALETTE.spore;
  ctx.font = `600 26px ${FONT}`;
  ctx.fillText('Defend the last glowing grove — survive 10 waves of blight', 640, 258);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `500 19px ${FONT}`;
  ctx.fillText('WASD / arrows to move · mouse aims · bolts fire on their own', 640, 300);
  ctx.fillText('Shift to dash through danger · grab spores, spend the calm between waves', 640, 330);
  ctx.fillText('Violet spitters wind up before they shoot — the ring is your warning', 640, 360);

  const rects = buttonRects();
  ctx.fillStyle = PALETTE.player;
  roundRect(ctx, rects.start.x, rects.start.y, rects.start.w, rects.start.h, 12);
  ctx.fill();
  ctx.fillStyle = '#1a2a20';
  ctx.font = `800 26px ${FONT}`;
  ctx.fillText('▶  START THE GROVE', 640, rects.start.y + 41);

  ctx.fillStyle = PALETTE.muted;
  ctx.font = `600 18px ${FONT}`;
  ctx.fillText(world.best > 0 ? `Best score: ${world.best}` : 'No runs yet — the grove is waiting', 640, 606);
  ctx.fillText('Click or press any key to begin', 640, 636);
}

function drawUpgrade(ctx, world) {
  dim(ctx);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.text;
  ctx.font = `800 40px ${FONT}`;
  ctx.fillText(`Wave ${world.wave} cleared!`, 640, 150);
  ctx.fillStyle = PALETTE.spore;
  ctx.font = `600 24px ${FONT}`;
  ctx.fillText('Choose one blessing for the next wave', 640, 190);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `500 17px ${FONT}`;
  ctx.fillText('Click a card, or press 1, 2, 3', 640, 222);

  const n = world.upgradeOffers.length;
  const cardW = 300;
  const cardH = 190;
  const gap = 28;
  const totalW = n * cardW + (n - 1) * gap;
  const x0 = (VIEW.width - totalW) / 2;
  const y0 = 268;
  world.upgradeOffers.forEach((offer, i) => {
    const cx = x0 + i * (cardW + gap);
    ctx.fillStyle = PALETTE.card;
    roundRect(ctx, cx, y0, cardW, cardH, 14);
    ctx.fill();
    ctx.strokeStyle = PALETTE.cardEdge;
    ctx.lineWidth = 2;
    roundRect(ctx, cx, y0, cardW, cardH, 14);
    ctx.stroke();
    ctx.fillStyle = PALETTE.spore;
    ctx.font = `800 22px ${FONT}`;
    ctx.fillText(offer.name, cx + cardW / 2, y0 + 52);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `500 17px ${FONT}`;
    const words = offer.desc.split(' ');
    let line = '';
    let ly = y0 + 92;
    for (const word of words) {
      if ((line + word).length > 22) {
        ctx.fillText(line.trim(), cx + cardW / 2, ly);
        line = '';
        ly += 24;
      }
      line += `${word} `;
    }
    ctx.fillText(line.trim(), cx + cardW / 2, ly);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `600 15px ${FONT}`;
    ctx.fillText(`Level ${offer.level} / ${offer.max}  ·  [${i + 1}]`, cx + cardW / 2, y0 + cardH - 22);
  });
}

function drawPause(ctx) {
  dim(ctx);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.text;
  ctx.font = `800 56px ${FONT}`;
  ctx.fillText('PAUSED', 640, 340);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `500 20px ${FONT}`;
  ctx.fillText('Press P, Esc, or click to keep playing', 640, 386);
}

function drawEnd(ctx, world, victory) {
  dim(ctx);
  ctx.textAlign = 'center';
  ctx.fillStyle = victory ? PALETTE.spore : PALETTE.danger;
  ctx.font = `800 64px ${FONT}`;
  ctx.fillText(victory ? 'THE GROVE BLOOMS!' : 'THE GROVE DIMS', 640, 220);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `600 24px ${FONT}`;
  ctx.fillText(
    victory ? 'Ten waves of blight, turned back. The spores sing again.'
      : 'The blight overran the clearing — but the spores remember you.',
    640, 268,
  );

  panel(ctx, 440, 300, 400, 180);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `700 24px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText('Score', 470, 348);
  ctx.fillText('Best', 470, 388);
  ctx.fillText('Waves cleared', 470, 428);
  ctx.fillText('Blight slain', 470, 468);
  ctx.textAlign = 'right';
  ctx.fillText(String(world.score), 810, 348);
  ctx.fillText(String(world.best), 810, 388);
  ctx.fillText(String(victory ? 10 : world.wave - 1), 810, 428);
  ctx.fillText(String(world.kills), 810, 468);
  ctx.textAlign = 'center';

  const rects = buttonRects();
  ctx.fillStyle = PALETTE.player;
  roundRect(ctx, rects.again.x, rects.again.y, rects.again.w, rects.again.h, 12);
  ctx.fill();
  ctx.fillStyle = '#1a2a20';
  ctx.font = `800 26px ${FONT}`;
  ctx.fillText('↻  PLAY AGAIN', 640, rects.again.y + 41);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `500 17px ${FONT}`;
  ctx.fillText('or press R', 640, rects.again.y + 96);
}

/** Draw one frame: world + HUD + the current screen's overlay. */
export function draw(ctx, world) {
  ctx.save();
  const off = shakeOffset(world.fx);
  ctx.translate(off.x, off.y);
  drawBackground(ctx, world);
  drawEntities(ctx, world);
  ctx.restore();
  drawHud(ctx, world);
  if (world.screen === SCREEN_TITLE) drawTitle(ctx, world);
  else if (world.screen === SCREEN_UPGRADE) drawUpgrade(ctx, world);
  else if (world.screen === SCREEN_PAUSE) drawPause(ctx);
  else if (world.screen === SCREEN_OVER) drawEnd(ctx, world, false);
  else if (world.screen === SCREEN_VICTORY) drawEnd(ctx, world, true);
}
