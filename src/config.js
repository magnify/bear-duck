/**
 * Bear Duck — game constants and progression formulas.
 * Single source of truth: no magic numbers in game code.
 */

export const TILE = 48;
export const COLS = 20;
export const ROWS = 15;
export const WIDTH = COLS * TILE;   // 960
export const HEIGHT = ROWS * TILE;  // 720

export const MAX_LEVEL = 20;
export const START_LIVES = 3;

// Player
export const DUCK_SPEED = 230;        // px/s
export const DUCK_RADIUS = 16;        // collision radius
export const PECK_RANGE = 64;         // px, distance to peck a bear / push a bomb
export const PECK_COOLDOWN = 0.3;     // s
export const FLY_DURATION = 5;        // s

// Bears
export const BEAR_RADIUS = 18;
export const BEAR_BASE_SPEED = 55;    // px/s while wandering, level 1
export const BEAR_SPEED_GROWTH = 1.1; // +10% per level
export const BEAR_ANGRY_MULT = 1.9;   // angry bears chase this much faster
export const BEAR_MAX_SPEED = 210;    // angry speed cap (duck stays faster)
export const GRACE_PERIOD = 1.0;      // s after a peck before an angry bear can hurt you
export const DROPS_PER_PECK = 2;      // items scattered per peck
export const BOSS_HP = 3;
export const BOSS_DEFEAT_DROPS = 6;   // item burst when the boss goes down

// Bombs
export const BOMB_RADIUS = 14;
export const BOMB_SLIDE_SPEED = 420;  // px/s for a pushed bomb
export const EXPLOSION_RADIUS = 1.6;  // in tiles, walls destroyed / damage dealt

// Power-up
export const FLY_LEVELS = new Set([3, 7, 11, 15, 19]);

// Timing
export const LEVEL_CLEAR_PAUSE = 2.2; // s banner before next level
export const DEATH_PAUSE = 1.6;       // s before respawn

/** Items required to clear a level: 6 on level 1, +1 per level, capped at 15. */
export function getItemsNeeded(level) {
  return Math.min(6 + (level - 1), 15);
}

/** Bears on a level: start with 1, +1 every 4 levels (max 6). Level 20 = 4 + boss. */
export function getBearCount(level) {
  if (level === MAX_LEVEL) return 5;
  return Math.min(1 + Math.floor((level - 1) / 4), 6);
}

/** Wander speed for bears on a level (angry multiplier applied separately). */
export function getBearSpeed(level) {
  return Math.min(
    BEAR_BASE_SPEED * Math.pow(BEAR_SPEED_GROWTH, level - 1),
    BEAR_MAX_SPEED / BEAR_ANGRY_MULT
  );
}

/**
 * Items each bear carries. Total across all bears always exceeds the level
 * goal so a level can never become unwinnable.
 */
export function getItemsPerBear(level) {
  const bears = getBearCount(level);
  return Math.ceil(getItemsNeeded(level) / bears) + 1;
}

/** Interior wall tiles to scatter — more maze each level. */
export function getWallBudget(level) {
  return Math.min(10 + level * 3, 64);
}

/** Armed (deadly, flashing) bombs on a level. */
export function getArmedBombCount(level) {
  if (level < 2) return 0;
  return Math.min(1 + Math.floor(level / 6), 4);
}

/** Pushable (gray) bombs on a level — shove them into walls to blast through. */
export function getPushBombCount(level) {
  if (level < 4) return 0;
  return 1 + (level % 2 === 0 ? 1 : 0);
}

export const COLORS = {
  grass: '#3a6b35',
  grassLight: '#447a3e',
  hudText: '#f5f1e3',
  hudDim: '#9aa3b2',
  honey: '#f0b429',
  salmon: '#f08080',
  danger: '#e74c3c',
  fly: '#4dd0e1',
  night: 'rgba(10, 14, 20, 0.82)',
};
