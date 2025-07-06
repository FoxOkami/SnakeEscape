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
  // Calculate movement vector
  const movement = {
    x: intendedPosition.x - from.x,
    y: intendedPosition.y - from.y
  };
  
  // If there's no movement, return original position
  if (movement.x === 0 && movement.y === 0) {
    return from;
  }
  
  // Try moving horizontally only
  const horizontalOnlyPos = {
    x: from.x + movement.x,
    y: from.y
  };
  
  const horizontalRect = {
    x: horizontalOnlyPos.x,
    y: horizontalOnlyPos.y,
    width: entitySize.width,
    height: entitySize.height
  };
  
  const canMoveHorizontally = !walls.some(wall => checkAABBCollision(horizontalRect, wall));
  
  // Try moving vertically only
  const verticalOnlyPos = {
    x: from.x,
    y: from.y + movement.y
  };
  
  const verticalRect = {
    x: verticalOnlyPos.x,
    y: verticalOnlyPos.y,
    width: entitySize.width,
    height: entitySize.height
  };
  
  const canMoveVertically = !walls.some(wall => checkAABBCollision(verticalRect, wall));
  
  // Prioritize the direction with larger movement component
  const absMovementX = Math.abs(movement.x);
  const absMovementY = Math.abs(movement.y);
  
  if (absMovementX > absMovementY) {
    // Horizontal movement is dominant
    if (canMoveHorizontally) {
      return horizontalOnlyPos;
    } else if (canMoveVertically) {
      return verticalOnlyPos;
    }
  } else {
    // Vertical movement is dominant
    if (canMoveVertically) {
      return verticalOnlyPos;
    } else if (canMoveHorizontally) {
      return horizontalOnlyPos;
    }
  }
  
  // If neither direction works, try smaller incremental movements
  const steps = 10;
  for (let i = steps; i > 0; i--) {
    const fraction = i / steps;
    
    // Try partial horizontal movement
    const partialHorizontalPos = {
      x: from.x + movement.x * fraction,
      y: from.y
    };
    
    const partialHorizontalRect = {
      x: partialHorizontalPos.x,
      y: partialHorizontalPos.y,
      width: entitySize.width,
      height: entitySize.height
    };
    
    if (!walls.some(wall => checkAABBCollision(partialHorizontalRect, wall))) {
      return partialHorizontalPos;
    }
    
    // Try partial vertical movement
    const partialVerticalPos = {
      x: from.x,
      y: from.y + movement.y * fraction
    };
    
    const partialVerticalRect = {
      x: partialVerticalPos.x,
      y: partialVerticalPos.y,
      width: entitySize.width,
      height: entitySize.height
    };
    
    if (!walls.some(wall => checkAABBCollision(partialVerticalRect, wall))) {
      return partialVerticalPos;
    }
  }
  
  // If all else fails, stay in place
  return from;
}
