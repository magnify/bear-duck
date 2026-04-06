/**
 * Bear Duck Game - Design System
 *
 * All game constants, sizing, and visual specs defined in one place.
 * Base unit: 16px (1 grid unit)
 */

// ============================================================================
// GRID & SPACING
// ============================================================================
export const GRID_UNIT = 16; // Base unit for all measurements
export const GAME_WIDTH = 640;
export const GAME_HEIGHT = 480;

// ============================================================================
// SPRITE SIZING
// ============================================================================
// Kenney sprites are 128x128px, we scale them down to fit our grid
export const SPRITE_SCALES = {
  player: 0.5,        // Duck: 128 * 0.5 = 64px (4 grid units)
  bear: 0.6,          // Bear: 128 * 0.6 = ~77px (~5 grid units)
  bearBoss: 0.8,      // Boss: 128 * 0.8 = ~102px (~6 grid units)
  item: 1.0,          // Items use custom sizes (circles/shapes)
  obstacle: 1.0,      // Obstacles use custom sizes (rectangles)
};

// ============================================================================
// ENTITY SIZES (in pixels)
// ============================================================================
export const ENTITY_SIZES = {
  // Characters
  player: {
    width: 64,
    height: 64,
    collisionRadius: 24, // Smaller hitbox for fairness
  },
  bear: {
    width: 77,
    height: 77,
    collisionRadius: 32,
  },
  bearBoss: {
    width: 102,
    height: 102,
    collisionRadius: 40,
  },

  // Items
  item: {
    radius: 8,
    collisionRadius: 12, // Slightly larger for easier collection
  },

  // Obstacles
  obstacle: {
    minWidth: 30,
    maxWidth: 80,
    minHeight: 30,
    maxHeight: 80,
  },

  // Bombs
  bomb: {
    radius: 10,
    collisionRadius: 12,
  },

  // Power-ups
  powerup: {
    size: 24, // Diamond size
    collisionRadius: 16,
  },
};

// ============================================================================
// GAMEPLAY CONSTANTS
// ============================================================================
export const MOVEMENT = {
  playerSpeed: 120,
  bearSpeed: 60,
  bombPushSpeed: 80,
};

export const INTERACTION = {
  peckRange: 32,           // How close to be to peck
  angerGracePeriod: 1.0,   // Seconds of invincibility after pecking
  flyDuration: 5.0,        // Seconds of flying
};

export const PROGRESSION = {
  baseItemsNeeded: 5,      // Level 1 needs this many items
  maxItemsNeeded: 15,      // Cap at this many items
  bearSpeedIncrement: 0.1, // 10% faster each level
  bossLevel: 20,           // Final boss level

  // Bears per level formula: 1 + floor(level / 4)
  baseBearCount: 1,
  bearIncrementEvery: 4,
  maxBears: 6,

  // Boss level specifics
  bossBearCount: 5,        // 4 small + 1 boss
  bossHP: 3,
};

// ============================================================================
// LEVEL GENERATION
// ============================================================================
export const LEVEL_GEN = {
  obstacleBaseCount: 5,
  obstacleIncrement: 2,     // +2 obstacles per level
  maxObstacles: 40,

  bombCountDivisor: 3,      // floor(level / 3) bombs
  maxBombs: 5,

  powerupEveryNLevels: 4,   // Flying power-up on levels 3, 7, 11, etc.

  // Safe spawn margins
  marginX: 80,
  marginY: 80,
};

// ============================================================================
// COLORS
// ============================================================================
export const COLORS = {
  // Backgrounds
  background: [20, 20, 46],      // Dark blue
  grass: [34, 139, 34],          // Forest green

  // Entities
  duck: [255, 255, 255],         // White tint (no tint)
  bear: [255, 255, 255],         // White tint (no tint)
  bearAngry: [180, 0, 0],        // Red tint
  bearBoss: [255, 255, 255],     // White tint

  // Items
  honey: [255, 193, 7],          // Golden yellow
  salmon: [255, 105, 180],       // Pink

  // Obstacles
  wall: [80, 80, 80],            // Dark gray

  // Bombs
  bombArmed: [255, 0, 0],        // Red
  bombUnarmed: [100, 100, 100],  // Gray
  bombFlash: [255, 150, 0],      // Orange (pulsing)

  // Power-ups
  powerup: [0, 255, 255],        // Cyan

  // Effects
  flyingTint: [150, 200, 255],   // Light cyan tint
  explosion: [255, 100, 0],      // Orange

  // UI
  uiText: [255, 255, 255],       // White
  uiAccent: [255, 215, 0],       // Gold
};

// ============================================================================
// TYPOGRAPHY
// ============================================================================
export const TEXT = {
  sizes: {
    title: 48,
    heading: 32,
    subheading: 20,
    body: 16,
    ui: 20,
    feedback: 16,
    small: 12,
  },

  positions: {
    uiPadding: 12,
    lineHeight: 28,
  },
};

// ============================================================================
// ANIMATION & TIMING
// ============================================================================
export const ANIMATION = {
  powerupRotationSpeed: 90,  // degrees per second
  bombFlashSpeed: 5,         // pulses per second
  flyingPulseSpeed: 10,      // pulses per second

  feedbackDuration: 0.5,     // seconds for "PECK!" text
  feedbackMoveSpeed: 50,     // pixels per second upward

  explosionDuration: 0.3,    // seconds for explosion effect
};

// ============================================================================
// Z-INDEX LAYERS
// ============================================================================
export const Z_INDEX = {
  background: -1,
  obstacles: 0,
  items: 5,
  bombs: 5,
  powerups: 5,
  bears: 8,
  player: 10,
  effects: 15,
  ui: 100,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate items needed for a given level
 */
export function getItemsNeeded(level) {
  return Math.min(
    PROGRESSION.baseItemsNeeded + level,
    PROGRESSION.maxItemsNeeded
  );
}

/**
 * Calculate number of bears for a given level
 */
export function getBearCount(level, isBossLevel) {
  if (isBossLevel) return PROGRESSION.bossBearCount;

  return Math.min(
    PROGRESSION.baseBearCount + Math.floor(level / PROGRESSION.bearIncrementEvery),
    PROGRESSION.maxBears
  );
}

/**
 * Calculate bear speed for a given level
 */
export function getBearSpeed(level, isBoss) {
  const multiplier = 1 + (level * PROGRESSION.bearSpeedIncrement);
  const speed = MOVEMENT.bearSpeed * multiplier;
  return isBoss ? speed * 0.8 : speed; // Boss is 20% slower
}

/**
 * Calculate items per bear to ensure level is completable
 */
export function getItemsPerBear(itemsNeeded, bearCount) {
  return Math.ceil(itemsNeeded / bearCount);
}

/**
 * Calculate number of obstacles for a given level
 */
export function getObstacleCount(level) {
  return Math.min(
    LEVEL_GEN.obstacleBaseCount + (level * LEVEL_GEN.obstacleIncrement),
    LEVEL_GEN.maxObstacles
  );
}

/**
 * Calculate number of bombs for a given level
 */
export function getBombCount(level) {
  return Math.min(
    Math.floor(level / LEVEL_GEN.bombCountDivisor),
    LEVEL_GEN.maxBombs
  );
}

/**
 * Check if level should have a flying power-up
 */
export function hasPowerup(level) {
  return level >= 3 && level % LEVEL_GEN.powerupEveryNLevels === 0;
}
