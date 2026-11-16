// Particles, floating score text and screen shake. Purely cosmetic: nothing here
// changes the rules, so the shot scenes can run it without affecting the outcome.

export function makeFx() {
  return { particles: [], texts: [], shake: 0, shakeTime: 0 };
}

export function addShake(fx, amount, seconds) {
  fx.shake = Math.max(fx.shake, amount);
  fx.shakeTime = Math.max(fx.shakeTime, seconds);
}

export function burst(fx, x, y, color, count, speed) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const v = speed * (0.3 + Math.random() * 0.7);
    fx.particles.push({
      x, y,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v,
      life: 0.45 + Math.random() * 0.35,
      age: 0,
      size: 2 + Math.random() * 3.5,
      color,
    });
  }
}

export function floatText(fx, x, y, text, color) {
  fx.texts.push({ x, y, text, color, age: 0, life: 0.9 });
}

export function stepFx(fx, dt) {
  for (let i = fx.particles.length - 1; i >= 0; i -= 1) {
    const p = fx.particles[i];
    p.age += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.94;
    p.vy *= 0.94;
    if (p.age >= p.life) fx.particles.splice(i, 1);
  }
  for (let i = fx.texts.length - 1; i >= 0; i -= 1) {
    const t = fx.texts[i];
    t.age += dt;
    t.y -= 42 * dt;
    if (t.age >= t.life) fx.texts.splice(i, 1);
  }
  if (fx.shakeTime > 0) {
    fx.shakeTime -= dt;
    if (fx.shakeTime <= 0) fx.shake = 0;
  }
}

/** Current shake offset (0,0 when calm). */
export function shakeOffset(fx) {
  if (fx.shake <= 0) return { x: 0, y: 0 };
  return {
    x: (Math.random() * 2 - 1) * fx.shake,
    y: (Math.random() * 2 - 1) * fx.shake,
  };
}
