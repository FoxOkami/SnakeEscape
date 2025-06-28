import { Snake, Position, Wall } from './types';
import { checkAABBCollision, getDistance, moveTowards } from './collision';

export function updateSnake(snake: Snake, walls: Wall[], deltaTime: number): Snake {
  const targetPoint = snake.patrolPoints[snake.currentPatrolIndex];
  const distanceToTarget = getDistance(snake.position, targetPoint);
  
  // If close enough to target, move to next patrol point
  if (distanceToTarget < 5) {
    let nextIndex = snake.currentPatrolIndex + snake.patrolDirection;
    
    // Reverse direction if at the end of patrol points
    if (nextIndex >= snake.patrolPoints.length) {
      nextIndex = snake.patrolPoints.length - 2;
      snake.patrolDirection = -1;
    } else if (nextIndex < 0) {
      nextIndex = 1;
      snake.patrolDirection = 1;
    }
    
    return {
      ...snake,
      currentPatrolIndex: nextIndex,
      patrolDirection: snake.patrolDirection
    };
  }
  
  // Move towards target
  const newPosition = moveTowards(snake.position, targetPoint, snake.speed * deltaTime);
  
  // Check for wall collisions
  const snakeRect = {
    x: newPosition.x,
    y: newPosition.y,
    width: snake.size.width,
    height: snake.size.height
  };
  
  const hasCollision = walls.some(wall => checkAABBCollision(snakeRect, wall));
  
  if (hasCollision) {
    // If collision, skip to next patrol point
    let nextIndex = snake.currentPatrolIndex + snake.patrolDirection;
    
    if (nextIndex >= snake.patrolPoints.length || nextIndex < 0) {
      snake.patrolDirection *= -1;
      nextIndex = snake.currentPatrolIndex + snake.patrolDirection;
    }
    
    return {
      ...snake,
      currentPatrolIndex: Math.max(0, Math.min(nextIndex, snake.patrolPoints.length - 1)),
      patrolDirection: snake.patrolDirection
    };
  }
  
  return {
    ...snake,
    position: newPosition
  };
}
