import { Snake, Player, Wall, Position } from "./types";
import { checkAABBCollision, getDistance, moveTowards, hasLineOfSight, getDirectionVector, findPathAroundWalls, slideAlongWall } from "./collision";

export function updateSnake(snake: Snake, walls: Wall[], deltaTime: number, player?: Player, sounds?: Position[], gameState?: any): Snake {
  const currentTime = Date.now();
  
  // Convert deltaTime from milliseconds to seconds for calculations
  const dt = deltaTime / 1000;
  


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
  
  if (nearestSound) {
    // Continuously follow current sounds with no cooldown
    snake.lastHeardSound = nearestSound;
    snake.isChasing = true;
    targetPoint = nearestSound;
    
    // Reset sound cooldown since we're actively hearing the player
    snake.soundCooldown = 0;
  } else if (snake.lastHeardSound && snake.isChasing) {
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
  


  if (canSeePlayer && player) {
    // Chase the player
    snake.isChasing = true;
    snake.chaseTarget = { ...player.position };
    snake.lastSeenPlayer = { ...player.position };
    snake.lostSightCooldown = 3.0; // Keep chasing for 3 seconds after losing sight
    targetPoint = player.position;
  } else if (snake.isChasing && snake.lastSeenPlayer && snake.lostSightCooldown && snake.lostSightCooldown > 0) {
    // Continue chasing last seen position for a while
    targetPoint = snake.lastSeenPlayer;
  } else if (snake.isChasing && snake.chaseTarget) {
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
  if (snake.patrolPoints.length === 0) {
    return snake.position;
  }
  
  // Get current patrol target
  const currentTarget = snake.patrolPoints[snake.currentPatrolIndex];
  
  // Check if we've reached the current patrol point
  const distanceToPatrol = getDistance(snake.position, currentTarget);
  if (distanceToPatrol < 15) {
    // Move to next patrol point
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
  if (!gameState || !gameState.patternTiles || !gameState.getTileDirections) {
    return snake; // No game state available
  }
  
  // Only move on pipe tiles in level 4
  if (gameState.currentLevel !== 3) {
    return snake; // Level 4 is 0-indexed as 3
  }
  

  
  // Find current tile the snake is on
  const currentTile = gameState.patternTiles.find(tile => {
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
  
  // If not on a tile, find the nearest tile and move toward it
  if (!currentTile) {
    const nearestTile = gameState.patternTiles.reduce((nearest, tile) => {
      const snakeCenter = {
        x: snake.position.x + snake.size.width / 2,
        y: snake.position.y + snake.size.height / 2
      };
      const tileCenterDistance = getDistance(snakeCenter, {
        x: tile.x + tile.width / 2,
        y: tile.y + tile.height / 2
      });
      const nearestDistance = getDistance(snakeCenter, {
        x: nearest.x + nearest.width / 2,
        y: nearest.y + nearest.height / 2
      });
      return tileCenterDistance < nearestDistance ? tile : nearest;
    }, gameState.patternTiles[0]);
    
    if (nearestTile) {
      const targetPosition = {
        x: nearestTile.x + nearestTile.width / 2 - snake.size.width / 2,
        y: nearestTile.y + nearestTile.height / 2 - snake.size.height / 2
      };
      const newPosition = moveTowards(snake.position, targetPosition, snake.speed * dt);
      snake.position = newPosition;
      snake.direction = getDirectionVector(snake.position, targetPosition);
    }
    return snake;
  }
  
  // Check if we need to pick a new direction (reached center or no direction set)
  const tileCenter = {
    x: currentTile.x + currentTile.width / 2,
    y: currentTile.y + currentTile.height / 2
  };
  const snakeCenter = {
    x: snake.position.x + snake.size.width / 2,
    y: snake.position.y + snake.size.height / 2
  };
  
  const distanceToCenter = getDistance(snakeCenter, tileCenter);
  const hasEnteredNewTile = snake.currentTileId !== currentTile.id;
  
  // Check if snake has reached the center of the tile (within a small threshold)
  const hasReachedCenter = distanceToCenter < 5; // 5 pixel threshold
  
  // Check if current direction has an available outlet
  const currentDirectionBlocked = (() => {
    if (!snake.direction.x && !snake.direction.y) return true; // No direction set
    
    const availableDirections = gameState.getTileDirections(currentTile.id);
    let currentDirectionName: 'north' | 'south' | 'east' | 'west';
    
    if (snake.direction.x > 0) currentDirectionName = 'east';
    else if (snake.direction.x < 0) currentDirectionName = 'west';
    else if (snake.direction.y > 0) currentDirectionName = 'south';
    else currentDirectionName = 'north';
    
    return !availableDirections.includes(currentDirectionName);
  })();
  
  const currentTime = performance.now() / 1000;
  
  // Handle pause logic when reaching center
  if (hasReachedCenter && !snake.isPaused && !currentDirectionBlocked) {
    // Start pause when reaching center
    snake.isPaused = true;
    snake.pauseStartTime = currentTime;
    snake.chaseTarget = undefined; // Stop moving
    return snake;
  }
  
  // Check if pause is complete
  const pauseComplete = snake.isPaused && snake.pauseStartTime && (currentTime - snake.pauseStartTime >= 0.1); // 100ms pause
  
  // Only pick new direction when pause is complete or direction is blocked
  const shouldPickNewDirection = (hasEnteredNewTile && pauseComplete) || currentDirectionBlocked;
  
  // If we've entered a new tile but haven't reached center, head to center first
  if (hasEnteredNewTile && !hasReachedCenter) {
    snake.currentTileId = currentTile.id;
    snake.isPaused = false; // Reset pause state for new tile
    snake.pauseStartTime = undefined;
    snake.chaseTarget = {
      x: tileCenter.x - snake.size.width / 2,
      y: tileCenter.y - snake.size.height / 2
    };
  } else if (shouldPickNewDirection) {
    // Reset pause state when picking new direction
    snake.isPaused = false;
    snake.pauseStartTime = undefined;
    // Check for time-based rotation trigger
    if (snake.nextRotationTime && currentTime >= snake.nextRotationTime) {
      // Mark the current tile for rotation
      snake.tileToRotate = currentTile.id;
      // Set next rotation time (4-6 seconds from now)
      snake.nextRotationTime = currentTime + 4 + Math.random() * 2;
    }
    
    snake.currentTileId = currentTile.id;
    
    // Get available directions for current tile (after potential rotation)
    const availableDirections = gameState.getTileDirections(currentTile.id);
    
    if (availableDirections.length === 0) {
      // No directions available, stay in place
      return snake;
    }
    
    // Always choose a random available direction after pause
    const randomIndex = Math.floor(Math.random() * availableDirections.length);
    const bestDirection = availableDirections[randomIndex];
    
    // Set target position for chosen direction
    let targetRow = parseInt(currentTile.id.match(/grid_tile_(\d+)_(\d+)/)?.[1] || '0');
    let targetCol = parseInt(currentTile.id.match(/grid_tile_(\d+)_(\d+)/)?.[2] || '0');
    
    switch (bestDirection) {
      case 'north': targetRow--; break;
      case 'south': targetRow++; break;
      case 'east': targetCol++; break;
      case 'west': targetCol--; break;
    }
    
    const targetTileId = `grid_tile_${targetRow}_${targetCol}`;
    const targetTile = gameState.patternTiles.find(t => t.id === targetTileId);
    
    if (targetTile) {
      snake.chaseTarget = {
        x: targetTile.x + targetTile.width / 2 - snake.size.width / 2,
        y: targetTile.y + targetTile.height / 2 - snake.size.height / 2
      };
    }
  }
  
  // Move toward current target (but not if paused)
  if (snake.chaseTarget && !snake.isPaused) {
    const newPosition = moveTowards(snake.position, snake.chaseTarget, snake.speed * dt);
    snake.position = newPosition;
    snake.direction = getDirectionVector(snake.position, snake.chaseTarget);
  }
  
  return snake;
}