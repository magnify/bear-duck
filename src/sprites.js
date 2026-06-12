/**
 * Procedural pixel art. Every sprite is a 16x16 character map rendered once
 * to an offscreen canvas — no image assets, the whole look is generated here.
 */

const SCALE = 3; // 16px maps drawn at 48px

function bake(rows, palette) {
  const size = rows.length * SCALE;
  const canvas = document.createElement('canvas');
  canvas.width = rows[0].length * SCALE;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const color = palette[row[x]];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
    }
  });
  return canvas;
}

// ---------------------------------------------------------------------------
// Maps (16 columns, '.' = transparent). All face right.
// ---------------------------------------------------------------------------

const DUCK_MAP = [
  '................',
  '......YYYY......',
  '.....YYYYYY.....',
  '.....YYKYYY.....',
  '.....YYYYYYOO...',
  '.....YYYYYYOO...',
  '..Y..YYYYYY.....',
  '..YY.WWYYYY.....',
  '..YYWWWYYYYY....',
  '..YYWWWYYYYYY...',
  '..YYYWWYYYYYY...',
  '...YYYYYYYYYY...',
  '....YYYYYYYY....',
  '......OO..OO....',
  '.....OO...OO....',
  '................',
];

const BEAR_MAP = [
  '..DD......DD....',
  '.DBBD....DBBD...',
  '.DBBD....DBBD...',
  '..BBBBBBBBBB....',
  '.BBBBBBBBBBBB...',
  '.BBKBBBBBBKBB...',
  '.BBBBMMMMBBBB...',
  '.BBBBMKKMBBBB...',
  '..BBBBMMBBBB....',
  '.BBBBBBBBBBBB...',
  'BBBBBBBBBBBBBB..',
  'BBBBBBBBBBBBBB..',
  '.BBBBBBBBBBBB...',
  '..BBB.BBBB.BB...',
  '..DDD.DDDD.DD...',
  '................',
];

const HONEY_MAP = [
  '................',
  '................',
  '......LLLL......',
  '.....LLLLLL.....',
  '....HHHHHHHH....',
  '...HHHHHHHHHH...',
  '...HHhHHHHHHH...',
  '...HHhHHHHHHH...',
  '...HHhHHHHHHH...',
  '...HHHHHHHHHH...',
  '....HHHHHHHH....',
  '.....hhhhhh.....',
  '................',
  '................',
  '................',
  '................',
];

const SALMON_MAP = [
  '................',
  '................',
  '................',
  '................',
  '..p.....PPPP....',
  '..pp..PPPPPPP...',
  '..pppPPPPKPPP...',
  '..ppPPPPPPPPPP..',
  '..ppPPPPPPPPP...',
  '..pp..PPPPPP....',
  '..p.....PPPP....',
  '................',
  '................',
  '................',
  '................',
  '................',
];

const ROCK_MAP = [
  'rrrrrrrrrrrrrrrr',
  'rRRRRRRRRRRRRRdr',
  'rRRRRRrRRRRRRRdr',
  'rRRRRRRRRRRRRRdr',
  'rRRrRRRRRRrRRRdr',
  'rRRRRRRRRRRRRRdr',
  'rRRRRRRRRRRRRRdr',
  'rRRRRRRrRRRRRRdr',
  'rRRRRRRRRRRRRRdr',
  'rRRrRRRRRRRRrRdr',
  'rRRRRRRRRRRRRRdr',
  'rRRRRRrRRRRRRRdr',
  'rRRRRRRRRRRrRRdr',
  'rRRRRRRRRRRRRRdr',
  'rRdddddddddddddr',
  'rrrrrrrrrrrrrrrr',
];

const BOMB_MAP = [
  '................',
  '..........FF....',
  '.........FF.....',
  '........FF......',
  '.......SS.......',
  '.....KKKKKK.....',
  '....KKKKKKKK....',
  '...KKWKKKKKKK...',
  '...KWKKKKKKKK...',
  '...KKKKKKKKKK...',
  '...KKKKKKKKKK...',
  '...KKKKKKKKKK...',
  '....KKKKKKKK....',
  '.....KKKKKK.....',
  '................',
  '................',
];

const DIAMOND_MAP = [
  '................',
  '.......CC.......',
  '......CCCC......',
  '.....CCWWCC.....',
  '....CCWWCCCC....',
  '...CCWWCCCCCC...',
  '..CCCCCCCCCCcc..',
  '.CCCCCCCCCCcccc.',
  '.CCCCCCCCCCcccc.',
  '..CCCCCCCCCCcc..',
  '...CCCCCCCCcc...',
  '....CCCCCCcc....',
  '.....CCCCcc.....',
  '......CCcc......',
  '.......Cc.......',
  '................',
];

// ---------------------------------------------------------------------------
// Palettes
// ---------------------------------------------------------------------------

const duckPalette = { Y: '#f4d03f', O: '#e67e22', K: '#1d1d1d', W: '#fdf6d8' };
const bearPalette = { B: '#8d5a2b', D: '#5d3a1a', M: '#c9996b', K: '#1d1d1d' };
const angryPalette = { B: '#b53a2e', D: '#7a221a', M: '#d97f6c', K: '#1d1d1d' };
const honeyPalette = { H: '#f0b429', h: '#c98a0e', L: '#f7e08a' };
const salmonPalette = { P: '#f08080', p: '#d96a6a', K: '#1d1d1d' };
const rockPalette = { R: '#7f8c8d', r: '#9aa7a8', d: '#5d6d6e' };
const bombArmedPalette = { K: '#3a3a3a', W: '#6a6a6a', F: '#b5651d', S: '#ffd34d' };
const bombGrayPalette = { K: '#707a82', W: '#9aa4ac', F: '#55606a', S: '#55606a' };
const diamondPalette = { C: '#4dd0e1', c: '#26a6b8', W: '#e0fbff' };

export function buildSprites() {
  return {
    duck: bake(DUCK_MAP, duckPalette),
    bear: bake(BEAR_MAP, bearPalette),
    bearAngry: bake(BEAR_MAP, angryPalette),
    honey: bake(HONEY_MAP, honeyPalette),
    salmon: bake(SALMON_MAP, salmonPalette),
    rock: bake(ROCK_MAP, rockPalette),
    bombArmed: bake(BOMB_MAP, bombArmedPalette),
    bombGray: bake(BOMB_MAP, bombGrayPalette),
    diamond: bake(DIAMOND_MAP, diamondPalette),
  };
}

/**
 * Pre-render the grass field for a level so the per-frame draw is one blit.
 * Subtle checkering plus seeded speckles so each level looks a bit different.
 */
export function bakeBackground(width, height, tile, seed, colors) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  for (let r = 0; r < height / tile; r++) {
    for (let c = 0; c < width / tile; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? colors.grass : colors.grassLight;
      ctx.fillRect(c * tile, r * tile, tile, tile);
    }
  }

  // Cheap deterministic PRNG (mulberry32) so speckles are stable per level.
  let s = seed >>> 0;
  const rand = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  ctx.fillStyle = 'rgba(255, 255, 220, 0.12)';
  for (let i = 0; i < 140; i++) {
    ctx.fillRect(Math.floor(rand() * width), Math.floor(rand() * height), 3, 3);
  }
  ctx.fillStyle = 'rgba(0, 0, 0, 0.10)';
  for (let i = 0; i < 90; i++) {
    ctx.fillRect(Math.floor(rand() * width), Math.floor(rand() * height), 4, 4);
  }
  return canvas;
}
