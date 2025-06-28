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
