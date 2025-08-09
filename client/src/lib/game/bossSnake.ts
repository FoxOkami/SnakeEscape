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
      // Take snapshot of player center position and start pause
      snake.playerSnapshot = { 
        x: player.position.x + player.size.width / 2, 
        y: player.position.y + player.size.height / 2 
      };
      snake.pauseStartTime = currentTime;
      snake.bossState = 'pausing';
      snake.bossColor = 'normal';
      console.log(`Valerie: Tracking → Pausing. Snapshot: (${snake.playerSnapshot.x.toFixed(1)}, ${snake.playerSnapshot.y.toFixed(1)})`);
      break;

    case 'pausing':
      // Pause for 100ms
      if (currentTime - (snake.pauseStartTime || 0) >= 100) {
        // Start charging after pause
        snake.bossState = 'charging';
        snake.chargeStartTime = currentTime;
        snake.bossColor = 'charging'; // Change to pink color
        snake.isChargingAtSnapshot = true;
        // Calculate and store the charge direction once at the start
        if (snake.playerSnapshot) {
          // Calculate direction from Valerie's center to player snapshot
          const valerieCenter = {
            x: snake.position.x + snake.size.width / 2,
            y: snake.position.y + snake.size.height / 2
          };
          snake.direction = getDirectionVector(valerieCenter, snake.playerSnapshot);
          console.log(`Valerie: Pausing → Charging. Direction: (${snake.direction.x.toFixed(3)}, ${snake.direction.y.toFixed(3)})`);
        }
      }
      // Stay in current position during pause
      break;

    case 'charging':
      // Charge in a straight line using stored direction until hitting a wall
      if (snake.direction && snake.playerSnapshot) {
        const moveSpeed = snake.chaseSpeed * 2 || snake.speed * 2; // Faster charge speed
        
        // Move in straight line using the stored direction (don't recalculate)
        const chargeDistance = moveSpeed * dt;
        const newPosition = {
          x: snake.position.x + snake.direction.x * chargeDistance,
          y: snake.position.y + snake.direction.y * chargeDistance
        };
        
        // Check for wall collision
        if (checkWallCollision(snake, newPosition, walls)) {
          // Hit a wall - bounce back along same trajectory
          const recoilDistance = snake.size.width / 2; // Half her width
          const recoilPosition = {
            x: snake.position.x - snake.direction.x * recoilDistance,
            y: snake.position.y - snake.direction.y * recoilDistance
          };
          
          // Apply recoil if it doesn't cause collision
          if (!checkWallCollision(snake, recoilPosition, walls)) {
            snake.position = recoilPosition;
          }
          
          console.log(`Valerie: Hit wall! Charging → Recovering. Recoiled to: (${snake.position.x.toFixed(1)}, ${snake.position.y.toFixed(1)})`);
          snake.bossState = 'recovering';
          snake.bossColor = 'normal'; // Change back to normal color
          snake.isChargingAtSnapshot = false;
          snake.playerSnapshot = undefined;
          snake.direction = { x: 0, y: 0 }; // Reset direction
          // Add brief recovery time before next attack
          snake.pauseStartTime = currentTime;
        } else {
          // Continue charging in same direction
          snake.position = newPosition;
          // Keep the same direction (don't recalculate)
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