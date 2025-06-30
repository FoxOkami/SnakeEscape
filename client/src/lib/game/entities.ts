import { Snake, Position, Wall, Player } from './types';
import { checkAABBCollision, getDistance, moveTowards, hasLineOfSight, getDirectionVector } from './collision';

export function updateSnake(snake: Snake, walls: Wall[], deltaTime: number, player?: Player): Snake {
  let updatedSnake = { ...snake };
  
  // Check for line of sight to player and decide if we should chase
  if (player) {
    const playerCenter = {
      x: player.position.x + player.size.width / 2,
      y: player.position.y + player.size.height / 2
    };
    
    const snakeCenter = {
      x: snake.position.x + snake.size.width / 2,
      y: snake.position.y + snake.size.height / 2
    };
    
    const canSeePlayer = hasLineOfSight(snakeCenter, playerCenter, walls, snake.sightRange);
    
    if (canSeePlayer) {
      // Start chasing
      updatedSnake.isChasing = true;
      updatedSnake.chaseTarget = playerCenter;
    } else if (snake.isChasing) {
      // Continue chasing for a bit even if we lose sight
      const distanceToLastTarget = snake.chaseTarget ? 
        getDistance(snakeCenter, snake.chaseTarget) : Infinity;
      
      // Stop chasing if we're close to the last known position
      if (distanceToLastTarget < 30) {
        updatedSnake.isChasing = false;
        updatedSnake.chaseTarget = undefined;
      }
    }
  }
  
  let targetPoint: Position;
  let moveSpeed: number;
  
  if (updatedSnake.isChasing && updatedSnake.chaseTarget) {
    // Chase mode - move towards player
    targetPoint = updatedSnake.chaseTarget;
    moveSpeed = updatedSnake.chaseSpeed * deltaTime;
  } else {
    // Patrol mode - move along patrol points
    targetPoint = snake.patrolPoints[snake.currentPatrolIndex];
    moveSpeed = snake.speed * deltaTime;
    
    const distanceToTarget = getDistance(snake.position, targetPoint);
    
    // If close enough to patrol target, move to next patrol point
    if (distanceToTarget < 5) {
      let nextIndex = snake.currentPatrolIndex + snake.patrolDirection;
      
      // Reverse direction if at the end of patrol points
      if (nextIndex >= snake.patrolPoints.length) {
        nextIndex = snake.patrolPoints.length - 2;
        updatedSnake.patrolDirection = -1;
      } else if (nextIndex < 0) {
        nextIndex = 1;
        updatedSnake.patrolDirection = 1;
      }
      
      updatedSnake.currentPatrolIndex = nextIndex;
      targetPoint = snake.patrolPoints[nextIndex];
    }
  }
  
  // Move towards target
  const newPosition = moveTowards(snake.position, targetPoint, moveSpeed);
  
  // Check for wall collisions
  const snakeRect = {
    x: newPosition.x,
    y: newPosition.y,
    width: snake.size.width,
    height: snake.size.height
  };
  
  const hasCollision = walls.some(wall => checkAABBCollision(snakeRect, wall));
  
  if (hasCollision) {
    if (updatedSnake.isChasing) {
      // If chasing and hit a wall, try to go around it
      // For simplicity, stop chasing and return to patrol
      updatedSnake.isChasing = false;
      updatedSnake.chaseTarget = undefined;
    } else {
      // If patrolling and hit a wall, skip to next patrol point
      let nextIndex = snake.currentPatrolIndex + snake.patrolDirection;
      
      if (nextIndex >= snake.patrolPoints.length || nextIndex < 0) {
        updatedSnake.patrolDirection *= -1;
        nextIndex = snake.currentPatrolIndex + snake.patrolDirection;
      }
      
      updatedSnake.currentPatrolIndex = Math.max(0, Math.min(nextIndex, snake.patrolPoints.length - 1));
    }
    
    // Don't move if there's a collision
    return updatedSnake;
  }
  
  // Update direction vector for rendering purposes
  const direction = getDirectionVector(snake.position, newPosition);
  
  return {
    ...updatedSnake,
    position: newPosition,
    direction: direction
  };
}
