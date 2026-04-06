# Bear Duck - Development Context

## Project Overview
A retro 2D pixel art game where a duck runs a salmon & honey sandwich shop and needs to collect ingredients by pecking bears.

**Story:** Duck has bee friends who want honey back. Duck needs salmon for its sandwich shop where it sells sandwiches with salmon and honey (gets a bit of honey from bees for sandwiches).

## Current Status: ✅ Core Gameplay Complete

### What's Working
- ✅ Top-down Zelda-style movement (arrow keys)
- ✅ Peck mechanic (spacebar) - peck bears to make them drop items
- ✅ Bears become angry after being pecked (turn red, chase player, faster)
- ✅ 1-second grace period after pecking to escape
- ✅ Item collection system (honey & salmon)
- ✅ 20 levels with scaling difficulty
- ✅ Multiple bears per level (scales with level)
- ✅ Obstacles/maze walls (bears bounce off them)
- ✅ Bombs: red flashing = armed (avoid!), gray = unarmed (push into walls to explode)
- ✅ Flying power-up (cyan diamond, fly over obstacles for 5 seconds)
- ✅ Boss bear on level 20 (bigger, takes 3 pecks, drops lots of items)
- ✅ Game over on angry bear collision or armed bomb
- ✅ Victory screen after level 20
- ✅ Item drop math fixed - each bear drops correct amount to complete level
- ✅ Items won't spawn inside walls

### Tech Stack
- **Framework:** Kaboom.js (note: deprecated, successor is KAPLAY)
- **Build tool:** Vite
- **Dev server:** `npm run dev` → http://localhost:5173

### Game Mechanics
1. **Peck bears** → they drop honey/salmon items
2. **Collect items** → progress toward level goal
3. **Avoid angry bears** (they chase you after being pecked)
4. **Use bombs** to destroy obstacles (push gray bombs into walls)
5. **Avoid armed bombs** (red flashing = instant death)
6. **Flying power-up** on levels 3, 7, 11, 15, 19 (fly over obstacles)

### Progression System
- **Items needed:** Level 1 = 6 items, scales up to max 15 items
- **Bears:** Start with 1, +1 every 4 levels (max 6)
- **Bear speed:** 10% faster each level
- **Obstacles:** More walls/maze complexity each level
- **Level 20:** Boss level with 5 small bears + 1 big boss bear (3 HP)

### Current Placeholders (Need Pixel Art)
- Duck = yellow square
- Bear = brown square (red when angry, bigger boss bear)
- Honey = yellow circle
- Salmon = pink circle
- Obstacles = gray rectangles
- Bombs = red/gray circles
- Power-up = cyan rotating diamond

### Controls
- **Arrow Keys:** Move duck
- **Spacebar:** Peck bear / Push bomb

## Next Steps (Task #8 Pending)
1. **Find pixel art assets** from:
   - [Kenney.nl](https://kenney.nl/assets) - 60k+ free assets, CC0
   - [itch.io duck sprites](https://itch.io/game-assets/tag-duck/tag-pixel-art)
   - [CraftPix freebies](https://craftpix.net/freebies/)

2. **Replace placeholders** with actual sprites
3. **Add sound effects** (peck, collect, explosion, game over)
4. **Polish:** particle effects, screen shake, better UI
5. **Consider migration** to KAPLAY (Kaboom successor)

## Known Issues / Design Decisions
- ✅ FIXED: Bears walking through walls → now bounce off
- ✅ FIXED: Instant game over after peck → 1-second grace period
- ✅ FIXED: Not enough items to win → dynamic item drops per bear
- ✅ FIXED: Items spawning in walls → collision check with retries
- Grace period shows visually (bear turns red but won't hurt you for 1 sec)

## Repository
- **GitHub:** https://github.com/magnify/bear-duck
- **Branch:** master
- **All code committed and pushed** ✅

## Child Producer Feedback Incorporated
- Bombs mechanic (armed vs unarmed)
- Flying ability
- Multiple small bears + big boss bear
- Angry bear chase mechanic
- Pecking animation/feedback

## File Structure
```
bear-duck/
├── index.html          # Game container
├── package.json        # Dependencies
├── src/
│   └── main.js        # All game logic (600+ lines)
├── .gitignore
└── CONTEXT.md         # This file
```

## Commands
```bash
npm install           # Install dependencies
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
```

## Game Balance Notes
- Level 1: 1 bear, 6 items needed
- Level 5: 2 bears, 10 items needed
- Level 10: 3 bears, 15 items needed (caps at 15)
- Level 20: 5 bears (4 small + 1 boss), 15 items needed

Boss bear drops items equal to itemsPerBear on defeat.

---
*Last updated: 2026-04-06*
*Dev server running on port 5173*
