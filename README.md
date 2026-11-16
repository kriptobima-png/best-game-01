# best-game-01

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/kriptobima-png/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/kriptobima-png/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**Sporehold** — defend the last glowing grove. A top-down arena survival game: you are
the warden of the last spore-grove, and the blight creeps in from the dark edges. Survive
10 waves, pick a blessing between waves, and see the grove bloom — or watch it dim.

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no libraries, no network: plain static files (`game/`), Node 22 only.
`main.ts` hands the entry in (`MAKEFUN_OUTPUT_DIR=out node main.ts` outside the grader).

## How it plays

- **Move** WASD / arrows · **aim** mouse · bolts fire on their own · **Shift** dash
  through danger · **P** pause · **M** mute · **R** play again.
- **Four kinds of blight**, told apart by shape and colour: chasing **mites** (triangles),
  **spitters** (rings) that wind up with a visible ring before lobbing goo, **splitters**
  (diamonds) that divide into two mites, and big **brutes** (hexagons) that sometimes
  drop a heart.
- **Between waves**, pick 1 of 3 blessings: faster shots, twin bolts, swift boots,
  a thicker cap (+1 max heart), a spore magnet, longer shots, or a quicker dash.
  Each stacks to 3.
- **Score** from kills, wave-clear bonuses and golden spores; best score is kept in
  the browser. Clear wave 10 and the grove blooms — victory screen, stats, play again.
- **Feel:** particles on every hit, screen shake, floating score text, a dash trail,
  and synthesized WebAudio sound effects plus a quiet pentatonic pad — no audio files.

## Structure

- `game/src/config.js` — all tuning numbers, palette, wave tables, upgrade defs
- `game/src/world.js` — screens, waves, collisions, scoring, win/lose rules
- `game/src/player.js` — movement, auto-fire, dash
- `game/src/enemies.js` — the four blight kinds and their steering
- `game/src/bullets.js` / `game/src/pickups.js` — projectiles and drops
- `game/src/particles.js` — particles, floating text, screen shake
- `game/src/render.js` — everything drawn: grove, entities, HUD, menus
- `game/src/upgrades.js` — the between-wave draft
- `game/src/audio.js` — synthesized SFX + music, no files
- `game/src/input.js` — keyboard + mouse, mapped to the 1280×720 field
- `game/src/shots.js` — the deterministic screenshot scenes (`?shot=…`)
- `game/src/random.js` — seeded RNG so screenshots are reproducible
- `game/src/main.js` — boot + fixed 60 Hz loop

Screenshots in `screenshots/` are real renders of the game's own code, staged by
`shots.js`: title, mid-wave play, the upgrade draft, and the victory screen.

---

<sub>Entered on [make.fun](https://make.fun/?ref=fsfzvhfq&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
