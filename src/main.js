import kaboom from 'kaboom';
import * as CONFIG from './config.js';

// Initialize Kaboom
const k = kaboom({
  width: CONFIG.GAME_WIDTH,
  height: CONFIG.GAME_HEIGHT,
  scale: 2,
  canvas: document.querySelector('#game'),
  background: CONFIG.COLORS.background,
  crisp: true,
});

// Load pixel art sprites
k.loadSprite('duck', '/assets/duck.png');
k.loadSprite('bear', '/assets/bear.png');

// Helper to convert color array to kaboom color
const rgb = (colorArray) => k.rgb(colorArray[0], colorArray[1], colorArray[2]);

// Game state
let currentLevel = 1;
let itemsCollected = 0;
let itemsNeeded = 5;

// Level layouts - define obstacle patterns
function generateLevel(levelNum) {
  const obstacles = [];
  const bombs = [];
  const powerups = [];

  const obstacleCount = CONFIG.getObstacleCount(levelNum);
  const bombCount = CONFIG.getBombCount(levelNum);
  const shouldHavePowerup = CONFIG.hasPowerup(levelNum);

  // Generate random obstacles (walls)
  for (let i = 0; i < obstacleCount; i++) {
    obstacles.push({
      pos: k.vec2(
        k.rand(CONFIG.LEVEL_GEN.marginX, k.width() - CONFIG.LEVEL_GEN.marginX),
        k.rand(CONFIG.LEVEL_GEN.marginY, k.height() - CONFIG.LEVEL_GEN.marginY)
      ),
      width: k.rand(CONFIG.ENTITY_SIZES.obstacle.minWidth, CONFIG.ENTITY_SIZES.obstacle.maxWidth),
      height: k.rand(CONFIG.ENTITY_SIZES.obstacle.minHeight, CONFIG.ENTITY_SIZES.obstacle.maxHeight),
    });
  }

  // Generate bombs
  for (let i = 0; i < bombCount; i++) {
    bombs.push({
      pos: k.vec2(
        k.rand(CONFIG.LEVEL_GEN.marginX, k.width() - CONFIG.LEVEL_GEN.marginX),
        k.rand(CONFIG.LEVEL_GEN.marginY, k.height() - CONFIG.LEVEL_GEN.marginY)
      ),
      armed: k.rand() > 0.5,
    });
  }

  // Add flying power-up on certain levels
  if (shouldHavePowerup) {
    powerups.push({
      pos: k.vec2(
        k.rand(CONFIG.LEVEL_GEN.marginX, k.width() - CONFIG.LEVEL_GEN.marginX),
        k.rand(CONFIG.LEVEL_GEN.marginY, k.height() - CONFIG.LEVEL_GEN.marginY)
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

  const isBossLevel = levelNum === CONFIG.PROGRESSION.bossLevel;
  itemsNeeded = CONFIG.getItemsNeeded(levelNum);
  const bearCount = CONFIG.getBearCount(levelNum, isBossLevel);
  const itemsPerBear = CONFIG.getItemsPerBear(itemsNeeded, bearCount);

  // Generate level layout
  const level = generateLevel(levelNum);

  // Add level background
  k.add([
    k.rect(k.width(), k.height()),
    rgb(CONFIG.COLORS.grass),
    k.pos(0, 0),
    k.z(CONFIG.Z_INDEX.background),
  ]);

  // Add obstacles
  level.obstacles.forEach(obs => {
    k.add([
      k.rect(obs.width, obs.height),
      rgb(CONFIG.COLORS.wall),
      k.pos(obs.pos),
      k.area(),
      k.body({ isStatic: true }),
      k.anchor('center'),
      k.z(CONFIG.Z_INDEX.obstacles),
      'obstacle',
      { destructible: true }
    ]);
  });

  // Add bombs
  level.bombs.forEach(bombData => {
    const bombColor = bombData.armed
      ? rgb(CONFIG.COLORS.bombArmed)
      : rgb(CONFIG.COLORS.bombUnarmed);

    k.add([
      k.circle(CONFIG.ENTITY_SIZES.bomb.radius),
      bombColor,
      k.pos(bombData.pos),
      k.area(),
      k.anchor('center'),
      k.z(CONFIG.Z_INDEX.bombs),
      bombData.armed ? 'armed-bomb' : 'bomb',
      {
        armed: bombData.armed,
        pushable: !bombData.armed,
      }
    ]);

    // Add flashing effect for armed bombs
    if (bombData.armed) {
      k.add([
        k.circle(CONFIG.ENTITY_SIZES.bomb.radius + 2),
        rgb(CONFIG.COLORS.bombFlash),
        k.pos(bombData.pos),
        k.opacity(0.5),
        k.anchor('center'),
        k.z(CONFIG.Z_INDEX.bombs - 0.5),
        {
          update() {
            this.opacity = Math.sin(k.time() * CONFIG.ANIMATION.bombFlashSpeed) * 0.3 + 0.5;
          }
        }
      ]);
    }
  });

  // Add power-ups
  level.powerups.forEach(powerup => {
    const size = CONFIG.ENTITY_SIZES.powerup.size / 2;
    k.add([
      k.polygon([
        k.vec2(0, -size),
        k.vec2(size, 0),
        k.vec2(0, size),
        k.vec2(-size, 0),
      ]),
      rgb(CONFIG.COLORS.powerup),
      k.pos(powerup.pos),
      k.area(),
      k.anchor('center'),
      k.rotate(0),
      k.z(CONFIG.Z_INDEX.powerups),
      'powerup',
      {
        type: powerup.type,
        update() {
          this.angle += CONFIG.ANIMATION.powerupRotationSpeed * k.dt();
        }
      }
    ]);
  });

  // Add player (duck)
  const player = k.add([
    k.sprite('duck'),
    k.scale(CONFIG.SPRITE_SCALES.player),
    k.pos(k.center()),
    k.area(),
    k.body(),
    k.anchor('center'),
    k.z(CONFIG.Z_INDEX.player),
    'player',
    {
      speed: CONFIG.MOVEMENT.playerSpeed,
      flying: false,
      flyTimer: 0,
      pushingBomb: null,
    }
  ]);

  // Add bears
  for (let i = 0; i < bearCount; i++) {
    const isBoss = isBossLevel && i === bearCount - 1;
    const bearSpeed = CONFIG.getBearSpeed(levelNum, isBoss);

    const bear = k.add([
      k.sprite('bear'),
      k.scale(isBoss ? CONFIG.SPRITE_SCALES.bearBoss : CONFIG.SPRITE_SCALES.bear),
      k.pos(
        k.rand(CONFIG.LEVEL_GEN.marginX, k.width() - CONFIG.LEVEL_GEN.marginX),
        k.rand(CONFIG.LEVEL_GEN.marginY, k.height() - CONFIG.LEVEL_GEN.marginY)
      ),
      k.area(),
      rgb(isBoss ? CONFIG.COLORS.bearBoss : CONFIG.COLORS.bear),
      // Removed k.body() so player can pass through bears
      k.anchor('center'),
      k.z(CONFIG.Z_INDEX.bears),
      isBoss ? 'boss-bear' : 'bear',
      {
        speed: bearSpeed,
        angry: false,
        angerTimer: 0,
        moveDir: k.vec2(k.rand(-1, 1), k.rand(-1, 1)).unit(),
        changeTimer: 0,
        isBoss: isBoss,
        hp: isBoss ? CONFIG.PROGRESSION.bossHP : 1,
      }
    ]);

    // Boss bear visual indicator
    if (isBoss) {
      k.add([
        k.text('BOSS', { size: CONFIG.TEXT.sizes.small }),
        k.pos(bear.pos.add(0, -35)),
        k.anchor('center'),
        rgb(CONFIG.COLORS.bearAngry),
        k.z(CONFIG.Z_INDEX.effects),
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
        player.color = rgb(CONFIG.COLORS.duck);
      } else {
        // Pulsing cyan tint while flying
        const pulse = Math.sin(k.time() * CONFIG.ANIMATION.flyingPulseSpeed) * 0.5 + 0.5;
        const [r, g, b] = CONFIG.COLORS.flyingTint;
        player.color = k.rgb(
          r + pulse * (255 - r),
          g + pulse * (255 - g),
          b
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

      if (dist < CONFIG.INTERACTION.peckRange) {
        if (!b.angry) {
          // First peck - make angry
          b.angry = true;
          b.angerTimer = CONFIG.INTERACTION.angerGracePeriod;
          b.color = rgb(CONFIG.COLORS.bearAngry);
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
          k.text(b.isBoss ? `PECK! HP: ${b.hp}` : 'PECK!', { size: CONFIG.TEXT.sizes.feedback }),
          k.pos(b.pos),
          k.anchor('center'),
          rgb(CONFIG.COLORS.uiText),
          k.lifespan(CONFIG.ANIMATION.feedbackDuration),
          k.move(k.UP, CONFIG.ANIMATION.feedbackMoveSpeed),
          k.z(CONFIG.Z_INDEX.effects),
        ]);
      }
    });

    // Push unarmed bombs
    const bombs = k.get('bomb');
    bombs.forEach(bomb => {
      const dist = player.pos.dist(bomb.pos);
      if (dist < CONFIG.INTERACTION.peckRange && bomb.pushable) {
        // Push bomb away from player
        const pushDir = bomb.pos.sub(player.pos).unit();
        bomb.moveTo(bomb.pos.add(pushDir.scale(100)), CONFIG.MOVEMENT.bombPushSpeed);

        // Check if bomb hits obstacle
        bomb.onCollide('obstacle', (obs) => {
          if (obs.destructible) {
            // Explode!
            k.add([
              k.circle(30),
              rgb(CONFIG.COLORS.explosion),
              k.pos(bomb.pos),
              k.anchor('center'),
              k.opacity(0.8),
              k.lifespan(CONFIG.ANIMATION.explosionDuration),
              k.z(CONFIG.Z_INDEX.effects),
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
    const itemColor = type === 'honey'
      ? rgb(CONFIG.COLORS.honey)
      : rgb(CONFIG.COLORS.salmon);

    // Check if position is inside an obstacle
    let finalPos = pos;
    let attempts = 0;
    let validPos = false;

    while (!validPos && attempts < 10) {
      // Create temporary item to test collision
      const testItem = k.add([
        k.circle(CONFIG.ENTITY_SIZES.item.radius),
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
      k.circle(CONFIG.ENTITY_SIZES.item.radius),
      itemColor,
      k.pos(finalPos),
      k.area(),
      k.anchor('center'),
      k.z(CONFIG.Z_INDEX.items),
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
      player.flyTimer = CONFIG.INTERACTION.flyDuration;

      k.add([
        k.text('FLYING!', { size: CONFIG.TEXT.sizes.heading }),
        k.pos(player.pos),
        k.anchor('center'),
        rgb(CONFIG.COLORS.powerup),
        k.lifespan(1),
        k.move(k.UP, CONFIG.ANIMATION.feedbackMoveSpeed),
        k.z(CONFIG.Z_INDEX.effects),
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
    k.text(() => `Level ${currentLevel}${isBossLevel ? ' - BOSS!' : ''}`, { size: CONFIG.TEXT.sizes.ui }),
    k.pos(CONFIG.TEXT.positions.uiPadding, CONFIG.TEXT.positions.uiPadding),
    rgb(CONFIG.COLORS.uiText),
    k.fixed(),
    k.z(CONFIG.Z_INDEX.ui),
  ]);

  k.add([
    k.text(() => `Items: ${itemsCollected}/${itemsNeeded}`, { size: CONFIG.TEXT.sizes.ui }),
    k.pos(CONFIG.TEXT.positions.uiPadding, CONFIG.TEXT.positions.uiPadding + CONFIG.TEXT.positions.lineHeight),
    rgb(CONFIG.COLORS.uiText),
    k.fixed(),
    k.z(CONFIG.Z_INDEX.ui),
  ]);

  k.add([
    k.text(() => player.flying ? `Flying: ${player.flyTimer.toFixed(1)}s` : '', { size: CONFIG.TEXT.sizes.body }),
    k.pos(CONFIG.TEXT.positions.uiPadding, CONFIG.TEXT.positions.uiPadding + CONFIG.TEXT.positions.lineHeight * 2),
    rgb(CONFIG.COLORS.powerup),
    k.fixed(),
    k.z(CONFIG.Z_INDEX.ui),
  ]);
});

// Game Over scene
k.scene('gameOver', (levelNum) => {
  k.add([
    k.text('GAME OVER!', { size: CONFIG.TEXT.sizes.title }),
    k.pos(k.center()),
    k.anchor('center'),
    rgb(CONFIG.COLORS.bearAngry),
  ]);

  k.add([
    k.text('Caught by an angry bear!', { size: CONFIG.TEXT.sizes.body }),
    k.pos(k.center().add(0, 50)),
    k.anchor('center'),
    rgb(CONFIG.COLORS.uiText),
  ]);

  k.add([
    k.text('Press SPACE to retry', { size: CONFIG.TEXT.sizes.subheading }),
    k.pos(k.center().add(0, 90)),
    k.anchor('center'),
    rgb(CONFIG.COLORS.duck),
  ]);

  k.onKeyPress('space', () => {
    k.go('game', levelNum);
  });
});

// Level complete scene
k.scene('levelComplete', (levelNum) => {
  if (levelNum >= CONFIG.PROGRESSION.bossLevel) {
    // Victory!
    k.add([
      k.text('YOU WIN!', { size: CONFIG.TEXT.sizes.title }),
      k.pos(k.center().sub(0, 40)),
      k.anchor('center'),
      rgb(CONFIG.COLORS.uiAccent),
    ]);

    k.add([
      k.text(`All ${CONFIG.PROGRESSION.bossLevel} levels complete!`, { size: CONFIG.TEXT.sizes.subheading }),
      k.pos(k.center().add(0, 20)),
      k.anchor('center'),
      rgb(CONFIG.COLORS.uiText),
    ]);

    k.add([
      k.text('Press SPACE to play again', { size: CONFIG.TEXT.sizes.body }),
      k.pos(k.center().add(0, 60)),
      k.anchor('center'),
      rgb(CONFIG.COLORS.uiText),
    ]);

    k.onKeyPress('space', () => {
      k.go('start');
    });
  } else {
    k.add([
      k.text('Level Complete!', { size: CONFIG.TEXT.sizes.heading }),
      k.pos(k.center()),
      k.anchor('center'),
      rgb(CONFIG.COLORS.uiAccent),
    ]);

    k.add([
      k.text(`Press SPACE for Level ${levelNum + 1}`, { size: CONFIG.TEXT.sizes.subheading }),
      k.pos(k.center().add(0, 50)),
      k.anchor('center'),
      rgb(CONFIG.COLORS.uiText),
    ]);

    k.onKeyPress('space', () => {
      k.go('game', levelNum + 1);
    });
  }
});

// Start screen
k.scene('start', () => {
  k.add([
    k.text('BEAR DUCK', { size: CONFIG.TEXT.sizes.title }),
    k.pos(k.center().sub(0, 80)),
    k.anchor('center'),
    rgb(CONFIG.COLORS.duck),
  ]);

  k.add([
    k.text('Help the duck collect honey & salmon!', { size: CONFIG.TEXT.sizes.body }),
    k.pos(k.center().sub(0, 20)),
    k.anchor('center'),
    rgb(CONFIG.COLORS.uiText),
  ]);

  k.add([
    k.text('Peck bears to make them drop items', { size: CONFIG.TEXT.sizes.small }),
    k.pos(k.center().add(0, 5)),
    k.anchor('center'),
    rgb(CONFIG.COLORS.uiText),
  ]);

  k.add([
    k.text('but watch out - they get angry!', { size: CONFIG.TEXT.sizes.small }),
    k.pos(k.center().add(0, 25)),
    k.anchor('center'),
    rgb(CONFIG.COLORS.uiText),
  ]);

  k.add([
    k.text('Arrow Keys: Move | Space: Peck/Push', { size: CONFIG.TEXT.sizes.small }),
    k.pos(k.center().add(0, 55)),
    k.anchor('center'),
    rgb(CONFIG.COLORS.uiText),
  ]);

  k.add([
    k.text('Press SPACE to Start', { size: CONFIG.TEXT.sizes.subheading }),
    k.pos(k.center().add(0, 95)),
    k.anchor('center'),
    rgb(CONFIG.COLORS.powerup),
  ]);

  k.onKeyPress('space', () => {
    k.go('game', 1);
  });
});

// Start the game
k.go('start');
