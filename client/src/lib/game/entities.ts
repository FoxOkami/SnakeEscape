import { Snake, Player, Wall, Position } from "./types";
import { checkAABBCollision, getDistance, moveTowards, hasLineOfSight, getDirectionVector } from "./collision";

export function updateSnake(snake: Snake, walls: Wall[], deltaTime: number, player?: Player, sounds?: Position[]): Snake {
  const currentTime = Date.now();
  
  // Convert deltaTime from milliseconds to seconds for calculations
  const dt = deltaTime / 1000;
  
  // Debug logging - much less frequent
  if (Math.random() < 0.001) { // Very occasional logging
    console.log(`Snake ${snake.id} update:`, {
      position: snake.position,
      deltaTime: dt,
      type: snake.type,
      speed: snake.speed
    });
  }

  // Handle different snake types
  switch (snake.type) {
    case 'stalker':
      return updateStalkerSnake(snake, walls, dt, player, sounds);
    case 'guard':
      return updateGuardSnake(snake, walls, dt, player);
    case 'burster':
      return updateBursterSnake(snake, walls, dt, player, currentTime);
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
  
  if (nearestSound && (!snake.soundCooldown || snake.soundCooldown <= 0)) {
    // Move toward sound
    snake.lastHeardSound = nearestSound;
    snake.soundCooldown = 2.0; // 2 second cooldown before responding to new sounds
    targetPoint = nearestSound;
  } else if (snake.lastHeardSound) {
    // Continue moving toward last heard sound
    targetPoint = snake.lastHeardSound;
    
    // Stop if we've reached the sound location
    const distanceToSound = getDistance(snake.position, targetPoint);
    if (distanceToSound < 20) {
      snake.lastHeardSound = undefined;
    }
  } else {
    // Default patrol behavior when no sounds
    targetPoint = getPatrolTarget(snake);
  }
  
  // Move toward target
  const newPosition = moveTowards(snake.position, targetPoint, snake.speed * dt);
  
  // Check collision and update position
  if (!checkWallCollision(snake, newPosition, walls)) {
    snake.position = newPosition;
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