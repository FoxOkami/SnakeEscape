import { Position, Mirror, Crystal, Wall, LightBeam } from './types';

export function calculateLightBeam(
  lightSource: Position,
  mirrors: Mirror[],
  crystal: Crystal,
  walls: Wall[]
): LightBeam | null {
  const segments: Position[] = [];
  let currentStart = lightSource;
  
  // Calculate direction to point directly at the first mirror (mirror1)
  const firstMirror = mirrors.find(m => m.id === 'mirror1');
  let direction = { x: 0.5, y: 0.8 }; // Default direction
  
  if (firstMirror) {
    // Calculate direction vector to center of first mirror
    const mirrorCenter = {
      x: firstMirror.x + firstMirror.width / 2,
      y: firstMirror.y + firstMirror.height / 2
    };
    
    const dx = mirrorCenter.x - lightSource.x;
    const dy = mirrorCenter.y - lightSource.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length > 0) {
      direction = { x: dx / length, y: dy / length };
    }
  }
  
  let reflectionCount = 0;
  let lastMirror: Mirror | undefined = undefined;
  const maxReflections = 10; // Prevent infinite loops

  segments.push(currentStart);

  while (reflectionCount < maxReflections) {
    // Cast ray and find the next intersection
    const intersection = castRay(currentStart, direction, mirrors, walls, lastMirror);
    
    if (!intersection) {
      // No intersection found, ray goes to edge of screen
      const edge = findScreenEdge(currentStart, direction);
      segments.push(edge);
      break;
    }

    segments.push(intersection.point);

    if (intersection.type === 'wall') {
      // Ray hits wall, stop
      break;
    }

    if (intersection.type === 'mirror') {
      // Ray hits mirror, reflect
      const mirror = intersection.mirror!;
      direction = reflectDirection(direction, mirror.rotation);
      
      // Move the start point slightly away from the mirror surface to avoid re-intersection
      const offset = 0.1;
      currentStart = {
        x: intersection.point.x + direction.x * offset,
        y: intersection.point.y + direction.y * offset
      };
      
      lastMirror = mirror;
      reflectionCount++;
    }
  }

  // Check if the light beam hits the crystal
  const crystalHit = checkCrystalHit(segments, crystal);
  
  // Update mirrors reflection state
  mirrors.forEach(mirror => {
    mirror.isReflecting = isMirrorHit(segments, mirror);
  });

  return {
    start: lightSource,
    end: segments[segments.length - 1],
    segments
  };
}

function castRay(
  start: Position,
  direction: Position,
  mirrors: Mirror[],
  walls: Wall[],
  excludeMirror?: Mirror
): { point: Position; type: 'mirror' | 'wall'; mirror?: Mirror } | null {
  let closestDistance = Infinity;
  let closestIntersection: { point: Position; type: 'mirror' | 'wall'; mirror?: Mirror } | null = null;
  const minDistance = 0.1; // Minimum distance to avoid immediate re-intersection

  // Check intersections with mirrors
  mirrors.forEach(mirror => {
    // Skip the mirror we just reflected from
    if (excludeMirror && mirror.id === excludeMirror.id) return;
    
    const intersection = rayRectIntersection(start, direction, mirror);
    if (intersection) {
      const distance = Math.sqrt(
        Math.pow(intersection.x - start.x, 2) + Math.pow(intersection.y - start.y, 2)
      );
      if (distance > minDistance && distance < closestDistance) {
        closestDistance = distance;
        closestIntersection = { point: intersection, type: 'mirror', mirror };
      }
    }
  });

  // Check intersections with walls
  walls.forEach(wall => {
    const intersection = rayRectIntersection(start, direction, wall);
    if (intersection) {
      const distance = Math.sqrt(
        Math.pow(intersection.x - start.x, 2) + Math.pow(intersection.y - start.y, 2)
      );
      if (distance > minDistance && distance < closestDistance) {
        closestDistance = distance;
        closestIntersection = { point: intersection, type: 'wall' };
      }
    }
  });

  return closestIntersection;
}

function rayRectIntersection(
  start: Position,
  direction: Position,
  rect: { x: number; y: number; width: number; height: number }
): Position | null {
  const dx = direction.x;
  const dy = direction.y;
  
  if (dx === 0 && dy === 0) return null;

  let tMin = 0;
  let tMax = Infinity;

  // Check X bounds
  if (dx !== 0) {
    const t1 = (rect.x - start.x) / dx;
    const t2 = (rect.x + rect.width - start.x) / dx;
    tMin = Math.max(tMin, Math.min(t1, t2));
    tMax = Math.min(tMax, Math.max(t1, t2));
  } else {
    if (start.x < rect.x || start.x > rect.x + rect.width) return null;
  }

  // Check Y bounds
  if (dy !== 0) {
    const t1 = (rect.y - start.y) / dy;
    const t2 = (rect.y + rect.height - start.y) / dy;
    tMin = Math.max(tMin, Math.min(t1, t2));
    tMax = Math.min(tMax, Math.max(t1, t2));
  } else {
    if (start.y < rect.y || start.y > rect.y + rect.height) return null;
  }

  if (tMin > tMax || tMax < 0) return null;

  const t = tMin > 0 ? tMin : tMax;
  if (t < 0) return null;

  return {
    x: start.x + t * dx,
    y: start.y + t * dy
  };
}

function reflectDirection(direction: Position, mirrorRotation: number): Position {
  // Convert rotation to radians
  const angle = (mirrorRotation * Math.PI) / 180;
  
  // Calculate mirror normal (perpendicular to mirror surface)
  const normalX = Math.sin(angle);
  const normalY = -Math.cos(angle);
  
  // Reflect direction vector
  const dotProduct = 2 * (direction.x * normalX + direction.y * normalY);
  
  return {
    x: direction.x - dotProduct * normalX,
    y: direction.y - dotProduct * normalY
  };
}

function findScreenEdge(start: Position, direction: Position): Position {
  const screenWidth = 800;
  const screenHeight = 600;
  
  let t = Infinity;
  
  // Check intersection with screen edges
  if (direction.x > 0) {
    t = Math.min(t, (screenWidth - start.x) / direction.x);
  } else if (direction.x < 0) {
    t = Math.min(t, -start.x / direction.x);
  }
  
  if (direction.y > 0) {
    t = Math.min(t, (screenHeight - start.y) / direction.y);
  } else if (direction.y < 0) {
    t = Math.min(t, -start.y / direction.y);
  }
  
  return {
    x: start.x + t * direction.x,
    y: start.y + t * direction.y
  };
}

function checkCrystalHit(segments: Position[], crystal: Crystal): boolean {
  for (let i = 0; i < segments.length - 1; i++) {
    const start = segments[i];
    const end = segments[i + 1];
    
    if (lineRectIntersection(start, end, crystal)) {
      return true;
    }
  }
  return false;
}

function isMirrorHit(segments: Position[], mirror: Mirror): boolean {
  for (let i = 0; i < segments.length - 1; i++) {
    const start = segments[i];
    const end = segments[i + 1];
    
    if (lineRectIntersection(start, end, mirror)) {
      return true;
    }
  }
  return false;
}

function lineRectIntersection(
  start: Position,
  end: Position,
  rect: { x: number; y: number; width: number; height: number }
): boolean {
  // Check if line segment intersects with rectangle
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  
  if (dx === 0 && dy === 0) return false;

  let tMin = 0;
  let tMax = 1;

  // Check X bounds
  if (dx !== 0) {
    const t1 = (rect.x - start.x) / dx;
    const t2 = (rect.x + rect.width - start.x) / dx;
    tMin = Math.max(tMin, Math.min(t1, t2));
    tMax = Math.min(tMax, Math.max(t1, t2));
  } else {
    if (start.x < rect.x || start.x > rect.x + rect.width) return false;
  }

  // Check Y bounds
  if (dy !== 0) {
    const t1 = (rect.y - start.y) / dy;
    const t2 = (rect.y + rect.height - start.y) / dy;
    tMin = Math.max(tMin, Math.min(t1, t2));
    tMax = Math.min(tMax, Math.max(t1, t2));
  } else {
    if (start.y < rect.y || start.y > rect.y + rect.height) return false;
  }

  return tMin <= tMax;
}