import { Snake, Wall, Player, Position, Boulder } from './types';
import { getDistance, moveTowards, findPathAroundWalls, slideAlongWall, getDirectionVector, checkAABBCollision } from './collision';

// Helper function to check wall collision for snake
function checkWallCollision(snake: Snake, newPosition: Position, walls: Wall[]): boolean {
  const snakeRect = {
    x: newPosition.x,
    y: newPosition.y,
    width: snake.size.width,
    height: snake.size.height
  };
  
  return walls.some(wall => checkAABBCollision(snakeRect, wall));
}

// Helper function to check boulder collision for snake
function checkBoulderCollision(snake: Snake, newPosition: Position, boulders: Boulder[]): Boulder | null {
  const snakeRect = {
    x: newPosition.x,
    y: newPosition.y,
    width: snake.size.width,
    height: snake.size.height
  };
  
  for (const boulder of boulders) {
    if (!boulder.isDestroyed && checkAABBCollision(snakeRect, boulder)) {
      return boulder;
    }
  }
  return null;
}

function getWallCollisionInfo(snake: Snake, newPosition: Position, walls: Wall[]): { hit: boolean; wall?: Wall; normal?: { x: number; y: number } } {
  const snakeRect = {
    x: newPosition.x,
    y: newPosition.y,
    width: snake.size.width,
    height: snake.size.height
  };
  
  for (const wall of walls) {
    if (checkAABBCollision(snakeRect, wall)) {
      // Calculate which side of the wall was hit to determine normal
      const snakeCenter = {
        x: snakeRect.x + snakeRect.width / 2,
        y: snakeRect.y + snakeRect.height / 2
      };
      
      const wallCenter = {
        x: wall.x + wall.width / 2,
        y: wall.y + wall.height / 2
      };
      
      // Calculate overlap on each axis
      const overlapX = Math.min(snakeRect.x + snakeRect.width - wall.x, wall.x + wall.width - snakeRect.x);
      const overlapY = Math.min(snakeRect.y + snakeRect.height - wall.y, wall.y + wall.height - snakeRect.y);
      
      let normal = { x: 0, y: 0 };
      
      // Determine collision normal based on smallest overlap
      if (overlapX < overlapY) {
        // Horizontal collision (left or right side of wall)
        normal.x = snakeCenter.x < wallCenter.x ? -1 : 1;
        normal.y = 0;
      } else {
        // Vertical collision (top or bottom side of wall)
        normal.x = 0;
        normal.y = snakeCenter.y < wallCenter.y ? -1 : 1;
      }
      
      return { hit: true, wall, normal };
    }
  }
  
  return { hit: false };
}

function reflectVector(incident: { x: number; y: number }, normal: { x: number; y: number }): { x: number; y: number } {
  // Formula: reflected = incident - 2 * (incident · normal) * normal
  const dotProduct = incident.x * normal.x + incident.y * normal.y;
  return {
    x: incident.x - 2 * dotProduct * normal.x,
    y: incident.y - 2 * dotProduct * normal.y
  };
}

function clampToBounds(position: Position, snakeSize: { width: number; height: number }, bounds?: { width: number; height: number }): Position {
  // Default to Level 6 boundaries if bounds not provided
  const levelBounds = bounds || { width: 800, height: 600 };
  
  // Level boundaries: walls at 0,0 with thickness 20, so playable area is 20 to bounds.width-20
  const minX = 20;
  const maxX = levelBounds.width - 20 - snakeSize.width;
  const minY = 20;
  const maxY = levelBounds.height - 20 - snakeSize.height;
  
  return {
    x: Math.max(minX, Math.min(maxX, position.x)),
    y: Math.max(minY, Math.min(maxY, position.y))
  };
}

// Helper function to get patrol target
function getPatrolTarget(snake: Snake): Position {
  if (snake.patrolPoints.length === 0) {
    return snake.position;
  }
  
  // Ensure currentPatrolIndex is within bounds
  const index = Math.max(0, Math.min(snake.currentPatrolIndex, snake.patrolPoints.length - 1));
  return snake.patrolPoints[index];
}

// Helper function to calculate exponential ramped speed during current charge
function calculateChargeRampedSpeed(snake: Snake, currentTime: number): number {
  if (!snake.chargeRampStartTime || !snake.chargeBaseSpeed || !snake.chargeMaxSpeed) {
    return snake.chaseSpeed; // Fallback to current speed if ramping not initialized
  }
  
  const chargeTime = (currentTime - snake.chargeRampStartTime) / 1000; // Convert to seconds
  
  // Exponential curve: speed = baseSpeed + (maxSpeed - baseSpeed) * (1 - e^(-rate * time))
  // This creates a curve that starts slow and accelerates rapidly, then levels off at max speed
  const exponentialRate = 3.0; // Controls how steep the curve is (higher = faster initial acceleration)
  const speedRange = snake.chargeMaxSpeed - snake.chargeBaseSpeed;
  const exponentialFactor = 1 - Math.exp(-exponentialRate * chargeTime);
  const rampedSpeed = snake.chargeBaseSpeed + (speedRange * exponentialFactor);
  
  // Cap at maximum speed (though exponential curve naturally approaches it)
  return Math.min(rampedSpeed, snake.chargeMaxSpeed);
}

export function updateBossSnake(snake: Snake, walls: Wall[], dt: number, player?: Player, currentTime?: number, levelBounds?: { width: number; height: number }, boulders?: Boulder[]): Snake {
  if (!player || !currentTime) {
    // Default patrol behavior when no player is present
    const targetPoint = getPatrolTarget(snake);
    const newPosition = moveTowards(snake.position, targetPoint, snake.speed * dt);
    
    if (!checkWallCollision(snake, newPosition, walls)) {
      snake.position = newPosition;
    }
    
    snake.direction = getDirectionVector(snake.position, targetPoint);
    return snake;
  }

  // Initialize boss state if not set
  if (!snake.bossState) {
    snake.bossState = 'recovering'; // Start with a pause to let player adjust
    snake.pauseStartTime = currentTime;
    snake.bossColor = 'normal';
    snake.isInitialPause = true; // Mark this as the initial pause
    
    // Initialize per-charge ramping speed system for level 6
    if (!snake.chargeBaseSpeed) {
      snake.chargeBaseSpeed = snake.chaseSpeed * 0.3; // Start each charge at 30% of normal speed
    }
    if (!snake.chargeMaxSpeed) {
      snake.chargeMaxSpeed = snake.chaseSpeed * 4.0; // Max speed is 4x normal chase speed
    }
  }

  // Boss "Valerie" attack pattern state machine
  switch (snake.bossState) {
    case 'tracking':
      // Take snapshot of player center position and start pause
      snake.playerSnapshot = { 
        x: player.position.x + player.size.width / 2, 
        y: player.position.y + player.size.height / 2 
      };
      snake.pauseStartTime = currentTime;
      snake.bossState = 'pausing';
      snake.bossColor = 'normal';

      break;

    case 'pausing':
      // Move toward center for 1000ms instead of staying still
      if (currentTime - (snake.pauseStartTime || 0) >= 1000) {
        // Start charging after pause
        snake.bossState = 'charging';
        snake.chargeStartTime = currentTime;
        snake.chargeRampStartTime = currentTime; // Initialize ramping for this charge
        snake.bossColor = 'charging'; // Change to pink color
        snake.isChargingAtSnapshot = true;
        snake.chargeDistanceTraveled = 0; // Reset charge distance counter
        // Calculate and store the charge direction once at the start
        if (snake.playerSnapshot) {
          // Calculate direction from Valerie's center to player snapshot
          const valerieCenter = {
            x: snake.position.x + snake.size.width / 2,
            y: snake.position.y + snake.size.height / 2
          };
          snake.direction = getDirectionVector(valerieCenter, snake.playerSnapshot);

        }
      } else {
        // Move toward center during pause
        const centerX = 400; // Screen center X (800/2)
        const centerY = 300; // Screen center Y (600/2)
        const snakeCenter = {
          x: snake.position.x + snake.size.width / 2,
          y: snake.position.y + snake.size.height / 2
        };
        const targetCenter = { x: centerX, y: centerY };
        
        // Move toward center at a moderate speed (slower than normal chase speed)
        const moveSpeed = snake.chaseSpeed * 0.5; // 50% of normal chase speed
        const newPosition = moveTowards(snake.position, targetCenter, moveSpeed * dt);
        
        // Check for wall collisions during movement to center
        if (!checkWallCollision(snake, newPosition, walls)) {
          snake.position.x = newPosition.x;
          snake.position.y = newPosition.y;
        }
      }
      break;

    case 'charging':
      // Charge in a straight line using stored direction until hitting a wall
      if (snake.direction && snake.playerSnapshot) {
        const currentChargeSpeed = calculateChargeRampedSpeed(snake, currentTime);
        const moveSpeed = currentChargeSpeed; // Use the ramped charge speed directly
        
        // Track total charge distance for proportional recoil
        if (!snake.chargeDistanceTraveled) {
          snake.chargeDistanceTraveled = 0;
        }
        
        // Move in straight line using the stored direction (don't recalculate)
        const chargeDistance = moveSpeed * dt;
        const newPosition = {
          x: snake.position.x + snake.direction.x * chargeDistance,
          y: snake.position.y + snake.direction.y * chargeDistance
        };
        
        // Add to total charge distance
        snake.chargeDistanceTraveled += chargeDistance;
        
        // Check for boulder collision first
        const hitBoulder = boulders ? checkBoulderCollision(snake, newPosition, boulders) : null;
        if (hitBoulder) {
          // Hit a boulder - damage it
          hitBoulder.hitCount += 1;
          if (hitBoulder.hitCount >= hitBoulder.maxHits) {
            hitBoulder.isDestroyed = true;
            hitBoulder.destructionTime = currentTime; // Record when it was destroyed
          }
          
          // Spawn screensaver snake only on first hit of each boulder
          const shouldSpawnScreensaverSnake = !hitBoulder.hasSpawnedScreensaver;
          if (shouldSpawnScreensaverSnake) {
            hitBoulder.hasSpawnedScreensaver = true;
            snake.environmentalEffects = {
              spawnMiniBoulders: false,
              spawnScreensaverSnake: true,
              boulderHitPosition: {
                x: snake.position.x + snake.size.width / 2,
                y: snake.position.y + snake.size.height / 2
              }
            };
          }
          
          // Check if Valerie is at full speed (or close to it)
          const isAtFullSpeed = currentChargeSpeed >= (snake.chargeMaxSpeed || 400) * 0.95; // 95% of max speed
          
          if (isAtFullSpeed) {
            // At full speed - use recoil behavior
            // Calculate reflection direction from boulder
            const snakeCenter = {
              x: snake.position.x + snake.size.width / 2,
              y: snake.position.y + snake.size.height / 2
            };
            const boulderCenter = {
              x: hitBoulder.x + hitBoulder.width / 2,
              y: hitBoulder.y + hitBoulder.height / 2
            };
            
            // Calculate collision normal (from boulder center to snake center)
            const dx = snakeCenter.x - boulderCenter.x;
            const dy = snakeCenter.y - boulderCenter.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            const normal = length > 0 ? { x: dx / length, y: dy / length } : { x: 1, y: 0 };
            
            // Reflect direction off boulder
            const reflectedDirection = reflectVector(snake.direction, normal);
            
            // Start recoil from boulder collision
            let recoilDistance = (snake.chargeDistanceTraveled || 0) * 0.25;
            const minRecoil = snake.size.width * 0.5;
            const maxRecoil = snake.size.width * 2;
            recoilDistance = Math.max(minRecoil, Math.min(maxRecoil, recoilDistance));
            
            let recoilTargetPosition = {
              x: snake.position.x + reflectedDirection.x * recoilDistance,
              y: snake.position.y + reflectedDirection.y * recoilDistance
            };
            
            // Find safe recoil distance
            while (recoilDistance > minRecoil && (checkWallCollision(snake, recoilTargetPosition, walls) || 
                   (boulders && checkBoulderCollision(snake, recoilTargetPosition, boulders)))) {
              recoilDistance *= 0.8;
              recoilTargetPosition = {
                x: snake.position.x + reflectedDirection.x * recoilDistance,
                y: snake.position.y + reflectedDirection.y * recoilDistance
              };
            }
            
            if (levelBounds) {
              recoilTargetPosition = clampToBounds(recoilTargetPosition, snake.size, levelBounds);
            }
            
            snake.bossState = 'recoiling';
            snake.recoilStartTime = currentTime;
            snake.recoilStartPosition = { ...snake.position };
            snake.recoilTargetPosition = recoilTargetPosition;
            snake.recoilDirection = reflectedDirection;
            snake.recoilDuration = 200;
            snake.bossColor = 'stunned';
            snake.isChargingAtSnapshot = false;
            snake.recoilFromBoulder = true; // Mark this recoil as boulder-caused
          } else {
            // Not at full speed - pause for 100ms then charge at player again
            snake.bossState = 'pausing';
            snake.pauseStartTime = currentTime;
            snake.bossColor = 'normal';
            snake.isChargingAtSnapshot = false;
            
            // Take a new snapshot of the player position for the next charge
            snake.playerSnapshot = {
              x: player.position.x + player.size.width / 2,
              y: player.position.y + player.size.height / 2
            };
          }
        } else {
          // Check for wall collision with detailed info
          const collisionInfo = getWallCollisionInfo(snake, newPosition, walls);
          if (collisionInfo.hit && collisionInfo.normal) {
            // Check if Valerie is at full speed (or close to it)
            const isAtFullSpeed = currentChargeSpeed >= (snake.chargeMaxSpeed || 400) * 0.95; // 95% of max speed
            
            if (isAtFullSpeed) {
              // At full speed - use recoil behavior
              // Hit a wall - calculate reflection direction
              const reflectedDirection = reflectVector(snake.direction, collisionInfo.normal);
              
              // Start animated recoil using reflection
              // Use 1/4 of the charge distance traveled for proportional recoil
              let recoilDistance = (snake.chargeDistanceTraveled || 0) * 0.25;
              
              // Ensure minimum recoil distance (half her width) and maximum (2x her width)
              const minRecoil = snake.size.width * 0.5;
              const maxRecoil = snake.size.width * 2;
              recoilDistance = Math.max(minRecoil, Math.min(maxRecoil, recoilDistance));
              
              let recoilTargetPosition = {
                x: snake.position.x + reflectedDirection.x * recoilDistance,
                y: snake.position.y + reflectedDirection.y * recoilDistance
              };
              
              // Find a safe recoil distance by checking progressively shorter distances
              while (recoilDistance > minRecoil && checkWallCollision(snake, recoilTargetPosition, walls)) {
                recoilDistance *= 0.8; // Reduce by 20% each time
                recoilTargetPosition = {
                  x: snake.position.x + reflectedDirection.x * recoilDistance,
                  y: snake.position.y + reflectedDirection.y * recoilDistance
                };
              }
              
              // Apply boundary clamping to ensure target is within playable area
              if (levelBounds) {
                recoilTargetPosition = clampToBounds(recoilTargetPosition, snake.size, levelBounds);
              }
              
              // Always use reflection - no fallback
              snake.bossState = 'recoiling';
              snake.recoilStartPosition = { x: snake.position.x, y: snake.position.y };
              snake.recoilTargetPosition = recoilTargetPosition;
              snake.recoilStartTime = currentTime;
              snake.recoilDirection = reflectedDirection;
              snake.bossColor = 'stunned';
              snake.isChargingAtSnapshot = false;
            } else {
              // Not at full speed - pause for 100ms then charge at player again
              snake.bossState = 'pausing';
              snake.pauseStartTime = currentTime;
              snake.bossColor = 'normal';
              snake.isChargingAtSnapshot = false;
              
              // Take a new snapshot of the player position for the next charge
              snake.playerSnapshot = {
                x: player.position.x + player.size.width / 2,
                y: player.position.y + player.size.height / 2
              };
            }
          } else {
            // Continue charging in same direction
            snake.position = newPosition;
            // Keep the same direction (don't recalculate)
          }
        }
      }
      break;

    case 'recoiling':
      // Animate recoil movement at 3/4 chase speed
      if (snake.recoilStartTime && snake.recoilTargetPosition && snake.recoilDirection) {
        const recoilSpeed = (snake.chaseSpeed || snake.speed) * 0.75; // 3/4 chase speed
        const recoilDistance = recoilSpeed * dt;
        
        // Move toward recoil target
        const newRecoilPosition = {
          x: snake.position.x + snake.recoilDirection.x * recoilDistance,
          y: snake.position.y + snake.recoilDirection.y * recoilDistance
        };
        
        // Check if we've reached the target
        const distanceToTarget = Math.sqrt(
          Math.pow(snake.recoilTargetPosition.x - snake.position.x, 2) +
          Math.pow(snake.recoilTargetPosition.y - snake.position.y, 2)
        );
        
        if (distanceToTarget <= recoilDistance) {
          // Reached target normally - snap to target
          snake.position = snake.recoilTargetPosition;
          
          // Check if this recoil was from a boulder collision
          if (snake.recoilFromBoulder && levelBounds) {
            // Transition to moving to center
            const centerPosition = {
              x: (levelBounds.width / 2) - (snake.size.width / 2),
              y: (levelBounds.height / 2) - (snake.size.height / 2)
            };
            snake.bossState = 'movingToCenter';
            snake.centerTargetPosition = centerPosition;
            snake.recoilFromBoulder = false; // Clear the flag
          } else {
            // Normal recoil completion - enter recovery
            snake.bossState = 'recovering';
            snake.pauseStartTime = currentTime;
          }
          
          snake.bossColor = 'normal'; // Change back to normal color
          snake.isChargingAtSnapshot = false;
          snake.playerSnapshot = undefined;
          snake.direction = { x: 0, y: 0 };
          // Clear recoil properties
          snake.recoilStartPosition = undefined;
          snake.recoilTargetPosition = undefined;
          snake.recoilStartTime = undefined;
          snake.recoilDirection = undefined;
          snake.chargeDistanceTraveled = 0; // Reset for next charge

        } else if (checkWallCollision(snake, newRecoilPosition, walls)) {
          // Hit another wall during recoil - stop at current position and enter recovery
          snake.bossState = 'recovering';
          snake.bossColor = 'normal'; // Change back to normal color
          snake.isChargingAtSnapshot = false;
          snake.playerSnapshot = undefined;
          snake.direction = { x: 0, y: 0 };
          // Clear recoil properties
          snake.recoilStartPosition = undefined;
          snake.recoilTargetPosition = undefined;
          snake.recoilStartTime = undefined;
          snake.recoilDirection = undefined;
          snake.chargeDistanceTraveled = 0; // Reset for next charge
          // Add brief recovery time before next attack
          snake.pauseStartTime = currentTime;

        } else {
          // Continue recoiling safely
          snake.position = newRecoilPosition;
        }
      }
      break;

    case 'movingToCenter':
      // Move to center at double speed after boulder collision
      if (snake.centerTargetPosition) {
        const doubleSpeed = (snake.chaseSpeed || snake.speed) * 2;
        const newPosition = moveTowards(snake.position, snake.centerTargetPosition, doubleSpeed * dt);
        
        // Check if we've reached the center
        const distanceToCenter = getDistance(snake.position, snake.centerTargetPosition);
        if (distanceToCenter <= doubleSpeed * dt) {
          // Reached center - snap to position and start pause
          snake.position = snake.centerTargetPosition;
          snake.bossState = 'centerPause';
          snake.centerPauseStartTime = currentTime;
          snake.centerTargetPosition = undefined; // Clear target
          
          // Increase chase speed by 5% for future chases
          if (!snake.speedBoostApplied) {
            snake.chaseSpeed = (snake.chaseSpeed || snake.speed) * 1.05;
            // Also update the charge speed parameters based on new chase speed
            snake.chargeBaseSpeed = snake.chaseSpeed * 0.3;
            snake.chargeMaxSpeed = snake.chaseSpeed * 4.0;
            snake.speedBoostApplied = true;
          }
        } else if (!checkWallCollision(snake, newPosition, walls)) {
          // Continue moving toward center
          snake.position = newPosition;
          snake.direction = getDirectionVector(snake.position, snake.centerTargetPosition);
        }
      }
      break;

    case 'centerPause':
      // Pause at center for 1 second
      if (currentTime - (snake.centerPauseStartTime || 0) >= 1000) { // 1000ms pause
        snake.bossState = 'tracking'; // Resume tracking player
        snake.centerPauseStartTime = undefined;
      }
      // Stay still during pause
      break;

    case 'recovering':
      // Recovery period before starting next attack cycle
      const recoveryDuration = snake.isInitialPause ? 3000 : 500; // 3 seconds initial, 500ms normal
      if (currentTime - (snake.pauseStartTime || 0) >= recoveryDuration) {
        snake.bossState = 'tracking'; // Start next cycle
        snake.isInitialPause = false; // Clear initial pause flag
      }
      // Stay still during recovery
      break;

    default:
      snake.bossState = 'tracking';
      break;
  }

  snake.isChasing = true;
  return snake;
}