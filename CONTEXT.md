# Bear Duck — Development Context

## Project Overview
A retro 2D pixel art game where a duck runs a salmon & honey sandwich shop and
collects ingredients by pecking bears.

**Story:** Duck has bee friends who want their honey back. Duck needs salmon
for its sandwich shop, where it sells salmon & honey sandwiches.

## v2: Full from-scratch rewrite (this branch)
The game was rebuilt from scratch, reusing only the idea — no code or assets
were carried over from the Kaboom.js version on `master`.

- **Zero runtime dependencies.** Raw `<canvas>` 2D API, `requestAnimationFrame`
  game loop. Kaboom.js (deprecated) is gone.
- **No image assets.** All sprites are 16×16 pixel maps baked to offscreen
  canvases at startup (`src/sprites.js`). The Kenney asset packs were removed.
- **No audio assets.** Sound effects are synthesized with WebAudio oscillators
  and noise buffers (`src/audio.js`).
- **Generated levels.** Random wall clusters, flood-filled from spawn so every
  open tile is always reachable (`src/level.js`).

## Game Mechanics (same idea as v1)
1. **Peck bears** (spacebar) → they drop honey/salmon items
2. **Collect items** → progress toward the level goal
3. **Avoid angry bears** — pecked bears turn red and chase you (1s grace period to escape)
4. **Gray bombs** — shove them (spacebar) into walls to blast passages open
5. **Armed bombs** — red, flashing: touching one is instant death
6. **Flying power-up** (cyan diamond) on levels 3, 7, 11, 15, 19 — fly over everything for 5s
7. **Boss bear** on level 20 — double size, 3 pecks to defeat, drops an item burst
8. **3 lives** — getting caught respawns you on the current (re-rolled) level

## Progression
- Items needed: 6 on level 1, +1 per level, capped at 15
- Bears: 1 to start, +1 every 4 levels (max 6); level 20 = 4 bears + boss
- Bears get 10% faster per level (angry speed capped below duck speed)
- More walls/maze each level; bombs appear from level 2 (armed) / 4 (pushable)
- Each bear carries `ceil(needed / bears) + 1` items, so the total dropped
  always exceeds the goal — levels can't become unwinnable
- Bomb blasts also defeat bears, who drop everything they carry

## Controls
- **Arrow keys / WASD:** move
- **Spacebar:** peck bear / shove bomb
- **Enter:** start / restart

## Tech
- Vanilla ES modules + HTML5 canvas (no framework)
- **Build tool:** Vite (dev-only dependency)
- **Dev server:** `npm run dev` → http://localhost:5173

## File Structure
```
bear-duck/
├── index.html        # Canvas container
├── package.json
├── src/
│   ├── config.js     # All constants + progression formulas (single source of truth)
│   ├── sprites.js    # Procedural pixel art + background baking
│   ├── audio.js      # WebAudio-synthesized sound effects
│   ├── level.js      # Grid generation, flood fill, entity placement
│   └── main.js       # Game loop, entities, states, rendering, HUD
└── CONTEXT.md        # This file
```

## Commands
```bash
npm install    # Install dev dependencies (vite only)
npm run dev    # Start dev server
npm run build  # Production build to dist/
npm run preview
```

## Repository
- **GitHub:** https://github.com/magnify/bear-duck
- v1 (Kaboom.js) lives on `master`; the rewrite is on `claude/game-from-scratch-3jdnzr`

---
*Last updated: 2026-06-12*
