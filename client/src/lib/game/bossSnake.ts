import { Snake, Wall, Player, Position } from './types';
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

export function updateBossSnake(snake: Snake, walls: Wall[], dt: number, player?: Player, currentTime?: number, levelBounds?: { width: number; height: number }): Snake {
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
    snake.bossState = 'tracking';
    snake.bossColor = 'normal';
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
      // Pause for 100ms
      if (currentTime - (snake.pauseStartTime || 0) >= 100) {
        // Start charging after pause
        snake.bossState = 'charging';
        snake.chargeStartTime = currentTime;
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
      }
      // Stay in current position during pause
      break;

    case 'charging':
      // Charge in a straight line using stored direction until hitting a wall
      if (snake.direction && snake.playerSnapshot) {
        const moveSpeed = snake.chaseSpeed * 2 || snake.speed * 2; // Faster charge speed
        
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
        
        // Check for wall collision with detailed info
        const collisionInfo = getWallCollisionInfo(snake, newPosition, walls);
        if (collisionInfo.hit && collisionInfo.normal) {
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

        
        } else {
          // Continue charging in same direction
          snake.position = newPosition;
          // Keep the same direction (don't recalculate)
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
          // Reached target normally - snap to target and enter recovery
          snake.position = snake.recoilTargetPosition;
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

    case 'recovering':
      // Brief recovery period before starting next attack cycle
      if (currentTime - (snake.pauseStartTime || 0) >= 500) { // 500ms recovery
        snake.bossState = 'tracking'; // Start next cycle
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