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
    
    // Initialize phase system
    if (!snake.bossPhase) {
      snake.bossPhase = 1; // Start at phase 1
    }
    if (snake.totalBoulderHits === undefined) {
      snake.totalBoulderHits = 0; // Initialize total hit counter
    }
  }

  // Boss "Valerie" attack pattern state machine
  switch (snake.bossState) {
    case 'tracking':
      // Take snapshot of player center position and start charging immediately
      snake.playerSnapshot = { 
        x: player.position.x + player.size.width / 2, 
        y: player.position.y + player.size.height / 2 
      };
      snake.bossState = 'charging';
      snake.chargeStartTime = currentTime;
      snake.chargeRampStartTime = currentTime; // Initialize ramping for this charge
      snake.bossColor = 'charging'; // Change to pink color
      snake.isChargingAtSnapshot = true;
      snake.chargeDistanceTraveled = 0; // Reset charge distance counter
      snake.currentChargeHitBoulder = undefined; // Clear boulder hit tracking for new charge
      // Calculate and store the charge direction once at the start
      if (snake.playerSnapshot) {
        // Calculate direction from Valerie's center to player snapshot
        const valerieCenter = {
          x: snake.position.x + snake.size.width / 2,
          y: snake.position.y + snake.size.height / 2
        };
        snake.direction = getDirectionVector(valerieCenter, snake.playerSnapshot);
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
        if (hitBoulder && !snake.currentChargeHitBoulder) {
          // Hit a boulder for the first time during this charge - immediately mark it to prevent multiple hits
          snake.currentChargeHitBoulder = hitBoulder.id; // Track which boulder we hit during this charge
          console.log(`🎯 BOULDER HIT: ${hitBoulder.id} - hitCount before: ${hitBoulder.hitCount}, maxHits: ${hitBoulder.maxHits}`);
          hitBoulder.hitCount += 1;
          snake.totalBoulderHits = (snake.totalBoulderHits || 0) + 1;
          console.log(`🎯 BOULDER HIT: ${hitBoulder.id} - hitCount after: ${hitBoulder.hitCount}, will destroy: ${hitBoulder.hitCount >= hitBoulder.maxHits}`);
          if (hitBoulder.hitCount >= hitBoulder.maxHits) {
            hitBoulder.isDestroyed = true;
            hitBoulder.destructionTime = currentTime; // Record when it was destroyed
            
            // Count how many boulders are now destroyed (including this one)
            const destroyedCount = boulders?.filter(b => b.isDestroyed).length || 0;
            
            // Only spawn photophobic snake after 1st and 3rd boulder destruction
            const shouldSpawnPhotophobic = (destroyedCount === 1 || destroyedCount === 3);
            
            if (shouldSpawnPhotophobic) {
              snake.environmentalEffects = {
                spawnMiniBoulders: false,
                spawnScreensaverSnake: false,
                spawnPhotophobicSnake: true,
                boulderHitPosition: {
                  x: snake.position.x + snake.size.width / 2,
                  y: snake.position.y + snake.size.height / 2
                }
              };
            }
          } else {
            // Spawn screensaver snake only on first hit of 1st and 2nd boulders
            const currentlyDestroyedCount = boulders?.filter(b => b.isDestroyed).length || 0;
            const totalBouldersHit = boulders?.filter(b => b.hitCount > 0).length || 0;
            
            // Only spawn on first hit of boulder if it's the 1st or 2nd boulder to be hit
            const shouldSpawnScreensaverSnake = !hitBoulder.hasSpawnedScreensaver && 
                                               hitBoulder.hitCount === 1 && 
                                               totalBouldersHit <= 2;
            
            if (shouldSpawnScreensaverSnake) {
              hitBoulder.hasSpawnedScreensaver = true;
              // Only set environmental effects if not already set to prevent multiple spawns
              if (!snake.environmentalEffects?.spawnScreensaverSnake) {
                snake.environmentalEffects = {
                  spawnMiniBoulders: false,
                  spawnScreensaverSnake: true,
                  boulderHitPosition: {
                    x: snake.position.x + snake.size.width / 2,
                    y: snake.position.y + snake.size.height / 2
                  }
                };
              }
            }
          }
          
          // Always use recoil behavior when hitting boulder
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
          
          console.log(`🔄 BOULDER RECOIL: Starting recoil for ${hitBoulder.id}, distance: ${recoilDistance.toFixed(2)}`);
          snake.bossState = 'recoiling';
          snake.recoilStartTime = currentTime;
          snake.recoilStartPosition = { ...snake.position };
          snake.recoilTargetPosition = recoilTargetPosition;
          snake.recoilDirection = reflectedDirection;
          snake.recoilDuration = 200;
          snake.bossColor = 'stunned';
          snake.isChargingAtSnapshot = false;
          snake.recoilFromBoulder = true; // Mark this recoil as boulder-caused
          break; // Exit charging immediately after boulder collision
        } else {
          // Check for wall collision with detailed info
          const collisionInfo = getWallCollisionInfo(snake, newPosition, walls);
          if (collisionInfo.hit && collisionInfo.normal) {
            // Always use recoil behavior when hitting wall
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
            console.log(`🎯 RECOIL COMPLETE: Transitioning to movingToCenter after boulder collision`);
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
          snake.currentChargeHitBoulder = undefined; // Clear boulder hit tracking

        } else if (checkWallCollision(snake, newRecoilPosition, walls)) {
          // Hit another wall during recoil - stop at current position
          // Check if this recoil was from a boulder collision
          if (snake.recoilFromBoulder && levelBounds) {
            // Even though we hit a wall during recoil, we still need to move to center after boulder collision
            const centerPosition = {
              x: (levelBounds.width / 2) - (snake.size.width / 2),
              y: (levelBounds.height / 2) - (snake.size.height / 2)
            };
            snake.bossState = 'movingToCenter';
            snake.centerTargetPosition = centerPosition;
            snake.recoilFromBoulder = false; // Clear the flag
          } else {
            // Normal wall collision during recoil - enter recovery
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
          snake.currentChargeHitBoulder = undefined; // Clear boulder hit tracking

        } else {
          // Continue recoiling safely
          snake.position = newRecoilPosition;
        }
      }
      break;

    case 'movingToCenter':
      // Move to center at triple speed after boulder collision
      if (snake.centerTargetPosition) {
        const tripleSpeed = (snake.chaseSpeed || snake.speed) * 3;
        const newPosition = moveTowards(snake.position, snake.centerTargetPosition, tripleSpeed * dt);
        
        // Check if we've reached the center
        const distanceToCenter = getDistance(snake.position, snake.centerTargetPosition);
        if (distanceToCenter <= tripleSpeed * dt) {
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
      // Phase-specific pause behavior
      const pauseDuration = snake.bossPhase === 2 ? 500 : 1000; // Phase 2: 500ms, others: 1000ms
      if (currentTime - (snake.centerPauseStartTime || 0) >= pauseDuration) {
        if (snake.bossPhase === 2 && levelBounds) {
          // Phase 2: Move to opposite wall's vertical center
          const playerCenter = {
            x: player.position.x + player.size.width / 2,
            y: player.position.y + player.size.height / 2
          };
          
          // Determine if player is on left or right side of screen center
          const screenCenter = levelBounds.width / 2;
          const isPlayerOnLeft = playerCenter.x < screenCenter;
          
          // Go to vertical center of same wall as player
          const wallTargetPosition = {
            x: isPlayerOnLeft 
              ? 20 // Left wall (account for wall thickness) - same as player
              : levelBounds.width - 20 - snake.size.width, // Right wall (account for wall thickness) - same as player
            y: (levelBounds.height / 2) - (snake.size.height / 2) // Vertical center
          };
          
          snake.bossState = 'movingToWall';
          snake.wallTargetPosition = wallTargetPosition;
          snake.centerPauseStartTime = undefined;
        } else if (snake.bossPhase === 3) {
          // Phase 3: Charge halfway to player then fire projectiles
          const playerCenter = {
            x: player.position.x + player.size.width / 2,
            y: player.position.y + player.size.height / 2
          };
          const valerieCenter = {
            x: snake.position.x + snake.size.width / 2,
            y: snake.position.y + snake.size.height / 2
          };
          
          // Calculate halfway point between Valerie and player
          snake.halfwayTargetPosition = {
            x: (valerieCenter.x + playerCenter.x) / 2 - snake.size.width / 2,
            y: (valerieCenter.y + playerCenter.y) / 2 - snake.size.height / 2
          };
          
          snake.bossState = 'chargingHalfway';
          snake.centerPauseStartTime = undefined;
        } else if (snake.bossPhase === 4) {
          // Phase 4: Exit to north and trigger snake rain
          // Increment phase 4 count and set movement pattern
          snake.phase4Count = (snake.phase4Count || 0) + 1;
          
          // Set movement pattern based on phase 4 count
          let patternName = '';
          if (snake.phase4Count === 1) {
            snake.rainMovementPattern = 'straight';
            patternName = 'straight north-to-south';
          } else if (snake.phase4Count === 2) {
            snake.rainMovementPattern = 'angled';
            snake.rainAngle = 30; // 30-degree angle
            patternName = '30-degree angled';
          } else if (snake.phase4Count >= 3) {
            snake.rainMovementPattern = 'sine';
            snake.sineAmplitude = 80; // Large sine wave amplitude
            snake.sineFrequency = 0.005; // Reduced frequency for less frequent back-and-forth movements
            patternName = 'large sine wave';
          }
          
          snake.bossState = 'exitingNorth';
          snake.centerPauseStartTime = undefined;
          
          // Set target position north of playable area
          const bounds = levelBounds || { width: 800, height: 600 };
          snake.exitTargetPosition = {
            x: snake.position.x, // Keep current x position
            y: -130 // Move well above the screen (30 pixels further north)
          };
          
        } else {
          // Normal behavior for other phases
          snake.bossState = 'tracking'; // Resume tracking player
          snake.centerPauseStartTime = undefined;
        }
      }
      // Stay still during pause
      break;

    case 'movingToWall':
      // Phase 2: Move to wall position at triple speed
      if (snake.wallTargetPosition) {
        const tripleSpeed = (snake.chaseSpeed || snake.speed) * 3;
        const newPosition = moveTowards(snake.position, snake.wallTargetPosition, tripleSpeed * dt);
        
        // Check if we've reached the wall target
        const distanceToTarget = getDistance(snake.position, snake.wallTargetPosition);
        if (distanceToTarget <= tripleSpeed * dt) {
          // Reached wall target - snap to position and initialize phantom spawning
          snake.position = snake.wallTargetPosition;
          snake.wallTargetPosition = undefined; // Clear target
          
          // Phase 2: Initialize multiple phantom spawning system
          if (!snake.phantomSpawnStartTime) {
            snake.phantomSpawnStartTime = currentTime;
            snake.phantomSpawnCount = 0;
            snake.phantomIds = [];
          }
          
          snake.bossState = 'waitingForPhantom';
          
        } else if (!checkWallCollision(snake, newPosition, walls)) {
          // Continue moving toward wall target
          snake.position = newPosition;
          snake.direction = getDirectionVector(snake.position, snake.wallTargetPosition);
        }
      }
      break;

    case 'chargingHalfway':
      // Phase 3: Move to halfway point at 3x speed
      if (snake.halfwayTargetPosition) {
        const tripleSpeed = (snake.chaseSpeed || snake.speed) * 3;
        const newPosition = moveTowards(snake.position, snake.halfwayTargetPosition, tripleSpeed * dt);
        
        // Check if we've reached the halfway target
        const distanceToTarget = getDistance(snake.position, snake.halfwayTargetPosition);
        if (distanceToTarget <= tripleSpeed * dt) {
          // Reached halfway point - snap to position and start pause
          snake.position = snake.halfwayTargetPosition;
          snake.halfwayTargetPosition = undefined; // Clear target
          
          snake.bossState = 'pausingAtHalfway';
          snake.halfwayPauseStartTime = currentTime;
          
          
        } else if (!checkWallCollision(snake, newPosition, walls)) {
          // Continue moving toward halfway target
          snake.position = newPosition;
          snake.direction = getDirectionVector(snake.position, snake.halfwayTargetPosition);
        }
      }
      break;

    case 'pausingAtHalfway':
      // Phase 3: Pause for 250ms at halfway point
      if (snake.halfwayPauseStartTime) {
        const pauseDuration = 250; // 250ms pause
        if (currentTime - snake.halfwayPauseStartTime >= pauseDuration) {
          // Pause complete - start returning to center at double speed
          snake.bossState = 'returningToCenter';
          snake.halfwayPauseStartTime = undefined;
          
          // Set center target position (center of the map)
          const bounds = levelBounds || { width: 800, height: 600 };
          snake.centerTargetPosition = { x: bounds.width / 2, y: bounds.height / 2 };
          
        }
      }
      // Stay still during pause
      break;

    case 'returningToCenter':
      // Phase 3: Move to center at double speed
      if (snake.centerTargetPosition) {
        const doubleSpeed = (snake.chaseSpeed || snake.speed) * 2;
        const newPosition = moveTowards(snake.position, snake.centerTargetPosition, doubleSpeed * dt);
        
        // Check if we've reached the center
        const distanceToCenter = getDistance(snake.position, snake.centerTargetPosition);
        if (distanceToCenter <= doubleSpeed * dt) {
          // Reached center - snap to position and start projectile barrage
          snake.position = snake.centerTargetPosition;
          snake.centerTargetPosition = undefined; // Clear target
          
          snake.bossState = 'projectileBarrage';
          snake.projectileBarrageStartTime = currentTime;
          snake.barrageProjectileCount = 0;
          
          
        } else if (!checkWallCollision(snake, newPosition, walls)) {
          // Continue moving toward center
          snake.position = newPosition;
          snake.direction = getDirectionVector(snake.position, snake.centerTargetPosition);
        }
      }
      break;

    case 'projectileBarrage':
      // Phase 3: Fire 4 rounds of 24 projectiles each, with 500ms between rounds and 3-degree shifts
      if (snake.projectileBarrageStartTime && snake.barrageProjectileCount !== undefined) {
        const maxRounds = 4;
        const roundInterval = 500; // 500ms between rounds
        const degreeShift = 3; // 3-degree shift per round
        
        // Initialize burst firing if not started
        if (!snake.burstProjectileStarted) {
          snake.burstProjectileStarted = true;
          snake.barrageProjectileCount = 0; // This will track rounds (0-3)
          
        }
        
        // Check if it's time to fire the next round
        if (snake.barrageProjectileCount < maxRounds) {
          const timeSinceStart = currentTime - snake.projectileBarrageStartTime;
          const nextRoundTime = snake.barrageProjectileCount * roundInterval;
          
          if (timeSinceStart >= nextRoundTime) {
            // Fire all 24 projectiles for this round simultaneously
            const roundShift = snake.barrageProjectileCount * degreeShift; // 0°, 3°, 6°, 9°
            
            snake.environmentalEffects = {
              spawnMiniBoulders: false,
              spawnScreensaverSnake: false,
              spawnPhantom: false,
              boulderHitPosition: { x: 0, y: 0 }, // Not used for projectiles
              fireProjectiles: true, // Flag for projectile firing
              projectileSourceId: snake.id, // Which snake is firing
              burstRound: snake.barrageProjectileCount, // Which round (0-3)
              roundAngleShift: roundShift // Angle shift for this round
            };
            
            snake.barrageProjectileCount++;
          }
        }
        
        // Wait additional time after firing all rounds before resuming tracking
        const totalBarrageDuration = (maxRounds * roundInterval) + 500; // All rounds + 500ms pause
        if (currentTime - snake.projectileBarrageStartTime >= totalBarrageDuration) {
          snake.bossState = 'tracking';
          snake.projectileBarrageStartTime = undefined;
          snake.barrageProjectileCount = undefined;
          snake.burstProjectileStarted = false;
        }
      }
      // Stay still during barrage
      break;

    case 'waitingForPhantom':
      // Phase 2: Handle multiple phantom spawning and wait for all to return
      const maxPhantoms = 8;
      const spawnInterval = 600; // 600ms between spawns
      
      // Check if it's time to spawn the next phantom
      if (snake.phantomSpawnStartTime && snake.phantomSpawnCount !== undefined && snake.phantomSpawnCount < maxPhantoms) {
        const timeSinceStart = currentTime - snake.phantomSpawnStartTime;
        const nextSpawnTime = snake.phantomSpawnCount * spawnInterval;
        
        if (timeSinceStart >= nextSpawnTime) {
          // Time to spawn the next phantom
          const phantomId = `phantom_${Date.now()}_${snake.phantomSpawnCount}`;
          snake.phantomIds = snake.phantomIds || [];
          snake.phantomIds.push(phantomId);
          snake.phantomSpawnCount++;
          

          
          // Store phantom spawn request in environmental effects for game engine to handle
          snake.environmentalEffects = {
            spawnMiniBoulders: false,
            spawnScreensaverSnake: false,
            spawnPhantom: true,
            phantomSpawnPosition: { x: snake.position.x, y: snake.position.y },
            phantomId: phantomId,
            phantomLevelBounds: levelBounds, // Pass level bounds to determine initial direction
            boulderHitPosition: { x: 0, y: 0 } // Not used for phantom spawning
          };
        }
      }
      

      break;

    case 'exitingNorth':
      // Phase 4: Move north out of playable area
      if (snake.exitTargetPosition) {
        const tripleSpeed = (snake.chaseSpeed || snake.speed) * 3;
        const newPosition = moveTowards(snake.position, snake.exitTargetPosition, tripleSpeed * dt);
        
        // Check if we've reached the exit target
        const distanceToTarget = getDistance(snake.position, snake.exitTargetPosition);
        if (distanceToTarget <= tripleSpeed * dt) {
          // Reached exit target - trigger snake rain
          snake.position = snake.exitTargetPosition;
          snake.exitTargetPosition = undefined; // Clear target
          
          // Initialize snake rain system
          snake.bossState = 'snakeRain';
          snake.snakeRainStartTime = currentTime;
          snake.snakeRainCount = 0;
          snake.snakeRainIds = [];
          
          
        } else {
          // Continue moving toward exit
          snake.position = newPosition;
          snake.direction = getDirectionVector(snake.position, snake.exitTargetPosition);
        }
      }
      break;

    case 'snakeRain':
      // Phase 4: Rain 50 snakes from north to south
      const maxRainSnakes = 50;
      const rainSpawnInterval = 300; // 300ms between spawns
      
      // Check if it's time to spawn the next rain snake
      if (snake.snakeRainStartTime && snake.snakeRainCount !== undefined && snake.snakeRainCount < maxRainSnakes) {
        const timeSinceRainStart = currentTime - snake.snakeRainStartTime;
        const nextRainSpawnTime = snake.snakeRainCount * rainSpawnInterval;
        
        if (timeSinceRainStart >= nextRainSpawnTime) {
          // Time to spawn the next rain snake
          const rainSnakeId = `rainsnake_${Date.now()}_${snake.snakeRainCount}`;
          snake.snakeRainIds = snake.snakeRainIds || [];
          snake.snakeRainIds.push(rainSnakeId);
          snake.snakeRainCount++;
          
          // Different spawn ranges based on trigger count
          let randomX: number;
          if (snake.phase4Count === 1) {
            // Trigger 1: spawn between 0 and 770
            randomX = Math.random() * 770;
          } else if (snake.phase4Count === 2) {
            // Trigger 2: spawn between -250 and 650 (shifted 100 pixels left)
            randomX = Math.random() * 900 - 250;
          } else {
            // Trigger 3: spawn between 50 and 700
            randomX = Math.random() * 650 + 50;
          }
          
          // Store rain snake spawn request in environmental effects
          snake.environmentalEffects = {
            spawnMiniBoulders: false,
            spawnScreensaverSnake: false,
            spawnPhantom: false,
            spawnRainSnake: true,
            rainSnakeSpawnPosition: { x: randomX, y: -50 }, // Start above screen
            rainSnakeId: rainSnakeId,
            boulderHitPosition: { x: 0, y: 0 }, // Not used for rain snake spawning
            rainMovementPattern: snake.rainMovementPattern,
            rainAngle: snake.rainAngle,
            sineAmplitude: snake.sineAmplitude,
            sineFrequency: snake.sineFrequency
          };
          
        }
      }
      
      // Check if all rain snakes have been spawned and wait for completion
      if (snake.snakeRainCount !== undefined && snake.snakeRainCount >= maxRainSnakes) {
        // All rain snakes spawned - could add logic here to check if they've all fallen off screen
        // For now, just wait a bit then end the phase
        const totalRainDuration = (maxRainSnakes * rainSpawnInterval) + 3000; // All spawns + 3s wait
        if (snake.snakeRainStartTime !== undefined && currentTime - snake.snakeRainStartTime >= totalRainDuration) {
          // Phase 4 complete - could transition to a different state or end boss fight
          snake.bossState = 'phase4Complete';
          snake.snakeRainStartTime = undefined;
          snake.snakeRainCount = undefined;
          snake.snakeRainIds = undefined;
        }
      }
      
      // Stay in current position during snake rain
      break;

    case 'phase4Complete':
      // Phase 4 is complete - transition to return state to move back to playable area
      if (!snake.phaseCompletionLogged) {
        snake.phaseCompletionLogged = true;
        
        // Set return target position (center of playable area)
        snake.returnTargetPosition = { x: 390, y: 300 }; // Center of 780x600 area
        snake.bossState = 'returningToArea';
      }
      break;

    case 'returningToArea':
      // Move back to the playable area after phase 4
      if (snake.returnTargetPosition) {
        const returnSpeed = (snake.chaseSpeed || snake.speed) * 2; // Moderate speed return
        const newPosition = moveTowards(snake.position, snake.returnTargetPosition, returnSpeed * dt);
        
        // Check if we've reached the return target
        const distanceToTarget = getDistance(snake.position, snake.returnTargetPosition);
        if (distanceToTarget <= returnSpeed * dt) {
          // Reached return target - resume normal behavior
          snake.position = snake.returnTargetPosition;
          snake.returnTargetPosition = undefined;
          snake.phaseCompletionLogged = false; // Reset for potential future phases
          
          // Transition to recovery state before resuming tracking
          snake.bossState = 'recovering';
          snake.pauseStartTime = currentTime;
          snake.isInitialPause = false; // Use normal recovery duration
          
          
        } else {
          // Continue moving toward return target
          snake.position = newPosition;
          snake.direction = getDirectionVector(snake.position, snake.returnTargetPosition);
        }
      }
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

  // Update boss phase based on total boulder hits
  // Phase 1: 0-1 hits, Phase 2: 2-3 hits, Phase 3: 4-5 hits, Phase 4: 6+ hits
  const totalHits = snake.totalBoulderHits || 0;
  if (totalHits >= 6) {
    snake.bossPhase = 4;
  } else if (totalHits >= 4) {
    snake.bossPhase = 3;
  } else if (totalHits >= 2) {
    snake.bossPhase = 2;
  } else {
    snake.bossPhase = 1;
  }

  snake.isChasing = true;
  return snake;
}