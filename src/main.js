import kaboom from 'kaboom';

// Initialize Kaboom
const k = kaboom({
  width: 640,
  height: 480,
  scale: 2,
  canvas: document.querySelector('#game'),
  background: [20, 20, 46],
  crisp: true,
});

// Load pixel art sprites
k.loadSprite('duck', '/assets/duck.png');
k.loadSprite('bear', '/assets/bear.png');

// Game constants
const PLAYER_SPEED = 120;
const BEAR_SPEED = 60;
const PECK_RANGE = 32;
const FLY_DURATION = 5; // seconds
const BOMB_PUSH_SPEED = 80;

// Game state
let currentLevel = 1;
let itemsCollected = 0;
let itemsNeeded = 5;

// Level layouts - define obstacle patterns
function generateLevel(levelNum) {
  const obstacles = [];
  const bombs = [];
  const powerups = [];

  // More obstacles and complexity as levels progress
  const obstacleCount = Math.min(5 + levelNum * 2, 40);
  const bombCount = Math.min(Math.floor(levelNum / 3), 5);
  const hasPowerup = levelNum >= 3 && levelNum % 4 === 0;

  // Generate random obstacles (walls)
  for (let i = 0; i < obstacleCount; i++) {
    const size = k.rand(30, 80);
    obstacles.push({
      pos: k.vec2(
        k.rand(50, k.width() - 50),
        k.rand(50, k.height() - 50)
      ),
      width: size,
      height: k.rand(30, 80),
    });
  }

  // Generate bombs
  for (let i = 0; i < bombCount; i++) {
    bombs.push({
      pos: k.vec2(
        k.rand(80, k.width() - 80),
        k.rand(80, k.height() - 80)
      ),
      armed: k.rand() > 0.5,
    });
  }

  // Add flying power-up on certain levels
  if (hasPowerup) {
    powerups.push({
      pos: k.vec2(
        k.rand(100, k.width() - 100),
        k.rand(100, k.height() - 100)
      ),
      type: 'fly',
    });
  }

  return { obstacles, bombs, powerups };
}

// Main game scene
k.scene('game', (levelNum = 1) => {
  // Reset game state
  currentLevel = levelNum;
  itemsCollected = 0;
  itemsNeeded = Math.min(5 + levelNum, 15);

  const isBossLevel = levelNum === 20;
  const bearCount = isBossLevel ? 5 : Math.min(1 + Math.floor(levelNum / 4), 6);

  // Calculate items per bear so math works out
  const itemsPerBear = Math.ceil(itemsNeeded / bearCount);

  // Generate level layout
  const level = generateLevel(levelNum);

  // Add level background
  k.add([
    k.rect(k.width(), k.height()),
    k.color(34, 139, 34),
    k.pos(0, 0),
    k.z(-1),
  ]);

  // Add obstacles
  level.obstacles.forEach(obs => {
    k.add([
      k.rect(obs.width, obs.height),
      k.color(80, 80, 80),
      k.pos(obs.pos),
      k.area(),
      k.body({ isStatic: true }),
      k.anchor('center'),
      'obstacle',
      { destructible: true }
    ]);
  });

  // Add bombs
  level.bombs.forEach(bombData => {
    const bombColor = bombData.armed ? k.rgb(255, 0, 0) : k.rgb(100, 100, 100);

    k.add([
      k.circle(10),
      k.color(bombColor),
      k.pos(bombData.pos),
      k.area(),
      k.anchor('center'),
      bombData.armed ? 'armed-bomb' : 'bomb',
      {
        armed: bombData.armed,
        pushable: !bombData.armed,
      }
    ]);

    // Add flashing effect for armed bombs
    if (bombData.armed) {
      k.add([
        k.circle(12),
        k.color(255, 150, 0),
        k.pos(bombData.pos),
        k.opacity(0.5),
        k.anchor('center'),
        k.z(-0.5),
        {
          update() {
            this.opacity = Math.sin(k.time() * 5) * 0.3 + 0.5;
          }
        }
      ]);
    }
  });

  // Add power-ups
  level.powerups.forEach(powerup => {
    k.add([
      k.polygon([
        k.vec2(0, -12),
        k.vec2(12, 0),
        k.vec2(0, 12),
        k.vec2(-12, 0),
      ]),
      k.color(0, 255, 255),
      k.pos(powerup.pos),
      k.area(),
      k.anchor('center'),
      k.rotate(0),
      'powerup',
      {
        type: powerup.type,
        update() {
          this.angle += 90 * k.dt();
        }
      }
    ]);
  });

  // Add player (duck)
  const player = k.add([
    k.sprite('duck'),
    k.scale(2),
    k.pos(k.center()),
    k.area(),
    k.body(),
    k.anchor('center'),
    k.z(10),
    'player',
    {
      speed: PLAYER_SPEED,
      flying: false,
      flyTimer: 0,
      pushingBomb: null,
    }
  ]);

  // Add bears
  for (let i = 0; i < bearCount; i++) {
    const isBoss = isBossLevel && i === bearCount - 1;
    const bearSize = isBoss ? 48 : 28;
    const bearSpeed = BEAR_SPEED * (1 + levelNum * 0.1) * (isBoss ? 0.8 : 1);

    const bear = k.add([
      k.sprite('bear'),
      k.scale(isBoss ? 3 : 2),
      k.pos(
        k.rand(100, k.width() - 100),
        k.rand(100, k.height() - 100)
      ),
      k.area(),
      k.color(255, 255, 255), // Start with normal color
      // Removed k.body() so player can pass through bears
      k.anchor('center'),
      isBoss ? 'boss-bear' : 'bear',
      {
        speed: bearSpeed,
        angry: false,
        angerTimer: 0, // Grace period after becoming angry
        moveDir: k.vec2(k.rand(-1, 1), k.rand(-1, 1)).unit(),
        changeTimer: 0,
        isBoss: isBoss,
        hp: isBoss ? 3 : 1,
      }
    ]);

    // Boss bear visual indicator
    if (isBoss) {
      k.add([
        k.text('BOSS', { size: 12 }),
        k.pos(bear.pos.add(0, -35)),
        k.anchor('center'),
        k.color(255, 0, 0),
        {
          update() {
            this.pos = bear.pos.add(0, -35);
          }
        }
      ]);
    }
  }

  // Player movement
  k.onKeyDown('left', () => {
    player.move(-player.speed, 0);
  });

  k.onKeyDown('right', () => {
    player.move(player.speed, 0);
  });

  k.onKeyDown('up', () => {
    player.move(0, -player.speed);
  });

  k.onKeyDown('down', () => {
    player.move(0, player.speed);
  });

  // Update player
  player.onUpdate(() => {
    // Flying timer
    if (player.flying) {
      player.flyTimer -= k.dt();
      if (player.flyTimer <= 0) {
        player.flying = false;
        player.color = k.rgb(255, 255, 255); // Reset to white (no tint)
      } else {
        // Pulsing cyan tint while flying
        const pulse = Math.sin(k.time() * 10) * 0.5 + 0.5;
        player.color = k.rgb(
          150 + pulse * 105,
          200 + pulse * 55,
          255
        );
      }
    }

    // Keep player on screen
    player.pos.x = k.clamp(player.pos.x, 20, k.width() - 20);
    player.pos.y = k.clamp(player.pos.y, 20, k.height() - 20);
  });

  // Collision with obstacles
  if (!player.flying) {
    player.onCollide('obstacle', (obs) => {
      // Can't pass through obstacles unless flying
    });
  }

  // Peck mechanic (spacebar)
  k.onKeyPress('space', () => {
    const bears = k.get('bear').concat(k.get('boss-bear'));

    bears.forEach(b => {
      const dist = player.pos.dist(b.pos);

      if (dist < PECK_RANGE) {
        if (!b.angry) {
          // First peck - make angry
          b.angry = true;
          b.angerTimer = 1.0; // 1 second grace period
          b.color = k.rgb(180, 0, 0);
          b.speed *= 1.5;

          // Drop items (enough to complete the level)
          for (let i = 0; i < itemsPerBear; i++) {
            const itemType = i % 2 === 0 ? 'honey' : 'salmon';
            dropItem(itemType, b.pos.add(k.rand(-30, 30), k.rand(-30, 30)));
          }
        } else if (b.isBoss) {
          // Boss takes multiple pecks
          b.hp--;

          if (b.hp <= 0) {
            // Boss defeated - drops lots of items
            for (let i = 0; i < itemsPerBear; i++) {
              const itemType = i % 2 === 0 ? 'honey' : 'salmon';
              dropItem(itemType, b.pos.add(k.rand(-40, 40), k.rand(-40, 40)));
            }
            k.destroy(b);
          }
        }

        // Visual feedback
        k.add([
          k.text(b.isBoss ? `PECK! HP: ${b.hp}` : 'PECK!', { size: 16 }),
          k.pos(b.pos),
          k.anchor('center'),
          k.color(255, 255, 255),
          k.lifespan(0.5),
          k.move(k.UP, 50),
        ]);
      }
    });

    // Push unarmed bombs
    const bombs = k.get('bomb');
    bombs.forEach(bomb => {
      const dist = player.pos.dist(bomb.pos);
      if (dist < PECK_RANGE && bomb.pushable) {
        // Push bomb away from player
        const pushDir = bomb.pos.sub(player.pos).unit();
        bomb.moveTo(bomb.pos.add(pushDir.scale(100)), BOMB_PUSH_SPEED);

        // Check if bomb hits obstacle
        bomb.onCollide('obstacle', (obs) => {
          if (obs.destructible) {
            // Explode!
            k.add([
              k.circle(30),
              k.color(255, 100, 0),
              k.pos(bomb.pos),
              k.anchor('center'),
              k.opacity(0.8),
              k.lifespan(0.3),
            ]);

            k.destroy(obs);
            k.destroy(bomb);
          }
        });
      }
    });
  });

  // Bear AI
  k.onUpdate('bear', (b) => {
    updateBearAI(b, player);
  });

  k.onUpdate('boss-bear', (b) => {
    updateBearAI(b, player);
  });

  function updateBearAI(b, player) {
    b.changeTimer -= k.dt();

    // Count down anger grace period
    if (b.angerTimer > 0) {
      b.angerTimer -= k.dt();
    }

    // Change direction occasionally
    if (b.changeTimer <= 0) {
      if (b.angry) {
        // Angry bears chase the player
        b.moveDir = player.pos.sub(b.pos).unit();
      } else {
        // Peaceful bears wander randomly
        b.moveDir = k.vec2(k.rand(-1, 1), k.rand(-1, 1)).unit();
      }
      b.changeTimer = k.rand(1, 3);
    }

    // Store old position for collision detection
    const oldPos = b.pos.clone();
    b.move(b.moveDir.scale(b.speed));

    // Check collision with obstacles
    const obstacles = k.get('obstacle');
    let hitObstacle = false;

    obstacles.forEach(obs => {
      if (b.isColliding(obs)) {
        hitObstacle = true;
      }
    });

    // If hit obstacle, revert and bounce
    if (hitObstacle) {
      b.pos = oldPos;
      b.moveDir.x *= -1;
      b.moveDir.y *= -1;
      b.changeTimer = 0; // Force new direction
    }

    // Bounce off screen edges
    if (b.pos.x < 30 || b.pos.x > k.width() - 30) {
      b.moveDir.x *= -1;
      b.pos.x = k.clamp(b.pos.x, 30, k.width() - 30);
    }
    if (b.pos.y < 30 || b.pos.y > k.height() - 30) {
      b.moveDir.y *= -1;
      b.pos.y = k.clamp(b.pos.y, 30, k.height() - 30);
    }
  }

  // Drop item function
  function dropItem(type, pos) {
    const itemColor = type === 'honey' ? k.rgb(255, 193, 7) : k.rgb(255, 105, 180);

    // Check if position is inside an obstacle
    let finalPos = pos;
    let attempts = 0;
    let validPos = false;

    while (!validPos && attempts < 10) {
      // Create temporary item to test collision
      const testItem = k.add([
        k.circle(8),
        k.pos(finalPos),
        k.area(),
        k.anchor('center'),
      ]);

      // Check if it collides with any obstacle
      const obstacles = k.get('obstacle');
      let colliding = false;

      for (const obs of obstacles) {
        if (testItem.isColliding(obs)) {
          colliding = true;
          break;
        }
      }

      k.destroy(testItem);

      if (!colliding) {
        validPos = true;
      } else {
        // Try a new random position closer to center
        attempts++;
        const angle = k.rand(0, Math.PI * 2);
        const dist = k.rand(10, 40);
        finalPos = pos.add(
          Math.cos(angle) * dist,
          Math.sin(angle) * dist
        );
      }
    }

    // Add the actual item
    k.add([
      k.circle(8),
      k.color(itemColor),
      k.pos(finalPos),
      k.area(),
      k.anchor('center'),
      'item',
      { type }
    ]);
  }

  // Collect items
  player.onCollide('item', (item) => {
    k.destroy(item);
    itemsCollected++;

    // TODO: Add sound effect later
    // k.play('collect');

    // Check win condition
    if (itemsCollected >= itemsNeeded) {
      k.go('levelComplete', currentLevel);
    }
  });

  // Collect power-ups
  player.onCollide('powerup', (powerup) => {
    if (powerup.type === 'fly') {
      player.flying = true;
      player.flyTimer = FLY_DURATION;

      k.add([
        k.text('FLYING!', { size: 24 }),
        k.pos(player.pos),
        k.anchor('center'),
        k.color(0, 255, 255),
        k.lifespan(1),
        k.move(k.UP, 50),
      ]);
    }

    k.destroy(powerup);
  });

  // Armed bomb collision - game over!
  player.onCollide('armed-bomb', () => {
    k.go('gameOver', currentLevel);
  });

  // Angry bear collision - game over!
  player.onCollide('bear', (bear) => {
    if (bear.angry && bear.angerTimer <= 0) {
      k.go('gameOver', currentLevel);
    }
  });

  player.onCollide('boss-bear', (bear) => {
    if (bear.angry && bear.angerTimer <= 0) {
      k.go('gameOver', currentLevel);
    }
  });

  // UI
  k.add([
    k.text(() => `Level ${currentLevel}${isBossLevel ? ' - BOSS!' : ''}`, { size: 20 }),
    k.pos(12, 12),
    k.color(255, 255, 255),
    k.fixed(),
  ]);

  k.add([
    k.text(() => `Items: ${itemsCollected}/${itemsNeeded}`, { size: 20 }),
    k.pos(12, 40),
    k.color(255, 255, 255),
    k.fixed(),
  ]);

  k.add([
    k.text(() => player.flying ? `Flying: ${player.flyTimer.toFixed(1)}s` : '', { size: 16 }),
    k.pos(12, 68),
    k.color(0, 255, 255),
    k.fixed(),
  ]);
});

// Game Over scene
k.scene('gameOver', (levelNum) => {
  k.add([
    k.text('GAME OVER!', { size: 48 }),
    k.pos(k.center()),
    k.anchor('center'),
    k.color(255, 0, 0),
  ]);

  k.add([
    k.text('Caught by an angry bear!', { size: 16 }),
    k.pos(k.center().add(0, 50)),
    k.anchor('center'),
    k.color(255, 255, 255),
  ]);

  k.add([
    k.text('Press SPACE to retry', { size: 20 }),
    k.pos(k.center().add(0, 90)),
    k.anchor('center'),
    k.color(255, 200, 0),
  ]);

  k.onKeyPress('space', () => {
    k.go('game', levelNum);
  });
});

// Level complete scene
k.scene('levelComplete', (levelNum) => {
  if (levelNum >= 20) {
    // Victory!
    k.add([
      k.text('YOU WIN!', { size: 48 }),
      k.pos(k.center().sub(0, 40)),
      k.anchor('center'),
      k.color(255, 215, 0),
    ]);

    k.add([
      k.text('All 20 levels complete!', { size: 20 }),
      k.pos(k.center().add(0, 20)),
      k.anchor('center'),
      k.color(255, 255, 255),
    ]);

    k.add([
      k.text('Press SPACE to play again', { size: 16 }),
      k.pos(k.center().add(0, 60)),
      k.anchor('center'),
      k.color(200, 200, 200),
    ]);

    k.onKeyPress('space', () => {
      k.go('start');
    });
  } else {
    k.add([
      k.text('Level Complete!', { size: 32 }),
      k.pos(k.center()),
      k.anchor('center'),
      k.color(255, 255, 0),
    ]);

    k.add([
      k.text(`Press SPACE for Level ${levelNum + 1}`, { size: 20 }),
      k.pos(k.center().add(0, 50)),
      k.anchor('center'),
      k.color(255, 255, 255),
    ]);

    k.onKeyPress('space', () => {
      k.go('game', levelNum + 1);
    });
  }
});

// Start screen
k.scene('start', () => {
  k.add([
    k.text('BEAR DUCK', { size: 48 }),
    k.pos(k.center().sub(0, 80)),
    k.anchor('center'),
    k.color(255, 200, 0),
  ]);

  k.add([
    k.text('Help the duck collect honey & salmon!', { size: 14 }),
    k.pos(k.center().sub(0, 20)),
    k.anchor('center'),
    k.color(255, 255, 255),
  ]);

  k.add([
    k.text('Peck bears to make them drop items', { size: 12 }),
    k.pos(k.center().add(0, 5)),
    k.anchor('center'),
    k.color(200, 200, 200),
  ]);

  k.add([
    k.text('but watch out - they get angry!', { size: 12 }),
    k.pos(k.center().add(0, 25)),
    k.anchor('center'),
    k.color(200, 200, 200),
  ]);

  k.add([
    k.text('Arrow Keys: Move | Space: Peck/Push', { size: 12 }),
    k.pos(k.center().add(0, 55)),
    k.anchor('center'),
    k.color(150, 150, 150),
  ]);

  k.add([
    k.text('Press SPACE to Start', { size: 20 }),
    k.pos(k.center().add(0, 95)),
    k.anchor('center'),
    k.color(0, 255, 0),
  ]);

  k.onKeyPress('space', () => {
    k.go('game', 1);
  });
});

// Start the game
k.go('start');
