/**
 * Bear Duck — Sandwich Shop Rush
 *
 * A duck runs a salmon & honey sandwich shop. Peck bears so they drop
 * honey and salmon, collect enough to fill the day's orders, and don't
 * get caught by the bears you just made angry.
 *
 * Built from scratch on the raw canvas API: no game framework, no image
 * or audio assets. Sprites are baked in sprites.js, sounds in audio.js.
 */

import * as C from './config.js';
import { buildSprites, bakeBackground } from './sprites.js';
import { sfx } from './audio.js';
import { generateLevel, isWall, setFloor, tileCenter } from './level.js';

const canvas = document.getElementById('game');
canvas.width = C.WIDTH;
canvas.height = C.HEIGHT;
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const sprites = buildSprites();

// ---------------------------------------------------------------------------
// Game state
// ---------------------------------------------------------------------------

const game = {
  state: 'title', // title | play | clear | dead | gameover | victory
  level: 1,
  lives: C.START_LIVES,
  collected: 0,
  needed: 0,
  stateTimer: 0,
  time: 0,
  shake: 0,
  background: null,
  grid: null,
  player: null,
  bears: [],
  items: [],
  bombs: [],
  powerup: null,
  particles: [],
};

const keys = new Set();
let peckQueued = false;

window.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
    e.preventDefault();
  }
  sfx.unlock();
  keys.add(e.code);
  if (e.code === 'Space' && !e.repeat) peckQueued = true;
  if (e.code === 'Enter' && !e.repeat) handleEnter();
});
window.addEventListener('keyup', (e) => keys.delete(e.code));

function handleEnter() {
  if (game.state === 'title' || game.state === 'gameover' || game.state === 'victory') {
    game.level = 1;
    game.lives = C.START_LIVES;
    startLevel(1);
  }
}

// ---------------------------------------------------------------------------
// Level setup
// ---------------------------------------------------------------------------

function startLevel(level) {
  const layout = generateLevel(level);
  game.level = level;
  game.grid = layout.grid;
  game.collected = 0;
  game.needed = C.getItemsNeeded(level);
  game.items = [];
  game.bombs = [];
  game.particles = [];
  game.powerup = null;
  game.shake = 0;
  game.background = bakeBackground(C.WIDTH, C.HEIGHT, C.TILE, level * 7919, C.COLORS);

  const spawn = tileCenter(layout.spawn.r, layout.spawn.c);
  game.player = {
    x: spawn.x, y: spawn.y,
    facing: { x: 1, y: 0 },
    peckTimer: 0,
    peckCooldown: 0,
    flyTimer: 0,
  };

  const carry = C.getItemsPerBear(level);
  game.bears = layout.bearSpots.map((spot, i) => {
    const pos = tileCenter(spot.r, spot.c);
    const boss = level === C.MAX_LEVEL && i === 0;
    return {
      x: pos.x, y: pos.y,
      boss,
      hp: boss ? C.BOSS_HP : 1,
      carry: boss ? 0 : carry,
      angry: false,
      grace: 0,
      dir: Math.random() * Math.PI * 2,
      wanderTimer: 1 + Math.random() * 2,
      facing: 1,
    };
  });

  for (const spot of layout.armedBombSpots) {
    const pos = tileCenter(spot.r, spot.c);
    game.bombs.push({ x: pos.x, y: pos.y, armed: true, vx: 0, vy: 0, sliding: false });
  }
  for (const spot of layout.pushBombSpots) {
    const pos = tileCenter(spot.r, spot.c);
    game.bombs.push({ x: pos.x, y: pos.y, armed: false, vx: 0, vy: 0, sliding: false });
  }
  if (layout.powerSpot) {
    const pos = tileCenter(layout.powerSpot.r, layout.powerSpot.c);
    game.powerup = { x: pos.x, y: pos.y };
  }

  game.state = 'play';
}

// ---------------------------------------------------------------------------
// Physics helpers
// ---------------------------------------------------------------------------

function hitsWall(x, y, radius) {
  const minC = Math.floor((x - radius) / C.TILE);
  const maxC = Math.floor((x + radius) / C.TILE);
  const minR = Math.floor((y - radius) / C.TILE);
  const maxR = Math.floor((y + radius) / C.TILE);
  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      if (isWall(game.grid, r, c)) return true;
    }
  }
  return false;
}

/** Move a circle, sliding along walls (each axis resolved separately). */
function moveCircle(ent, dx, dy, radius, ignoreWalls = false) {
  let blocked = false;
  if (ignoreWalls) {
    // Flying: only the outer border holds you in.
    const lo = C.TILE + radius, hiX = C.WIDTH - C.TILE - radius, hiY = C.HEIGHT - C.TILE - radius;
    ent.x = Math.min(Math.max(ent.x + dx, lo), hiX);
    ent.y = Math.min(Math.max(ent.y + dy, lo), hiY);
    return false;
  }
  if (dx !== 0) {
    if (!hitsWall(ent.x + dx, ent.y, radius)) ent.x += dx;
    else blocked = true;
  }
  if (dy !== 0) {
    if (!hitsWall(ent.x, ent.y + dy, radius)) ent.y += dy;
    else blocked = true;
  }
  return blocked;
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** A free spot near (x, y) for a dropped item — never inside a wall. */
function findDropSpot(x, y) {
  for (let attempt = 0; attempt < 30; attempt++) {
    const range = C.TILE * (0.5 + attempt / 15);
    const nx = x + (Math.random() * 2 - 1) * range;
    const ny = y + (Math.random() * 2 - 1) * range;
    if (nx > C.TILE && nx < C.WIDTH - C.TILE && ny > C.TILE && ny < C.HEIGHT - C.TILE
        && !hitsWall(nx, ny, 12)) {
      return { x: nx, y: ny };
    }
  }
  return { x, y };
}

function dropItems(x, y, count) {
  for (let i = 0; i < count; i++) {
    const spot = findDropSpot(x, y);
    game.items.push({
      x: spot.x, y: spot.y,
      kind: Math.random() < 0.5 ? 'honey' : 'salmon',
      phase: Math.random() * Math.PI * 2,
    });
  }
}

function spawnBurst(x, y, color, count, speed) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = speed * (0.4 + Math.random() * 0.6);
    game.particles.push({
      x, y,
      vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      life: 0.4 + Math.random() * 0.4,
      maxLife: 0.8,
      color,
      size: 3 + Math.random() * 4,
    });
  }
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

function doPeck() {
  const p = game.player;
  if (p.peckCooldown > 0) return;
  p.peckCooldown = C.PECK_COOLDOWN;
  p.peckTimer = 0.15;
  sfx.peck();

  // Nearest bear in range wins; otherwise try shoving a gray bomb.
  let target = null, best = C.PECK_RANGE;
  for (const bear of game.bears) {
    const d = dist(p, bear);
    if (d < best) { best = d; target = bear; }
  }
  if (target) { peckBear(target); return; }

  let bomb = null;
  best = C.PECK_RANGE;
  for (const b of game.bombs) {
    if (b.armed || b.sliding) continue;
    const d = dist(p, b);
    if (d < best) { best = d; bomb = b; }
  }
  if (bomb) {
    // Shove along the duck's dominant facing axis so it slides on the grid.
    const f = p.facing;
    if (Math.abs(f.x) >= Math.abs(f.y)) { bomb.vx = Math.sign(f.x || 1) * C.BOMB_SLIDE_SPEED; bomb.vy = 0; }
    else { bomb.vx = 0; bomb.vy = Math.sign(f.y) * C.BOMB_SLIDE_SPEED; }
    bomb.sliding = true;
    sfx.push();
  }
}

function peckBear(bear) {
  spawnBurst(bear.x, bear.y, '#ffe9a8', 8, 120);
  if (bear.boss) {
    bear.hp--;
    dropItems(bear.x, bear.y, C.DROPS_PER_PECK);
    if (bear.hp <= 0) {
      dropItems(bear.x, bear.y, C.BOSS_DEFEAT_DROPS);
      spawnBurst(bear.x, bear.y, '#b53a2e', 24, 220);
      game.bears = game.bears.filter((b) => b !== bear);
      game.shake = 8;
      sfx.explosion();
      return;
    }
  } else if (bear.carry > 0) {
    const n = Math.min(C.DROPS_PER_PECK, bear.carry);
    bear.carry -= n;
    dropItems(bear.x, bear.y, n);
  }
  if (!bear.angry) sfx.angry();
  bear.angry = true;
  bear.grace = C.GRACE_PERIOD;
}

function explode(x, y) {
  sfx.explosion();
  game.shake = 12;
  spawnBurst(x, y, '#ff9a3d', 30, 260);
  spawnBurst(x, y, '#5d6d6e', 16, 180);

  const radius = C.EXPLOSION_RADIUS * C.TILE;

  // Blast open nearby walls (border stays).
  for (let r = 0; r < C.ROWS; r++) {
    for (let c = 0; c < C.COLS; c++) {
      if (!isWall(game.grid, r, c)) continue;
      const center = tileCenter(r, c);
      if (Math.hypot(center.x - x, center.y - y) <= radius) setFloor(game.grid, r, c);
    }
  }

  // Bears caught in the blast are defeated and drop everything they carry.
  for (const bear of [...game.bears]) {
    if (Math.hypot(bear.x - x, bear.y - y) > radius) continue;
    if (bear.boss) {
      bear.hp--;
      dropItems(bear.x, bear.y, C.DROPS_PER_PECK);
      if (bear.hp > 0) continue;
      dropItems(bear.x, bear.y, C.BOSS_DEFEAT_DROPS);
    } else if (bear.carry > 0) {
      dropItems(bear.x, bear.y, bear.carry);
    }
    spawnBurst(bear.x, bear.y, '#8d5a2b', 14, 160);
    game.bears = game.bears.filter((b) => b !== bear);
  }

  const p = game.player;
  if (game.state === 'play' && p.flyTimer <= 0 && Math.hypot(p.x - x, p.y - y) <= radius) {
    killPlayer();
  }
}

function killPlayer() {
  if (game.state !== 'play') return;
  sfx.death();
  spawnBurst(game.player.x, game.player.y, '#f4d03f', 24, 220);
  game.lives--;
  game.state = game.lives > 0 ? 'dead' : 'gameover';
  game.stateTimer = C.DEATH_PAUSE;
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

function updatePlay(dt) {
  const p = game.player;

  // --- duck movement ---
  let dx = 0, dy = 0;
  if (keys.has('ArrowLeft') || keys.has('KeyA')) dx -= 1;
  if (keys.has('ArrowRight') || keys.has('KeyD')) dx += 1;
  if (keys.has('ArrowUp') || keys.has('KeyW')) dy -= 1;
  if (keys.has('ArrowDown') || keys.has('KeyS')) dy += 1;
  if (dx || dy) {
    const len = Math.hypot(dx, dy);
    p.facing = { x: dx / len, y: dy / len };
    moveCircle(p, (dx / len) * C.DUCK_SPEED * dt, (dy / len) * C.DUCK_SPEED * dt,
      C.DUCK_RADIUS, p.flyTimer > 0);
  }

  p.peckCooldown = Math.max(0, p.peckCooldown - dt);
  p.peckTimer = Math.max(0, p.peckTimer - dt);
  if (p.flyTimer > 0) {
    p.flyTimer -= dt;
    // Don't let flight end while hovering over a wall — nudge expiry.
    if (p.flyTimer <= 0 && hitsWall(p.x, p.y, C.DUCK_RADIUS)) p.flyTimer = 0.1;
  }

  if (peckQueued) { doPeck(); }
  peckQueued = false;

  // --- bears ---
  for (const bear of game.bears) {
    bear.grace = Math.max(0, bear.grace - dt);
    const radius = bear.boss ? C.BEAR_RADIUS * 2 : C.BEAR_RADIUS;
    const wanderSpeed = C.getBearSpeed(game.level) * (bear.boss ? 0.8 : 1);

    if (bear.angry) {
      const speed = Math.min(wanderSpeed * C.BEAR_ANGRY_MULT, C.BEAR_MAX_SPEED);
      const d = dist(bear, p) || 1;
      const vx = ((p.x - bear.x) / d) * speed * dt;
      const vy = ((p.y - bear.y) / d) * speed * dt;
      moveCircle(bear, vx, 0, radius);
      moveCircle(bear, 0, vy, radius);
      if (vx) bear.facing = Math.sign(vx);
    } else {
      bear.wanderTimer -= dt;
      if (bear.wanderTimer <= 0) {
        bear.dir = Math.random() * Math.PI * 2;
        bear.wanderTimer = 1 + Math.random() * 2;
      }
      const vx = Math.cos(bear.dir) * wanderSpeed * dt;
      const vy = Math.sin(bear.dir) * wanderSpeed * dt;
      if (moveCircle(bear, vx, vy, radius)) {
        bear.dir = Math.random() * Math.PI * 2; // bounce off walls
        bear.wanderTimer = 1 + Math.random() * 2;
      }
      if (vx) bear.facing = Math.sign(vx);
    }

    // An angry bear catches you — unless flying, or within the grace period.
    if (bear.angry && bear.grace <= 0 && p.flyTimer <= 0
        && dist(bear, p) < radius + C.DUCK_RADIUS - 6) {
      killPlayer();
      return;
    }
  }

  // --- bombs ---
  for (const bomb of [...game.bombs]) {
    if (bomb.sliding) {
      const nx = bomb.x + bomb.vx * dt;
      const ny = bomb.y + bomb.vy * dt;
      if (hitsWall(nx, ny, C.BOMB_RADIUS)) {
        game.bombs = game.bombs.filter((b) => b !== bomb);
        explode(nx, ny);
        if (game.state !== 'play') return;
      } else {
        bomb.x = nx;
        bomb.y = ny;
      }
    } else if (bomb.armed && p.flyTimer <= 0
        && dist(bomb, p) < C.BOMB_RADIUS + C.DUCK_RADIUS - 6) {
      game.bombs = game.bombs.filter((b) => b !== bomb);
      explode(bomb.x, bomb.y);
      if (game.state !== 'play') return;
    }
  }

  // --- pickups ---
  for (const item of [...game.items]) {
    if (dist(item, p) < C.DUCK_RADIUS + 14) {
      game.items = game.items.filter((i) => i !== item);
      game.collected++;
      sfx.collect();
      spawnBurst(item.x, item.y, item.kind === 'honey' ? '#f0b429' : '#f08080', 6, 90);
    }
  }
  if (game.powerup && dist(game.powerup, p) < C.DUCK_RADIUS + 16) {
    game.powerup = null;
    p.flyTimer = C.FLY_DURATION;
    sfx.power();
    spawnBurst(p.x, p.y, '#4dd0e1', 16, 150);
  }

  if (game.collected >= game.needed) {
    game.state = 'clear';
    game.stateTimer = C.LEVEL_CLEAR_PAUSE;
    if (game.level === C.MAX_LEVEL) sfx.victory();
    else sfx.clear();
  }
}

function update(dt) {
  game.time += dt;
  game.shake = Math.max(0, game.shake - dt * 30);

  for (const part of [...game.particles]) {
    part.life -= dt;
    if (part.life <= 0) { game.particles = game.particles.filter((q) => q !== part); continue; }
    part.x += part.vx * dt;
    part.y += part.vy * dt;
    part.vx *= 0.92;
    part.vy *= 0.92;
  }

  switch (game.state) {
    case 'play':
      updatePlay(dt);
      break;
    case 'clear':
      game.stateTimer -= dt;
      if (game.stateTimer <= 0) {
        if (game.level >= C.MAX_LEVEL) game.state = 'victory';
        else startLevel(game.level + 1);
      }
      break;
    case 'dead':
      game.stateTimer -= dt;
      if (game.stateTimer <= 0) startLevel(game.level);
      break;
  }
  peckQueued = false;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

function drawSprite(img, x, y, { flip = false, scale = 1 } = {}) {
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.save();
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

function render() {
  ctx.save();
  if (game.shake > 0) {
    ctx.translate((Math.random() - 0.5) * game.shake, (Math.random() - 0.5) * game.shake);
  }

  if (game.background) ctx.drawImage(game.background, 0, 0);
  else { ctx.fillStyle = C.COLORS.grass; ctx.fillRect(0, 0, C.WIDTH, C.HEIGHT); }

  if (game.grid) {
    for (let r = 0; r < C.ROWS; r++) {
      for (let c = 0; c < C.COLS; c++) {
        if (isWall(game.grid, r, c)) ctx.drawImage(sprites.rock, c * C.TILE, r * C.TILE);
      }
    }
  }

  for (const item of game.items) {
    const bob = Math.sin(game.time * 4 + item.phase) * 3;
    drawSprite(item.kind === 'honey' ? sprites.honey : sprites.salmon, item.x, item.y + bob);
  }

  for (const bomb of game.bombs) {
    if (bomb.armed) {
      // Pulsing red warning glow on armed bombs.
      const pulse = 0.5 + 0.5 * Math.sin(game.time * 10);
      ctx.fillStyle = `rgba(231, 76, 60, ${0.25 + pulse * 0.3})`;
      ctx.beginPath();
      ctx.arc(bomb.x, bomb.y, 24 + pulse * 6, 0, Math.PI * 2);
      ctx.fill();
      drawSprite(sprites.bombArmed, bomb.x, bomb.y);
    } else {
      drawSprite(sprites.bombGray, bomb.x, bomb.y);
    }
  }

  if (game.powerup) {
    const bob = Math.sin(game.time * 3) * 4;
    ctx.fillStyle = 'rgba(77, 208, 225, 0.25)';
    ctx.beginPath();
    ctx.arc(game.powerup.x, game.powerup.y + bob, 26, 0, Math.PI * 2);
    ctx.fill();
    drawSprite(sprites.diamond, game.powerup.x, game.powerup.y + bob);
  }

  for (const bear of game.bears) {
    // Blink through the grace period so "angry but harmless" reads clearly.
    if (bear.angry && bear.grace > 0 && Math.floor(game.time * 12) % 2 === 0) continue;
    drawSprite(bear.angry ? sprites.bearAngry : sprites.bear, bear.x, bear.y, {
      flip: bear.facing < 0,
      scale: bear.boss ? 2 : 1,
    });
    if (bear.boss) {
      ctx.fillStyle = '#1d1d1d';
      ctx.fillRect(bear.x - 26, bear.y - 58, 52, 8);
      ctx.fillStyle = C.COLORS.danger;
      ctx.fillRect(bear.x - 24, bear.y - 56, 48 * (bear.hp / C.BOSS_HP), 4);
    }
  }

  if (game.player && game.state !== 'dead' && game.state !== 'gameover') {
    const p = game.player;
    const flying = p.flyTimer > 0;
    const bob = flying ? Math.sin(game.time * 8) * 4 - 10 : 0;
    if (flying) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + 18, 16, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    const lunge = p.peckTimer > 0 ? 8 : 0;
    drawSprite(sprites.duck, p.x + p.facing.x * lunge, p.y + p.facing.y * lunge + bob, {
      flip: p.facing.x < 0,
      scale: flying ? 1.12 : 1,
    });
  }

  for (const part of game.particles) {
    ctx.globalAlpha = Math.max(part.life / part.maxLife, 0);
    ctx.fillStyle = part.color;
    ctx.fillRect(part.x - part.size / 2, part.y - part.size / 2, part.size, part.size);
  }
  ctx.globalAlpha = 1;

  ctx.restore();

  drawHud();
  drawOverlays();
}

function drawHud() {
  if (game.state === 'title') return;
  // Dark bar over the top border row so the HUD stays readable.
  ctx.fillStyle = 'rgba(13, 17, 23, 0.85)';
  ctx.fillRect(0, 0, C.WIDTH, C.TILE);
  ctx.font = 'bold 22px "Courier New", monospace';
  ctx.textBaseline = 'middle';
  const y = C.TILE / 2;

  ctx.textAlign = 'left';
  ctx.fillStyle = C.COLORS.hudText;
  ctx.fillText(`LV ${game.level}/${C.MAX_LEVEL}`, 16, y);

  ctx.drawImage(sprites.honey, 150, y - 24);
  ctx.drawImage(sprites.salmon, 186, y - 24);
  ctx.fillText(`${game.collected}/${game.needed}`, 240, y);

  ctx.fillStyle = C.COLORS.danger;
  ctx.fillText('♥'.repeat(game.lives) || '', 340, y);
  ctx.fillStyle = C.COLORS.hudDim;
  ctx.fillText('♥'.repeat(C.START_LIVES - game.lives), 340 + game.lives * 22, y);

  if (game.player && game.player.flyTimer > 0) {
    ctx.fillStyle = C.COLORS.fly;
    ctx.fillText('FLY', 460, y);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(520, y - 8, 120, 16);
    ctx.fillStyle = C.COLORS.fly;
    ctx.fillRect(520, y - 8, 120 * (game.player.flyTimer / C.FLY_DURATION), 16);
  }

  ctx.textAlign = 'right';
  ctx.fillStyle = C.COLORS.hudDim;
  ctx.fillText('ARROWS move · SPACE peck', C.WIDTH - 16, y);
}

function centered(text, y, size, color) {
  ctx.font = `bold ${size}px "Courier New", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, C.WIDTH / 2, y);
}

function drawOverlays() {
  const blink = Math.floor(game.time * 2) % 2 === 0;

  if (game.state === 'title') {
    ctx.fillStyle = C.COLORS.night;
    ctx.fillRect(0, 0, C.WIDTH, C.HEIGHT);
    centered('BEAR DUCK', 170, 72, C.COLORS.honey);
    centered('SANDWICH SHOP RUSH', 230, 28, C.COLORS.hudText);
    drawSprite(sprites.duck, C.WIDTH / 2 - 120, 320, { scale: 2 });
    drawSprite(sprites.bear, C.WIDTH / 2 + 120, 320, { scale: 2 });
    centered('Your bee friends want their honey back — and the', 410, 20, C.COLORS.hudDim);
    centered('sandwich shop needs salmon. The bears have both.', 438, 20, C.COLORS.hudDim);
    centered('ARROWS / WASD move · SPACE peck bears & shove bombs', 500, 20, C.COLORS.hudText);
    centered('Pecked bears get ANGRY. Run.', 530, 20, C.COLORS.danger);
    if (blink) centered('PRESS ENTER TO START', 610, 26, C.COLORS.fly);
  }

  if (game.state === 'clear' && game.level < C.MAX_LEVEL) {
    centered(`LEVEL ${game.level} CLEAR!`, C.HEIGHT / 2 - 20, 48, C.COLORS.honey);
    centered('The sandwich orders are filled. Onward!', C.HEIGHT / 2 + 30, 22, C.COLORS.hudText);
  }

  if (game.state === 'dead') {
    centered('CAUGHT!', C.HEIGHT / 2 - 20, 48, C.COLORS.danger);
    centered(`${game.lives} ${game.lives === 1 ? 'life' : 'lives'} left`, C.HEIGHT / 2 + 30, 22, C.COLORS.hudText);
  }

  if (game.state === 'gameover') {
    ctx.fillStyle = C.COLORS.night;
    ctx.fillRect(0, 0, C.WIDTH, C.HEIGHT);
    centered('GAME OVER', C.HEIGHT / 2 - 60, 64, C.COLORS.danger);
    centered(`You reached level ${game.level}`, C.HEIGHT / 2 + 10, 24, C.COLORS.hudText);
    if (blink) centered('PRESS ENTER TO TRY AGAIN', C.HEIGHT / 2 + 80, 24, C.COLORS.fly);
  }

  if (game.state === 'victory' || (game.state === 'clear' && game.level === C.MAX_LEVEL)) {
    ctx.fillStyle = C.COLORS.night;
    ctx.fillRect(0, 0, C.WIDTH, C.HEIGHT);
    centered('VICTORY!', 200, 72, C.COLORS.honey);
    drawSprite(sprites.duck, C.WIDTH / 2, 300, { scale: 3 });
    centered('The boss bear is beaten. The bees have their honey,', 400, 22, C.COLORS.hudText);
    centered('the shop has its salmon — sandwiches for everyone!', 430, 22, C.COLORS.hudText);
    if (game.state === 'victory' && blink) {
      centered('PRESS ENTER TO PLAY AGAIN', 520, 24, C.COLORS.fly);
    }
  }
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

// Handle for debugging and automated tests.
window.__game = game;

let lastTime = performance.now();
function frame(now) {
  const dt = Math.min((now - lastTime) / 1000, 1 / 30);
  lastTime = now;
  update(dt);
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
