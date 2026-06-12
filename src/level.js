/**
 * Level generation: a tile grid with border walls plus random interior
 * wall clusters, flood-filled from the duck's spawn so every open tile
 * is guaranteed reachable. Also picks spawn spots for bears, bombs and
 * the flying power-up on the open tiles.
 */

import * as C from './config.js';

const WALL = 1;
const FLOOR = 0;

export function generateLevel(level) {
  const grid = new Uint8Array(C.ROWS * C.COLS);
  const idx = (r, c) => r * C.COLS + c;

  // Border walls
  for (let c = 0; c < C.COLS; c++) {
    grid[idx(0, c)] = WALL;
    grid[idx(C.ROWS - 1, c)] = WALL;
  }
  for (let r = 0; r < C.ROWS; r++) {
    grid[idx(r, 0)] = WALL;
    grid[idx(r, C.COLS - 1)] = WALL;
  }

  const spawn = { r: C.ROWS - 3, c: Math.floor(C.COLS / 2) };

  // Scatter wall clusters with short random walks, keeping clear of spawn.
  let budget = C.getWallBudget(level);
  let guard = 500;
  while (budget > 0 && guard-- > 0) {
    let r = 1 + Math.floor(Math.random() * (C.ROWS - 2));
    let c = 1 + Math.floor(Math.random() * (C.COLS - 2));
    const walk = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < walk && budget > 0; i++) {
      const nearSpawn = Math.abs(r - spawn.r) <= 2 && Math.abs(c - spawn.c) <= 2;
      if (!nearSpawn && r > 0 && r < C.ROWS - 1 && c > 0 && c < C.COLS - 1 && grid[idx(r, c)] === FLOOR) {
        grid[idx(r, c)] = WALL;
        budget--;
      }
      if (Math.random() < 0.5) r += Math.random() < 0.5 ? 1 : -1;
      else c += Math.random() < 0.5 ? 1 : -1;
    }
  }

  // Flood fill from spawn; any floor tile we can't reach becomes wall so
  // items and bears can never end up sealed away from the player.
  const reachable = new Uint8Array(grid.length);
  const queue = [[spawn.r, spawn.c]];
  reachable[idx(spawn.r, spawn.c)] = 1;
  while (queue.length) {
    const [r, c] = queue.pop();
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= C.ROWS || nc < 0 || nc >= C.COLS) continue;
      const i = idx(nr, nc);
      if (grid[i] === FLOOR && !reachable[i]) {
        reachable[i] = 1;
        queue.push([nr, nc]);
      }
    }
  }
  const openTiles = [];
  for (let r = 1; r < C.ROWS - 1; r++) {
    for (let c = 1; c < C.COLS - 1; c++) {
      const i = idx(r, c);
      if (grid[i] === FLOOR) {
        if (!reachable[i]) grid[i] = WALL;
        else openTiles.push({ r, c });
      }
    }
  }

  // Hand out open tiles for entities, each used at most once.
  const taken = new Set();
  const tileDist = (t) => Math.abs(t.r - spawn.r) + Math.abs(t.c - spawn.c);
  const pick = (minDist) => {
    const candidates = openTiles.filter(
      (t) => !taken.has(idx(t.r, t.c)) && tileDist(t) >= minDist
    );
    const pool = candidates.length ? candidates
      : openTiles.filter((t) => !taken.has(idx(t.r, t.c)) && tileDist(t) >= 2);
    const t = pool[Math.floor(Math.random() * pool.length)];
    taken.add(idx(t.r, t.c));
    return t;
  };
  taken.add(idx(spawn.r, spawn.c));

  const bearSpots = [];
  for (let i = 0; i < C.getBearCount(level); i++) bearSpots.push(pick(7));

  const armedBombSpots = [];
  for (let i = 0; i < C.getArmedBombCount(level); i++) armedBombSpots.push(pick(5));

  const pushBombSpots = [];
  for (let i = 0; i < C.getPushBombCount(level); i++) pushBombSpots.push(pick(3));

  const powerSpot = C.FLY_LEVELS.has(level) ? pick(4) : null;

  return { grid, spawn, bearSpots, armedBombSpots, pushBombSpots, powerSpot };
}

export function isWall(grid, r, c) {
  if (r < 0 || r >= C.ROWS || c < 0 || c >= C.COLS) return true;
  return grid[r * C.COLS + c] === WALL;
}

export function setFloor(grid, r, c) {
  // Border tiles stay solid no matter what explodes next to them.
  if (r <= 0 || r >= C.ROWS - 1 || c <= 0 || c >= C.COLS - 1) return;
  grid[r * C.COLS + c] = FLOOR;
}

/** Center of a tile in pixels. */
export function tileCenter(r, c) {
  return { x: c * C.TILE + C.TILE / 2, y: r * C.TILE + C.TILE / 2 };
}
