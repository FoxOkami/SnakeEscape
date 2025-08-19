export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Velocity {
  x: number;
  y: number;
}

export interface MovementConfig {
  normalSpeed: number;
  walkingSpeed: number;
  acceleration: number;
  useAcceleration: boolean; // Hub: false, Game levels: true
}

export interface BoundaryConfig {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  walking: boolean;
}

export class PlayerController {
  private position: Position;
  private size: Size;
  private currentVelocity: Velocity;
  private targetVelocity: Velocity;
  private config: MovementConfig;
  private boundaries: BoundaryConfig;

  constructor(
    initialPosition: Position,
    size: Size,
    config: MovementConfig,
    boundaries: BoundaryConfig
  ) {
    this.position = { ...initialPosition };
    this.size = { ...size };
    this.currentVelocity = { x: 0, y: 0 };
    this.targetVelocity = { x: 0, y: 0 };
    this.config = { ...config };
    this.boundaries = { ...boundaries };
  }

  // Update player position based on input
  update(input: InputState, deltaTime: number): Position {
    this.calculateTargetVelocity(input);
    
    if (this.config.useAcceleration) {
      this.updateVelocityWithAcceleration(deltaTime);
    } else {
      // Direct velocity for hub (immediate response)
      this.currentVelocity = { ...this.targetVelocity };
    }

    this.updatePosition(deltaTime);
    this.applyBoundaries();

    return { ...this.position };
  }

  private calculateTargetVelocity(input: InputState): void {
    const moveSpeed = input.walking ? this.config.walkingSpeed : this.config.normalSpeed;
    
    // Calculate target velocity based on input
    this.targetVelocity = { x: 0, y: 0 };

    if (input.up) this.targetVelocity.y -= moveSpeed;
    if (input.down) this.targetVelocity.y += moveSpeed;
    if (input.left) this.targetVelocity.x -= moveSpeed;
    if (input.right) this.targetVelocity.x += moveSpeed;

    // Normalize diagonal movement to maintain consistent speed
    if (this.targetVelocity.x !== 0 && this.targetVelocity.y !== 0) {
      const factor = Math.sqrt(2) / 2; // 1/sqrt(2)
      this.targetVelocity.x *= factor;
      this.targetVelocity.y *= factor;
    }
  }

  private updateVelocityWithAcceleration(deltaTime: number): void {
    const acceleration = this.config.acceleration;
    const dt = deltaTime / 1000; // Convert to seconds

    // Smoothly interpolate current velocity towards target velocity
    const velocityDiff = {
      x: this.targetVelocity.x - this.currentVelocity.x,
      y: this.targetVelocity.y - this.currentVelocity.y
    };

    this.currentVelocity.x += velocityDiff.x * acceleration * dt;
    this.currentVelocity.y += velocityDiff.y * acceleration * dt;

    // Apply small threshold to prevent infinite tiny movements
    const threshold = 0.001;
    if (Math.abs(velocityDiff.x) < threshold) {
      this.currentVelocity.x = this.targetVelocity.x;
    }
    if (Math.abs(velocityDiff.y) < threshold) {
      this.currentVelocity.y = this.targetVelocity.y;
    }
  }

  private updatePosition(deltaTime: number): void {
    const dt = this.config.useAcceleration ? deltaTime / 1000 : deltaTime / 1000;
    
    if (this.config.useAcceleration) {
      // Game levels: velocity is already in units per second
      this.position.x += this.currentVelocity.x * dt;
      this.position.y += this.currentVelocity.y * dt;
    } else {
      // Hub: velocity needs time scaling
      this.position.x += this.currentVelocity.x * dt;
      this.position.y += this.currentVelocity.y * dt;
    }
  }

  private applyBoundaries(): void {
    this.position.x = Math.max(
      this.boundaries.minX,
      Math.min(this.boundaries.maxX - this.size.width, this.position.x)
    );
    this.position.y = Math.max(
      this.boundaries.minY,
      Math.min(this.boundaries.maxY - this.size.height, this.position.y)
    );
  }

  // Getters
  getPosition(): Position {
    return { ...this.position };
  }

  getCurrentVelocity(): Velocity {
    return { ...this.currentVelocity };
  }

  getTargetVelocity(): Velocity {
    return { ...this.targetVelocity };
  }

  // Setters
  setPosition(position: Position): void {
    this.position = { ...position };
  }

  setBoundaries(boundaries: BoundaryConfig): void {
    this.boundaries = { ...boundaries };
  }

  updateConfig(config: Partial<MovementConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Factory functions for different contexts
export function createHubPlayerController(
  initialPosition: Position,
  size: Size,
  boundaries: BoundaryConfig
): PlayerController {
  return new PlayerController(
    initialPosition,
    size,
    {
      normalSpeed: 24,    // Hub normal speed
      walkingSpeed: 12,   // Hub walking speed (50% of normal)
      acceleration: 1,    // Not used in hub
      useAcceleration: false
    },
    boundaries
  );
}

export function createGamePlayerController(
  initialPosition: Position,
  size: Size,
  boundaries: BoundaryConfig
): PlayerController {
  return new PlayerController(
    initialPosition,
    size,
    {
      normalSpeed: 0.2,   // Game level normal speed
      walkingSpeed: 0.1,  // Game level walking speed
      acceleration: 1,    // Game level acceleration
      useAcceleration: true
    },
    boundaries
  );
}

// Helper function to convert key set to input state
export function keysToInputState(keys: Set<string>): InputState {
  return {
    up: keys.has('ArrowUp'),
    down: keys.has('ArrowDown'),
    left: keys.has('ArrowLeft'),
    right: keys.has('ArrowRight'),
    walking: keys.has('ControlLeft') || keys.has('ControlRight')
  };
}