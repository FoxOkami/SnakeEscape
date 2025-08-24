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
  dashSpeed: number;
  dashDistance: number;
  dashInvulnerabilityDistance: number;
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
  dash: boolean;
}

export interface DashState {
  isDashing: boolean;
  dashStartPosition: Position;
  dashDirection: Velocity;
  dashProgress: number;
  isInvulnerable: boolean;
}

export class PlayerController {
  private position: Position;
  private size: Size;
  private currentVelocity: Velocity;
  private targetVelocity: Velocity;
  private config: MovementConfig;
  private boundaries: BoundaryConfig;
  private dashState: DashState;
  private lastDashInput: boolean;

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
    this.dashState = {
      isDashing: false,
      dashStartPosition: { x: 0, y: 0 },
      dashDirection: { x: 0, y: 0 },
      dashProgress: 0,
      isInvulnerable: false
    };
    this.lastDashInput = false;
  }

  // Update player position based on input
  update(input: InputState, deltaTime: number): Position {
    this.handleDashInput(input);
    this.updateDash(deltaTime);
    
    if (!this.dashState.isDashing) {
      this.calculateTargetVelocity(input);
      
      if (this.config.useAcceleration) {
        this.updateVelocityWithAcceleration(deltaTime);
      } else {
        // Direct velocity for hub (immediate response)
        this.currentVelocity = { ...this.targetVelocity };
      }
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

  private handleDashInput(input: InputState): void {
    // Trigger dash on key press (not hold)
    if (input.dash && !this.lastDashInput && !this.dashState.isDashing) {
      this.startDash(input);
    }
    this.lastDashInput = input.dash;
  }

  private startDash(input: InputState): void {
    // Calculate dash direction based on current input
    let dashDirection = { x: 0, y: 0 };
    
    if (input.up) dashDirection.y -= 1;
    if (input.down) dashDirection.y += 1;
    if (input.left) dashDirection.x -= 1;
    if (input.right) dashDirection.x += 1;
    
    // If no direction input, dash in the direction of current movement
    if (dashDirection.x === 0 && dashDirection.y === 0) {
      if (this.currentVelocity.x !== 0 || this.currentVelocity.y !== 0) {
        const magnitude = Math.sqrt(this.currentVelocity.x ** 2 + this.currentVelocity.y ** 2);
        if (magnitude > 0) {
          dashDirection.x = this.currentVelocity.x / magnitude;
          dashDirection.y = this.currentVelocity.y / magnitude;
        }
      } else {
        // Default to facing right if no movement
        dashDirection.x = 1;
      }
    } else {
      // Normalize diagonal movement
      const magnitude = Math.sqrt(dashDirection.x ** 2 + dashDirection.y ** 2);
      if (magnitude > 0) {
        dashDirection.x /= magnitude;
        dashDirection.y /= magnitude;
      }
    }
    
    this.dashState = {
      isDashing: true,
      dashStartPosition: { ...this.position },
      dashDirection,
      dashProgress: 0,
      isInvulnerable: true
    };
  }

  private updateDash(deltaTime: number): void {
    if (!this.dashState.isDashing) return;
    
    const dt = deltaTime / 1000;
    const dashProgressIncrement = (this.config.dashSpeed * dt) / this.config.dashDistance;
    this.dashState.dashProgress += dashProgressIncrement;
    
    // Update invulnerability based on distance traveled
    const distanceTraveled = this.dashState.dashProgress * this.config.dashDistance;
    this.dashState.isInvulnerable = distanceTraveled < this.config.dashInvulnerabilityDistance;
    
    // Set velocity for dash movement
    this.currentVelocity = {
      x: this.dashState.dashDirection.x * this.config.dashSpeed,
      y: this.dashState.dashDirection.y * this.config.dashSpeed
    };
    
    // End dash when distance is complete
    if (this.dashState.dashProgress >= 1) {
      this.dashState.isDashing = false;
      this.dashState.isInvulnerable = false;
      this.currentVelocity = { x: 0, y: 0 };
    }
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

  getDashState(): DashState {
    return { ...this.dashState };
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

// Factory function for unified movement system (used by both hub and game levels)
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
      useAcceleration: true,
      dashSpeed: 1.0,     // High speed for dash (96 pixels in short time)
      dashDistance: 96,   // 96 pixels dash distance
      dashInvulnerabilityDistance: 32  // First 32 pixels are invulnerable
    },
    boundaries
  );
}

// Interface for custom key bindings
export interface CustomKeyBindings {
  up: string;
  down: string;
  left: string;
  right: string;
  interact: string;
  secondaryInteract: string;
  walking: string;
  dash: string;
}

// Helper function to convert key set to input state with custom key bindings
export function keysToInputState(keys: Set<string>, customBindings?: CustomKeyBindings): InputState {
  const bindings = customBindings || {
    up: 'ArrowUp',
    down: 'ArrowDown',
    left: 'ArrowLeft',
    right: 'ArrowRight',
    interact: 'KeyE',
    walking: 'ControlLeft',
    dash: 'KeyR'
  };
  
  return {
    up: keys.has(bindings.up),
    down: keys.has(bindings.down),
    left: keys.has(bindings.left),
    right: keys.has(bindings.right),
    walking: keys.has(bindings.walking) || keys.has('ControlRight'), // Keep ControlRight as backup
    dash: keys.has(bindings.dash)
  };
}