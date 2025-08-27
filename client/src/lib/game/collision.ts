import { Rectangle, Position } from './types';

export function checkAABBCollision(rect1: Rectangle, rect2: Rectangle): boolean {
  return (
    rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.height &&
    rect1.y + rect1.height > rect2.y
  );
}

export function checkPointInRect(point: Position, rect: Rectangle): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

export function getDistance(pos1: Position, pos2: Position): number {
  // Safety check for undefined positions
  if (!pos1 || !pos2 || typeof pos1.x !== 'number' || typeof pos1.y !== 'number' || 
      typeof pos2.x !== 'number' || typeof pos2.y !== 'number') {
    return 0;
  }
  
  const dx = pos1.x - pos2.x;
  const dy = pos1.y - pos2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function moveTowards(from: Position, to: Position, speed: number): Position {
  const distance = getDistance(from, to);
  if (distance <= speed) {
    return { ...to };
  }
  
  const direction = {
    x: (to.x - from.x) / distance,
    y: (to.y - from.y) / distance
  };
  
  return {
    x: from.x + direction.x * speed,
    y: from.y + direction.y * speed
  };
}

export function hasLineOfSight(
  from: Position, 
  to: Position, 
  walls: Rectangle[], 
  maxDistance: number
): boolean {
  const distance = getDistance(from, to);
  
  // Check if target is within sight range
  if (distance > maxDistance) {
    return false;
  }
  
  // Cast a ray from snake to player
  const steps = Math.ceil(distance);
  const stepX = (to.x - from.x) / steps;
  const stepY = (to.y - from.y) / steps;
  
  // Check each step along the line for wall collisions
  for (let i = 1; i < steps; i++) {
    const checkPoint = {
      x: from.x + stepX * i,
      y: from.y + stepY * i
    };
    
    // Check if this point intersects with any wall
    if (walls.some(wall => checkPointInRect(checkPoint, wall))) {
      return false;
    }
  }
  
  return true;
}

export function getDirectionVector(from: Position, to: Position): Position {
  const distance = getDistance(from, to);
  if (distance === 0) {
    return { x: 0, y: 0 };
  }
  
  return {
    x: (to.x - from.x) / distance,
    y: (to.y - from.y) / distance
  };
}

export function findPathAroundWalls(
  from: Position, 
  to: Position, 
  walls: Rectangle[], 
  entitySize: { width: number; height: number }
): Position {
  // First try direct path
  const directDirection = getDirectionVector(from, to);
  const testPos = {
    x: from.x + directDirection.x * 10,
    y: from.y + directDirection.y * 10
  };
  
  // Check if direct path is blocked
  const entityRect = {
    x: testPos.x - entitySize.width / 2,
    y: testPos.y - entitySize.height / 2,
    width: entitySize.width,
    height: entitySize.height
  };
  
  const isDirectPathBlocked = walls.some(wall => checkAABBCollision(entityRect, wall));
  
  if (!isDirectPathBlocked) {
    return testPos;
  }
  
  // Try alternative paths by checking perpendicular directions
  const alternatives = [
    { x: directDirection.x + 0.5, y: directDirection.y }, // Right bias
    { x: directDirection.x - 0.5, y: directDirection.y }, // Left bias
    { x: directDirection.x, y: directDirection.y + 0.5 }, // Down bias
    { x: directDirection.x, y: directDirection.y - 0.5 }, // Up bias
  ];
  
  for (const altDirection of alternatives) {
    // Normalize the alternative direction
    const altLength = Math.sqrt(altDirection.x * altDirection.x + altDirection.y * altDirection.y);
    const normalizedAlt = {
      x: altDirection.x / altLength,
      y: altDirection.y / altLength
    };
    
    const altTestPos = {
      x: from.x + normalizedAlt.x * 10,
      y: from.y + normalizedAlt.y * 10
    };
    
    const altEntityRect = {
      x: altTestPos.x - entitySize.width / 2,
      y: altTestPos.y - entitySize.height / 2,
      width: entitySize.width,
      height: entitySize.height
    };
    
    if (!walls.some(wall => checkAABBCollision(altEntityRect, wall))) {
      return altTestPos;
    }
  }
  
  // If all alternatives fail, return current position (stay put)
  return from;
}

export function slideAlongWall(
  from: Position,
  intendedPosition: Position,
  walls: Rectangle[],
  entitySize: { width: number; height: number }
): Position {
  console.log(`slideAlongWall: from x=${from.x.toFixed(2)}, y=${from.y.toFixed(2)} to x=${intendedPosition.x.toFixed(2)}, y=${intendedPosition.y.toFixed(2)}`);
  // Calculate movement vector
  const movement = {
    x: intendedPosition.x - from.x,
    y: intendedPosition.y - from.y
  };
  
  // If there's no movement, return original position
  if (movement.x === 0 && movement.y === 0) {
    return from;
  }
  
  // Try full movement first to see if it's actually blocked
  const fullMovementRect = {
    x: intendedPosition.x,
    y: intendedPosition.y,
    width: entitySize.width,
    height: entitySize.height
  };
  
  // If full movement is possible, use it
  if (!walls.some(wall => checkAABBCollision(fullMovementRect, wall))) {
    return intendedPosition;
  }
  
  // Try moving horizontally only - find the furthest safe position
  let horizontalOnlyPos = from;
  let canMoveHorizontally = false;
  
  // Check horizontal movement in small increments to find safe position
  const horizontalDirection = movement.x > 0 ? 1 : -1;
  const horizontalDistance = Math.abs(movement.x);
  
  for (let distance = 1; distance <= horizontalDistance; distance++) {
    const testPos = {
      x: from.x + horizontalDirection * distance,
      y: from.y
    };
    
    const testRect = {
      x: testPos.x,
      y: testPos.y,
      width: entitySize.width,
      height: entitySize.height
    };
    
    if (!walls.some(wall => checkAABBCollision(testRect, wall))) {
      horizontalOnlyPos = testPos;
      canMoveHorizontally = true;
    } else {
      break; // Stop at first collision
    }
  }
  
  // Try moving vertically only - find the furthest safe position
  let verticalOnlyPos = from;
  let canMoveVertically = false;
  
  // Check vertical movement in small increments to find safe position
  const verticalDirection = movement.y > 0 ? 1 : -1;
  const verticalDistance = Math.abs(movement.y);
  
  for (let distance = 1; distance <= verticalDistance; distance++) {
    const testPos = {
      x: from.x,
      y: from.y + verticalDirection * distance
    };
    
    const testRect = {
      x: testPos.x,
      y: testPos.y,
      width: entitySize.width,
      height: entitySize.height
    };
    
    if (!walls.some(wall => checkAABBCollision(testRect, wall))) {
      verticalOnlyPos = testPos;
      canMoveVertically = true;
    } else {
      break; // Stop at first collision
    }
  }
  
  // Prioritize the direction with larger movement component to maintain speed
  const absMovementX = Math.abs(movement.x);
  const absMovementY = Math.abs(movement.y);
  
  let result = from;
  
  if (absMovementX > absMovementY) {
    // Horizontal movement is dominant
    if (canMoveHorizontally) {
      result = horizontalOnlyPos;
    } else if (canMoveVertically) {
      result = verticalOnlyPos;
    }
  } else {
    // Vertical movement is dominant
    if (canMoveVertically) {
      result = verticalOnlyPos;
    } else if (canMoveHorizontally) {
      result = horizontalOnlyPos;
    }
  }
  
  console.log(`slideAlongWall result: x=${result.x.toFixed(2)}, y=${result.y.toFixed(2)}`);
  return result;
}
