// Every tuning number and colour in one place. The playfield is a fixed 1280x720 logical
// area; the renderer scales it to the window, so no rule below depends on the screen size.
export const FIELD = { width: 1280, height: 720 };

// The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate.
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 16,
  speed: 300,
  hearts: 3,
  maxHearts: 6,
  fireInterval: 0.22, // seconds between shots
  bulletSpeed: 640,
  bulletDamage: 1,
  bulletRadius: 5,
  bulletRange: 520, // pixels a bolt travels before fading
  pickupRadius: 70,
  dashSpeed: 900,
  dashTime: 0.16,
  dashCooldown: 2.4,
  invulnerable: 1.2, // seconds of mercy after taking a hit
};

export const ENEMIES = {
  mite: { radius: 14, hp: 2, speed: 132, score: 10, touch: 1, spores: 2 },
  spitter: { radius: 16, hp: 3, speed: 92, score: 25, touch: 1, spores: 3, range: 300, shootInterval: 2.3 },
  splitter: { radius: 18, hp: 3, speed: 102, score: 20, touch: 1, spores: 3 },
  brute: { radius: 30, hp: 14, speed: 56, score: 100, touch: 1, spores: 6, heartChance: 0.3 },
};

// Speed grows a little each wave so late waves stay dangerous.
export const WAVE_SPEED_PER_LEVEL = 0.045;

export const GOO = { radius: 7, speed: 300, damage: 1 };

// Waves 1..10: how many of each kind spawn, and how fast they trickle in.
export const WAVES = [
  { mite: 6, spitter: 0, splitter: 0, brute: 0, interval: 0.8 },
  { mite: 10, spitter: 2, splitter: 0, brute: 0, interval: 0.7 },
  { mite: 12, spitter: 4, splitter: 2, brute: 0, interval: 0.65 },
  { mite: 14, spitter: 6, splitter: 4, brute: 0, interval: 0.6 },
  { mite: 10, spitter: 8, splitter: 6, brute: 1, interval: 0.55 },
  { mite: 16, spitter: 8, splitter: 6, brute: 2, interval: 0.5 },
  { mite: 18, spitter: 10, splitter: 8, brute: 2, interval: 0.48 },
  { mite: 20, spitter: 12, splitter: 8, brute: 3, interval: 0.45 },
  { mite: 22, spitter: 12, splitter: 10, brute: 4, interval: 0.42 },
  { mite: 24, spitter: 14, splitter: 10, brute: 5, interval: 0.4 },
];
export const LAST_WAVE = WAVES.length;

export const SCORES = { spore: 5, waveClearBonus: 50 };

// Upgrades offered between waves: pick one of three. Each stacks to 3.
export const UPGRADES = [
  { id: 'rapid', name: 'Rapid Spores', max: 3, desc: 'Shoot 22% faster', apply: (p) => { p.fireInterval *= 0.82; } },
  { id: 'twin', name: 'Twin Bloom', max: 2, desc: '+1 bolt per shot', apply: (p) => { p.shots += 1; } },
  { id: 'swift', name: 'Swift Boots', max: 3, desc: 'Move 12% faster', apply: (p) => { p.speed *= 1.12; } },
  { id: 'thick', name: 'Thick Cap', max: 3, desc: '+1 max heart, heal 1', apply: (p) => { p.maxHearts = Math.min(6, p.maxHearts + 1); p.hearts = Math.min(p.maxHearts, p.hearts + 1); } },
  { id: 'magnet', name: 'Spore Magnet', max: 3, desc: 'Pickups fly to you', apply: (p) => { p.pickupRadius *= 1.6; } },
  { id: 'longshot', name: 'Longshot', max: 3, desc: 'Bolts fly 25% farther', apply: (p) => { p.bulletRange *= 1.25; p.bulletSpeed *= 1.1; } },
  { id: 'dash', name: 'Quick Dash', max: 3, desc: 'Dash recharges 25% faster', apply: (p) => { p.dashCooldown *= 0.75; } },
];

export const PALETTE = {
  backdrop: '#0c1a13',
  floor: '#10241a',
  groveRing: '#1d3a2a',
  groveRingGlow: '#2e5c40',
  text: '#f2f5ef',
  muted: '#9fb3a4',
  panel: '#132a1f',
  panelEdge: '#2e5c40',
  player: '#ffc94d',
  playerCore: '#fff3c4',
  bullet: '#ffe9a8',
  mite: '#ff8a3d',
  spitter: '#b78cff',
  splitter: '#3ddbd9',
  brute: '#ff5d73',
  goo: '#c9a0ff',
  spore: '#ffd76a',
  heart: '#ff6b81',
  danger: '#ff5d73',
  card: '#173626',
  cardEdge: '#4a7a5c',
  cardHot: '#2a5a40',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'sporehold.best';

/** Fixed logical size the renderer scales from; screenshots are taken at this size. */
export const VIEW = { width: 1280, height: 720 };
