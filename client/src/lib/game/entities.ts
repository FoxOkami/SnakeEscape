import { Snake, Player, Wall, Position, Boulder } from "./types";
import { checkAABBCollision, getDistance, moveTowards, hasLineOfSight, getDirectionVector, findPathAroundWalls, slideAlongWall } from "./collision";
import { updateBossSnake } from "./bossSnake";

export function updateSnake(snake: Snake, walls: Wall[], deltaTime: number, player?: Player, sounds?: Position[], gameState?: any, levelBounds?: { width: number; height: number }, boulders?: Boulder[]): Snake {
  const currentTime = Date.now();
  
  // Convert deltaTime from milliseconds to seconds for calculations
  const dt = deltaTime / 1000;
  
  // Check if snake is phase-restricted and not in active phase
  if (snake.activePhase && gameState && gameState.currentPhase !== snake.activePhase) {
    // Snake is not active in current phase, return without updating
    return { ...snake, isChasing: false };
  }
  


  // Handle different snake types
  switch (snake.type) {
    case 'stalker':
      return updateStalkerSnake(snake, walls, dt, player, sounds);
    case 'guard':
      return updateGuardSnake(snake, walls, dt, player);
    case 'burster':
      return updateBursterSnake(snake, walls, dt, player, currentTime);
    case 'screensaver':
      return updateScreensaverSnake(snake, walls, dt);
    case 'plumber':
      return updatePlumberSnake(snake, walls, dt, player, gameState);
    case 'spitter':
      return updateSpitterSnake(snake, walls, dt);
    case 'photophobic':
      return updatePhotophobicSnake(snake, walls, dt, player, sounds, currentTime, gameState);
    case 'rattlesnake':
      return updateRattlesnakeSnake(snake, walls, dt, player);
    case 'boss':
      return updateBossSnake(snake, walls, dt, player, currentTime, levelBounds, boulders);
    default:
      return snake;
  }
}

function updateStalkerSnake(snake: Snake, walls: Wall[], dt: number, player?: Player, sounds?: Position[]): Snake {
  let targetPoint: Position = snake.position;
  
  // Stalkers are blind but follow sounds
  let nearestSound: Position | null = null;
  let nearestSoundDistance = Infinity;
  
  // Check for sounds within hearing range
  if (sounds && snake.hearingRange) {
    for (const sound of sounds) {
      const distance = getDistance(snake.position, sound);
      if (distance <= snake.hearingRange && distance < nearestSoundDistance) {
        nearestSound = sound;
        nearestSoundDistance = distance;
      }
    }
  }
  
  // Update sound cooldown
  if (snake.soundCooldown && snake.soundCooldown > 0) {
    snake.soundCooldown -= dt;
  }
  
  if (nearestSound && typeof nearestSound.x === 'number' && typeof nearestSound.y === 'number') {
    // Continuously follow current sounds with no cooldown
    snake.lastHeardSound = nearestSound;
    snake.isChasing = true;
    targetPoint = nearestSound;
    
    // Reset sound cooldown since we're actively hearing the player
    snake.soundCooldown = 0;
  } else if (snake.lastHeardSound && snake.isChasing && 
             typeof snake.lastHeardSound.x === 'number' && typeof snake.lastHeardSound.y === 'number') {
    // Continue chasing toward last heard sound
    targetPoint = snake.lastHeardSound;
    
    const distanceToSound = getDistance(snake.position, targetPoint);
    
    // If we haven't reached the last known location yet, keep moving toward it
    if (distanceToSound > 25) {
      // Still moving toward the last heard sound
      if (!snake.soundCooldown) {
        snake.soundCooldown = 5.0; // Give more time to reach the location
      }
    } else {
      // We've reached the last known location, start searching
      if (!snake.soundCooldown || snake.soundCooldown > 3.0) {
        snake.soundCooldown = 3.0; // 3 seconds to search at this location
      } else {
        snake.soundCooldown -= dt;
        
        // Stop chasing after searching for 3 seconds
        if (snake.soundCooldown <= 0) {
          snake.lastHeardSound = undefined;
          snake.isChasing = false;
          snake.soundCooldown = 0;
        }
      }
    }
  } else {
    // Default patrol behavior when no sounds and not chasing
    snake.isChasing = false;
    targetPoint = getPatrolTarget(snake);
  }
  
  // Move toward target with wall avoidance (use chase speed when chasing sounds)
  const moveSpeed = snake.isChasing && snake.chaseSpeed ? snake.chaseSpeed : snake.speed;
  
  // Move toward target
  const newPosition = moveTowards(snake.position, targetPoint, moveSpeed * dt);
  
  // Check collision and update position
  if (!checkWallCollision(snake, newPosition, walls)) {
    snake.position = newPosition;
  } else if (snake.isChasing) {
    // If blocked by wall while chasing, try sliding along the wall
    const slidePosition = slideAlongWall(snake.position, newPosition, walls, snake.size);
    snake.position = slidePosition;
  }
  
  snake.direction = getDirectionVector(snake.position, targetPoint);
  return snake;
}

function updateGuardSnake(snake: Snake, walls: Wall[], dt: number, player?: Player): Snake {
  let targetPoint: Position = snake.position;
  
  // Check if snake can see the player
  let canSeePlayer = false;
  if (player && snake.sightRange > 0) {
    const distanceToPlayer = getDistance(snake.position, player.position);
    canSeePlayer = distanceToPlayer <= snake.sightRange && 
                   hasLineOfSight(snake.position, player.position, walls, snake.sightRange);
  }
  
  // Update lost sight cooldown
  if (snake.lostSightCooldown && snake.lostSightCooldown > 0) {
    snake.lostSightCooldown -= dt;
  }
  


  if (canSeePlayer && player && player.position && 
      typeof player.position.x === 'number' && typeof player.position.y === 'number') {
    // Chase the player
    snake.isChasing = true;
    snake.chaseTarget = { ...player.position };
    snake.lastSeenPlayer = { ...player.position };
    snake.lostSightCooldown = 3.0; // Keep chasing for 3 seconds after losing sight
    targetPoint = player.position;
  } else if (snake.isChasing && snake.lastSeenPlayer && snake.lostSightCooldown && snake.lostSightCooldown > 0 &&
             typeof snake.lastSeenPlayer.x === 'number' && typeof snake.lastSeenPlayer.y === 'number') {
    // Continue chasing last seen position for a while
    targetPoint = snake.lastSeenPlayer;
  } else if (snake.isChasing && snake.chaseTarget && 
             typeof snake.chaseTarget.x === 'number' && typeof snake.chaseTarget.y === 'number') {
    // Move to last known position briefly
    targetPoint = snake.chaseTarget;
    
    // Stop chasing if we've reached the last known position
    const distanceToTarget = getDistance(snake.position, targetPoint);
    if (distanceToTarget < 15) {
      snake.isChasing = false;
      snake.chaseTarget = undefined;
      snake.lastSeenPlayer = undefined;
    }
  } else {
    // Return to patrol
    snake.isChasing = false;
    targetPoint = getPatrolTarget(snake);
  }

  // Calculate movement speed
  const moveSpeed = snake.isChasing ? snake.chaseSpeed : snake.speed;
  
  // Move toward target
  const newPosition = moveTowards(snake.position, targetPoint, moveSpeed * dt);
  
  // Check collision and update position
  if (!checkWallCollision(snake, newPosition, walls)) {
    snake.position = newPosition;
  } else if (snake.isChasing) {
    // If blocked by wall while chasing, try sliding along the wall
    const slidePosition = slideAlongWall(snake.position, newPosition, walls, snake.size);
    snake.position = slidePosition;
  } else {
    // Use smart pathfinding for patrol behavior
    const smartTarget = findPathAroundWalls(snake.position, targetPoint, walls, snake.size);
    const smartNewPosition = moveTowards(snake.position, smartTarget, moveSpeed * dt);
    
    if (!checkWallCollision(snake, smartNewPosition, walls)) {
      snake.position = smartNewPosition;
    } else {
      // If still blocked during patrol, skip to next patrol point
      snake.currentPatrolIndex += snake.patrolDirection;
      
      // Reverse direction if we've reached the end
      if (snake.currentPatrolIndex >= snake.patrolPoints.length) {
        snake.currentPatrolIndex = snake.patrolPoints.length - 2;
        snake.patrolDirection = -1;
      } else if (snake.currentPatrolIndex < 0) {
        snake.currentPatrolIndex = 1;
        snake.patrolDirection = 1;
      }
    }
  }

  snake.direction = getDirectionVector(snake.position, targetPoint);
  return snake;
}

function updateBursterSnake(snake: Snake, walls: Wall[], dt: number, player?: Player, currentTime?: number): Snake {
  let targetPoint: Position = snake.position;
  
  // Check if currently dashing
  if (snake.isDashing && snake.dashStartTime && snake.dashDuration && currentTime) {
    const dashElapsed = (currentTime - snake.dashStartTime) / 1000;
    
    if (dashElapsed >= snake.dashDuration) {
      // End dash
      snake.isDashing = false;
      snake.dashStartTime = undefined;
      snake.dashTarget = undefined;
    } else if (snake.dashTarget) {
      // Continue dash toward target
      const dashTarget = snake.dashTarget; // Store reference before potential modification
      const dashSpeed = snake.dashSpeed || 200;
      const newPosition = moveTowards(snake.position, dashTarget, dashSpeed * dt);
      
      // Check collision and update position
      if (!checkWallCollision(snake, newPosition, walls)) {
        snake.position = newPosition;
        snake.direction = getDirectionVector(snake.position, dashTarget);
      } else {
        // Hit a wall, end dash early
        snake.isDashing = false;
        snake.dashStartTime = undefined;
        snake.dashTarget = undefined;
      }
      
      return snake;
    }
  }
  
  // Check if snake can see the player
  let canSeePlayer = false;
  if (player && snake.sightRange > 0) {
    const distanceToPlayer = getDistance(snake.position, player.position);
    canSeePlayer = distanceToPlayer <= snake.sightRange && 
                   hasLineOfSight(snake.position, player.position, walls, snake.sightRange);
  }
  
  // Update lost sight cooldown
  if (snake.lostSightCooldown && snake.lostSightCooldown > 0) {
    snake.lostSightCooldown -= dt;
  }

  if (canSeePlayer && !snake.isDashing && player) {
    // Start dash attack - predict where player will be
    const playerVelocity = { x: 0, y: 0 }; // Could track this if needed
    const predictTime = 0.3; // Predict 0.3 seconds ahead
    const predictedPosition = {
      x: player.position.x + playerVelocity.x * predictTime,
      y: player.position.y + playerVelocity.y * predictTime
    };
    
    snake.isDashing = true;
    snake.dashStartTime = currentTime;
    snake.dashTarget = predictedPosition;
    snake.lostSightCooldown = 2.0;
    targetPoint = predictedPosition;
  } else if (snake.lostSightCooldown && snake.lostSightCooldown > 0 && snake.lastSeenPlayer) {
    // Move toward last seen position briefly
    targetPoint = snake.lastSeenPlayer;  
  } else {
    // Patrol behavior
    snake.lastSeenPlayer = undefined;
    targetPoint = getPatrolTarget(snake);
  }
  
  if (canSeePlayer && player) {
    snake.lastSeenPlayer = { ...player.position };
  }

  // If not dashing, move normally
  if (!snake.isDashing) {
    const newPosition = moveTowards(snake.position, targetPoint, snake.speed * dt);
    
    // Check collision and update position
    if (!checkWallCollision(snake, newPosition, walls)) {
      snake.position = newPosition;
    } else if (snake.isChasing) {
      // If blocked by wall while chasing, try sliding along the wall
      const slidePosition = slideAlongWall(snake.position, newPosition, walls, snake.size);
      snake.position = slidePosition;
    } else {
      // Use smart pathfinding for patrol behavior
      const smartTarget = findPathAroundWalls(snake.position, targetPoint, walls, snake.size);
      const smartNewPosition = moveTowards(snake.position, smartTarget, snake.speed * dt);
      
      if (!checkWallCollision(snake, smartNewPosition, walls)) {
        snake.position = smartNewPosition;
      } else {
        // If still blocked during patrol, skip to next patrol point
        snake.currentPatrolIndex += snake.patrolDirection;
        
        // Reverse direction if we've reached the end
        if (snake.currentPatrolIndex >= snake.patrolPoints.length) {
          snake.currentPatrolIndex = snake.patrolPoints.length - 2;
          snake.patrolDirection = -1;
        } else if (snake.currentPatrolIndex < 0) {
          snake.currentPatrolIndex = 1;
          snake.patrolDirection = 1;
        }
      }
    }
  }

  snake.direction = getDirectionVector(snake.position, targetPoint);
  return snake;
}

function getPatrolTarget(snake: Snake): Position {
  if (!snake.patrolPoints || snake.patrolPoints.length === 0) {
    return snake.position;
  }
  
  // Ensure currentPatrolIndex is valid
  if (typeof snake.currentPatrolIndex !== 'number' || snake.currentPatrolIndex < 0 || snake.currentPatrolIndex >= snake.patrolPoints.length) {
    snake.currentPatrolIndex = 0;
  }
  
  // Get current patrol target and validate it
  const currentTarget = snake.patrolPoints[snake.currentPatrolIndex];
  if (!currentTarget || typeof currentTarget.x !== 'number' || typeof currentTarget.y !== 'number') {
    return snake.position;
  }
  
  // Check if we've reached the current patrol point
  const distanceToPatrol = getDistance(snake.position, currentTarget);
  if (distanceToPatrol < 15) {
    // Move to next patrol point
    snake.currentPatrolIndex += snake.patrolDirection;
    
    // Reverse direction if we've reached the end
    if (snake.currentPatrolIndex >= snake.patrolPoints.length) {
      snake.currentPatrolIndex = Math.max(0, snake.patrolPoints.length - 2);
      snake.patrolDirection = -1;
    } else if (snake.currentPatrolIndex < 0) {
      snake.currentPatrolIndex = Math.min(1, snake.patrolPoints.length - 1);
      snake.patrolDirection = 1;
    }
    
    // Validate the new target
    const newTarget = snake.patrolPoints[snake.currentPatrolIndex];
    if (!newTarget || typeof newTarget.x !== 'number' || typeof newTarget.y !== 'number') {
      return snake.position;
    }
  }
  
  return snake.patrolPoints[snake.currentPatrolIndex];
}

function checkWallCollision(snake: Snake, newPosition: Position, walls: Wall[]): boolean {
  const snakeRect = {
    x: newPosition.x,
    y: newPosition.y,
    width: snake.size.width,
    height: snake.size.height
  };

  for (const wall of walls) {
    if (checkAABBCollision(snakeRect, wall)) {
      return true;
    }
  }
  
  return false;
}

function updateScreensaverSnake(snake: Snake, walls: Wall[], dt: number): Snake {
  // All screensaver snakes use the same behavior
  // Eight cardinal directions: N, NE, E, SE, S, SW, W, NW
  const cardinalDirections = [
    { x: 0, y: -1 },   // North
    { x: 1, y: -1 },   // Northeast
    { x: 1, y: 0 },    // East
    { x: 1, y: 1 },    // Southeast
    { x: 0, y: 1 },    // South
    { x: -1, y: 1 },   // Southwest
    { x: -1, y: 0 },   // West
    { x: -1, y: -1 }   // Northwest
  ];

  // If direction is not set or is zero, pick a random cardinal direction
  if (!snake.direction || (snake.direction.x === 0 && snake.direction.y === 0)) {
    const randomIndex = Math.floor(Math.random() * cardinalDirections.length);
    snake.direction = { ...cardinalDirections[randomIndex] };
  }

  // Calculate new position based on current direction
  const newPosition = {
    x: snake.position.x + snake.direction.x * snake.speed * dt,
    y: snake.position.y + snake.direction.y * snake.speed * dt
  };

  // Check for wall collision
  if (checkWallCollision(snake, newPosition, walls)) {
    // Hit a wall, pick a new random direction
    const randomIndex = Math.floor(Math.random() * cardinalDirections.length);
    snake.direction = { ...cardinalDirections[randomIndex] };
    
    // Try moving in the new direction
    const retryPosition = {
      x: snake.position.x + snake.direction.x * snake.speed * dt,
      y: snake.position.y + snake.direction.y * snake.speed * dt
    };
    
    // If the new direction is also blocked, stay in place for this frame
    if (!checkWallCollision(snake, retryPosition, walls)) {
      snake.position = retryPosition;
    }
  } else {
    // No collision, move normally
    snake.position = newPosition;
  }

  // Keep current direction for next frame
  return snake;
}

function updatePlumberSnake(snake: Snake, walls: Wall[], dt: number, player?: Player, gameState?: any): Snake {
  // Check if we have the required game state
  if (!gameState || !gameState.patternTiles) {
    return snake; // No game state available
  }
  
  // Only move on level 4
  if (gameState.currentLevel !== 3) {
    return snake; // Level 4 is 0-indexed as 3
  }

  const currentTime = performance.now() / 1000;
  
  // Check if snake has reached its target
  const hasReachedTarget = snake.chaseTarget && getDistance(
    {
      x: snake.position.x + snake.size.width / 2,
      y: snake.position.y + snake.size.height / 2
    },
    {
      x: snake.chaseTarget.x + snake.size.width / 2,
      y: snake.chaseTarget.y + snake.size.height / 2
    }
  ) < 5; // 5 pixel threshold
  
  // Start pause when reaching target
  if (hasReachedTarget && !snake.isPaused) {
    snake.isPaused = true;
    snake.pauseStartTime = currentTime;
    
    // Find the tile the snake is on and mark it for rotation
    const currentTile = gameState.patternTiles.find((tile: any) => {
      const snakeCenter = {
        x: snake.position.x + snake.size.width / 2,
        y: snake.position.y + snake.size.height / 2
      };
      return (
        snakeCenter.x >= tile.x &&
        snakeCenter.x <= tile.x + tile.width &&
        snakeCenter.y >= tile.y &&
        snakeCenter.y <= tile.y + tile.height
      );
    });
    
    if (currentTile) {
      snake.tileToRotate = currentTile.id;
    }
    
    return snake;
  }
  
  // Check if pause is complete (1 second)
  const pauseComplete = snake.isPaused && snake.pauseStartTime && (currentTime - snake.pauseStartTime >= 1.0);
  
  // Pick new random target when pause is complete or no target set
  if (pauseComplete || !snake.chaseTarget) {
    // Reset pause state
    snake.isPaused = false;
    snake.pauseStartTime = undefined;
    
    // Pick a random tile from the grid
    const randomTileIndex = Math.floor(Math.random() * gameState.patternTiles.length);
    const targetTile = gameState.patternTiles[randomTileIndex];
    
    // Set target to center of the random tile
    snake.chaseTarget = {
      x: targetTile.x + targetTile.width / 2 - snake.size.width / 2,
      y: targetTile.y + targetTile.height / 2 - snake.size.height / 2
    };
  }
  
  // Move toward current target (but not if paused)
  if (snake.chaseTarget && !snake.isPaused) {
    const newPosition = moveTowards(snake.position, snake.chaseTarget, snake.speed * dt);
    snake.position = newPosition;
    snake.direction = getDirectionVector(snake.position, snake.chaseTarget);
  }
  
  return snake;
}

function updateSpitterSnake(snake: Snake, walls: Wall[], dt: number): Snake {
  // If snake has patrol points, follow them (like guard/stalker snakes)
  if (snake.patrolPoints && snake.patrolPoints.length > 0) {
    // Use patrol behavior like other snakes
    const targetPoint = getPatrolTarget(snake);
    
    // Move toward patrol target
    const newPosition = moveTowards(snake.position, targetPoint, snake.speed * dt);
    
    // Check collision and update position
    if (!checkWallCollision(snake, newPosition, walls)) {
      snake.position = newPosition;
    } else {
      // Use smart pathfinding for patrol behavior
      const smartTarget = findPathAroundWalls(snake.position, targetPoint, walls, snake.size);
      const smartNewPosition = moveTowards(snake.position, smartTarget, snake.speed * dt);
      
      if (!checkWallCollision(snake, smartNewPosition, walls)) {
        snake.position = smartNewPosition;
      } else {
        // If still blocked during patrol, skip to next patrol point
        snake.currentPatrolIndex += snake.patrolDirection;
        
        // Reverse direction if we've reached the end
        if (snake.currentPatrolIndex >= snake.patrolPoints.length) {
          snake.currentPatrolIndex = Math.max(0, snake.patrolPoints.length - 2);
          snake.patrolDirection = -1;
        } else if (snake.currentPatrolIndex < 0) {
          snake.currentPatrolIndex = Math.min(1, snake.patrolPoints.length - 1);
          snake.patrolDirection = 1;
        }
      }
    }
    
    // Update direction for visual purposes
    snake.direction = getDirectionVector(snake.position, targetPoint);
  } else {
    // Fallback to old behavior if no patrol points
    // Initialize movement axis if not set
    if (!snake.movementAxis) {
      // Randomly choose horizontal or vertical movement
      snake.movementAxis = Math.random() < 0.5 ? 'horizontal' : 'vertical';
      
      // Set initial direction based on movement axis
      if (snake.movementAxis === 'horizontal') {
        snake.direction = { x: 1, y: 0 }; // Start moving east
      } else {
        snake.direction = { x: 0, y: 1 }; // Start moving south
      }
    }

    // Calculate new position
    const newPosition = {
      x: snake.position.x + snake.direction.x * snake.speed * dt,
      y: snake.position.y + snake.direction.y * snake.speed * dt
    };

    // Check for wall collision
    if (checkWallCollision(snake, newPosition, walls)) {
      // Hit a wall, reverse direction
      snake.direction = {
        x: -snake.direction.x,
        y: -snake.direction.y
      };
      
      // Try moving in the reversed direction
      const reversedPosition = {
        x: snake.position.x + snake.direction.x * snake.speed * dt,
        y: snake.position.y + snake.direction.y * snake.speed * dt
      };
      
      // Only move if the reversed direction is clear
      if (!checkWallCollision(snake, reversedPosition, walls)) {
        snake.position = reversedPosition;
      }
    } else {
      // No collision, move normally
      snake.position = newPosition;
    }
  }

  return snake;
}

function updatePhotophobicSnake(snake: Snake, walls: Wall[], dt: number, player?: Player, sounds?: Position[], currentTime?: number, gameState?: any): Snake {
  if (!player || !currentTime) return snake;

  // Determine which quadrant the snake is in
  const isInTopLeft = snake.position.x < 390 && snake.position.y < 290;
  const isInTopRight = snake.position.x > 410 && snake.position.y < 290;
  const isInBottomLeft = snake.position.x < 390 && snake.position.y > 310;
  const isInBottomRight = snake.position.x > 410 && snake.position.y > 310;

  // Get lighting state from game state (passed through gameState parameter)
  let isDark = false;
  
  if (gameState) {
    if (gameState.currentLevel === 4) {
      // Level 5 (0-indexed as 4) - Use quadrant-based lighting
      if (gameState.quadrantLighting) {
        const lighting = gameState.quadrantLighting;
        if (isInTopLeft) {
          isDark = !lighting.topLeft;
        } else if (isInTopRight) {
          isDark = !lighting.topRight;
        } else if (isInBottomLeft) {
          isDark = !lighting.bottomLeft;
        } else if (isInBottomRight) {
          isDark = !lighting.bottomRight;
        }
      }
    } else if (gameState.currentLevel === 5) {
      // Level 6 (0-indexed as 5) - Use boulder-based full-map lighting
      // ON → OFF (1st) → ON (2nd) → OFF (3rd) → ON (4th)
      const destroyedBoulders = gameState.boulders?.filter(boulder => boulder.isDestroyed) || [];
      const destroyedCount = destroyedBoulders.length;
      
      if (destroyedCount === 0) {
        isDark = false; // Light is on at start
      } else if (destroyedCount === 1) {
        isDark = true;  // Light is off after 1st boulder
      } else if (destroyedCount === 2) {
        isDark = false; // Light is on after 2nd boulder
      } else if (destroyedCount === 3) {
        isDark = true;  // Light is off after 3rd boulder
      } else {
        isDark = false; // Light is on after 4th boulder
      }
    }
  }
  
  // Check if currently paused (100ms pause states)
  if (snake.isPaused && snake.pauseStartTime) {
    if (currentTime - snake.pauseStartTime >= 100) { // 100ms
      snake.isPaused = false;
      snake.pauseStartTime = undefined;
      
      // After pause, start charging at captured player position
      if (snake.chargeDirection) {
        snake.isCharging = true;
      }
    } else {
      return snake; // Stay still during pause
    }
  }

  // Dark state behavior - hunt sounds
  if (isDark) {
    snake.isInDarkness = true;
    snake.isBerserk = false;
    snake.isCharging = false;
    snake.chargeDirection = undefined; // Clear any previous charge direction

    // Update sound cooldown
    if (snake.soundCooldown && snake.soundCooldown > 0) {
      snake.soundCooldown -= dt;
    }

    // Check for current sounds to chase
    let nearestSound: Position | null = null;
    let nearestSoundDistance = Infinity;
    
    if (sounds && sounds.length > 0 && snake.hearingRange) {
      for (const sound of sounds) {
        const distanceToSound = getDistance(snake.position, sound);
        if (distanceToSound <= snake.hearingRange && distanceToSound < nearestSoundDistance) {
          nearestSound = sound;
          nearestSoundDistance = distanceToSound;
        }
      }
    }

    if (nearestSound) {
      // Actively chase current sounds
      snake.lastHeardSound = nearestSound;
      snake.isChasing = true;
      snake.soundCooldown = 0;
      
      // Move toward the sound
      const newPosition = moveTowards(snake.position, nearestSound, snake.speed * dt);
      if (!checkWallCollision(snake, newPosition, walls)) {
        snake.position = newPosition;
      } else {
        // Try sliding along wall if blocked
        const slidePosition = slideAlongWall(snake.position, newPosition, walls, snake.size);
        snake.position = slidePosition;
      }
      snake.direction = getDirectionVector(snake.position, nearestSound);
      
    } else if (snake.lastHeardSound && snake.isChasing) {
      // Continue moving toward last heard sound
      const distanceToLastSound = getDistance(snake.position, snake.lastHeardSound);
      
      if (distanceToLastSound > 25) {
        // Still moving toward the last heard sound
        if (!snake.soundCooldown) {
          snake.soundCooldown = 3.0; // Give time to reach the location
        }
        
        const newPosition = moveTowards(snake.position, snake.lastHeardSound, snake.speed * dt);
        if (!checkWallCollision(snake, newPosition, walls)) {
          snake.position = newPosition;
        } else {
          const slidePosition = slideAlongWall(snake.position, newPosition, walls, snake.size);
          snake.position = slidePosition;
        }
        snake.direction = getDirectionVector(snake.position, snake.lastHeardSound);
        
      } else {
        // Reached last sound location, search briefly then stop
        if (!snake.soundCooldown || snake.soundCooldown > 2.0) {
          snake.soundCooldown = 2.0; // 2 seconds to search
        } else {
          snake.soundCooldown -= dt;
          if (snake.soundCooldown <= 0) {
            snake.lastHeardSound = undefined;
            snake.isChasing = false;
            snake.soundCooldown = 0;
          }
        }
      }
      
    } else {
      // Level 6 specific behavior: return to spawn point when player is walking and not in berserk mode
      if (gameState && gameState.currentLevel === 5 && snake.spawnPoint && 
          gameState.player && gameState.player.isWalking) {
        // Return to spawn point when player is walking
        const distanceToSpawn = getDistance(snake.position, snake.spawnPoint);
        
        if (distanceToSpawn > 10) { // If not at spawn point
          const newPosition = moveTowards(snake.position, snake.spawnPoint, snake.speed * dt);
          if (!checkWallCollision(snake, newPosition, walls)) {
            snake.position = newPosition;
          } else {
            // Try sliding along wall if blocked
            const slidePosition = slideAlongWall(snake.position, newPosition, walls, snake.size);
            snake.position = slidePosition;
          }
          snake.direction = getDirectionVector(snake.position, snake.spawnPoint);
        }
      } else {
        // Default behavior: patrol slowly in darkness
        snake.isChasing = false;
        const targetPoint = getPatrolTarget(snake);
        const newPosition = moveTowards(snake.position, targetPoint, (snake.speed * 0.5) * dt); // Half speed patrol
        
        if (!checkWallCollision(snake, newPosition, walls)) {
          snake.position = newPosition;
        }
        snake.direction = getDirectionVector(snake.position, targetPoint);
      }
    }
    
    return snake;
  }

  // Light state - berserk mode
  snake.isInDarkness = false;
  snake.isBerserk = true;

  // Check if snake can see player
  const distanceToPlayer = getDistance(snake.position, player.position);
  const canSeePlayer = distanceToPlayer <= snake.sightRange && 
                      hasLineOfSight(snake.position, player.position, walls, snake.sightRange);

  // If charging and hit a wall, pause and redirect
  if (snake.isCharging && snake.chargeDirection) {
    const chargePosition = {
      x: snake.position.x + snake.chargeDirection.x * snake.chaseSpeed * dt,
      y: snake.position.y + snake.chargeDirection.y * snake.chaseSpeed * dt
    };

    if (checkWallCollision(snake, chargePosition, walls)) {
      // Hit wall during charge - pause for 100ms then redirect to player
      snake.isPaused = true;
      snake.pauseStartTime = currentTime;
      snake.isCharging = false;
      snake.chargeDirection = undefined;
      
      // Set new charge direction toward player's current position
      snake.chargeDirection = getDirectionVector(snake.position, player.position);
      
      return snake;
    } else {
      // Continue charging
      snake.position = chargePosition;
      return snake;
    }
  }

  // If can see player and not currently paused/charging, start charge sequence
  if (canSeePlayer && !snake.isPaused && !snake.isCharging) {
    // Capture player's current position for charge direction
    snake.chargeDirection = getDirectionVector(snake.position, player.position);
    
    // Start 100ms pause
    snake.isPaused = true;
    snake.pauseStartTime = currentTime;
    snake.isChasing = true;
    
    return snake;
  }

  // If not charging and not paused, patrol quickly
  if (!snake.isCharging && !snake.isPaused) {
    const targetPoint = getPatrolTarget(snake);
    const newPosition = moveTowards(snake.position, targetPoint, snake.chaseSpeed * dt);
    
    if (!checkWallCollision(snake, newPosition, walls)) {
      snake.position = newPosition;
    } else {
      // Skip to next patrol point if blocked
      snake.currentPatrolIndex += snake.patrolDirection;
      if (snake.currentPatrolIndex >= snake.patrolPoints.length) {
        snake.currentPatrolIndex = snake.patrolPoints.length - 2;
        snake.patrolDirection = -1;
      } else if (snake.currentPatrolIndex < 0) {
        snake.currentPatrolIndex = 1;
        snake.patrolDirection = 1;
      }
    }
    
    snake.direction = getDirectionVector(snake.position, targetPoint);
  }

  return snake;
}

function updateRattlesnakeSnake(snake: Snake, walls: Wall[], dt: number, player?: Player): Snake {
  // Skip processing if snake is still in pit
  if (snake.isInPit) {
    return snake;
  }

  // Rattlesnakes patrol when emerged and can chase if they see the player
  let targetPoint: Position = snake.position;
  
  // Check if can see player and start chasing
  if (player && snake.sightRange && snake.hearingRange) {
    const distanceToPlayer = getDistance(snake.position, player.position);
    const canSeePlayer = distanceToPlayer <= snake.sightRange && 
                        hasLineOfSight(snake.position, player.position, walls, snake.sightRange);
    
    // Also check hearing range for rattlesnakes
    const canHearPlayer = distanceToPlayer <= snake.hearingRange;
    
    if (canSeePlayer || canHearPlayer) {
      snake.isChasing = true;
      targetPoint = player.position;
    } else if (snake.isChasing) {
      // Lost sight/sound, stop chasing after cooldown
      snake.lostSightCooldown = (snake.lostSightCooldown || 0) + dt;
      if (snake.lostSightCooldown >= 2.0) { // 2 second cooldown
        snake.isChasing = false;
        snake.lostSightCooldown = 0;
      } else {
        // Continue chasing for a bit
        targetPoint = player.position;
      }
    } else {
      // Default patrol behavior
      targetPoint = getPatrolTarget(snake);
    }
  } else {
    // No player reference, just patrol
    targetPoint = getPatrolTarget(snake);
  }
  
  // Calculate movement speed
  const moveSpeed = snake.isChasing ? snake.chaseSpeed : snake.speed;
  
  // Move toward target
  const newPosition = moveTowards(snake.position, targetPoint, moveSpeed * dt);
  
  // Check collision and update position
  if (!checkWallCollision(snake, newPosition, walls)) {
    snake.position = newPosition;
  } else if (snake.isChasing) {
    // If blocked by wall while chasing, try sliding along the wall
    const slidePosition = slideAlongWall(snake.position, newPosition, walls, snake.size);
    snake.position = slidePosition;
  } else {
    // Use smart pathfinding for patrol behavior
    const smartTarget = findPathAroundWalls(snake.position, targetPoint, walls, snake.size);
    const smartNewPosition = moveTowards(snake.position, smartTarget, moveSpeed * dt);
    
    if (!checkWallCollision(snake, smartNewPosition, walls)) {
      snake.position = smartNewPosition;
    } else {
      // If still blocked during patrol, skip to next patrol point
      snake.currentPatrolIndex += snake.patrolDirection;
      
      // Reverse direction if we've reached the end
      if (snake.currentPatrolIndex >= snake.patrolPoints.length) {
        snake.currentPatrolIndex = snake.patrolPoints.length - 2;
        snake.patrolDirection = -1;
      } else if (snake.currentPatrolIndex < 0) {
        snake.currentPatrolIndex = 1;
        snake.patrolDirection = 1;
      }
    }
  }

  snake.direction = getDirectionVector(snake.position, targetPoint);
  return snake;
}