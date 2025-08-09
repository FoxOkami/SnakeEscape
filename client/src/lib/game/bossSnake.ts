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

// Helper function to get patrol target
function getPatrolTarget(snake: Snake): Position {
  if (snake.patrolPoints.length === 0) {
    return snake.position;
  }
  
  // Ensure currentPatrolIndex is within bounds
  const index = Math.max(0, Math.min(snake.currentPatrolIndex, snake.patrolPoints.length - 1));
  return snake.patrolPoints[index];
}

export function updateBossSnake(snake: Snake, walls: Wall[], dt: number, player?: Player, currentTime?: number): Snake {
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
      // Take snapshot of player position and start pause
      snake.playerSnapshot = { x: player.position.x, y: player.position.y };
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
      }
      // Stay in current position during pause
      break;

    case 'charging':
      // Charge directly at the snapshot position until hitting a wall
      if (snake.playerSnapshot) {
        const targetPoint = snake.playerSnapshot;
        const moveSpeed = snake.chaseSpeed * 2 || snake.speed * 2; // Faster charge speed
        
        // Calculate direction to snapshot
        const direction = getDirectionVector(snake.position, targetPoint);
        
        // Move in straight line toward snapshot at high speed
        const chargeDistance = moveSpeed * dt;
        const newPosition = {
          x: snake.position.x + direction.x * chargeDistance,
          y: snake.position.y + direction.y * chargeDistance
        };
        
        // Check for wall collision
        if (checkWallCollision(snake, newPosition, walls)) {
          // Hit a wall - stop charging and enter recovery
          snake.bossState = 'recovering';
          snake.bossColor = 'normal'; // Change back to normal color
          snake.isChargingAtSnapshot = false;
          snake.playerSnapshot = undefined;
          // Add brief recovery time before next attack
          snake.pauseStartTime = currentTime;
        } else {
          // Continue charging
          snake.position = newPosition;
          snake.direction = direction;
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