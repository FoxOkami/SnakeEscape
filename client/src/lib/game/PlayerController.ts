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
  lastDashTime: number;
  cooldownDuration: number;
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
      isInvulnerable: false,
      lastDashTime: 0,
      cooldownDuration: 1500, // 1.5 seconds in milliseconds
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
    } else {
      // Allow direction changes during dash by updating dash direction based on input
      let newDashDirection = { x: 0, y: 0 };
      
      if (input.up) newDashDirection.y -= 1;
      if (input.down) newDashDirection.y += 1;
      if (input.left) newDashDirection.x -= 1;
      if (input.right) newDashDirection.x += 1;
      
      // If there's new directional input, update dash direction
      if (newDashDirection.x !== 0 || newDashDirection.y !== 0) {
        const magnitude = Math.sqrt(newDashDirection.x ** 2 + newDashDirection.y ** 2);
        if (magnitude > 0) {
          this.dashState.dashDirection.x = newDashDirection.x / magnitude;
          this.dashState.dashDirection.y = newDashDirection.y / magnitude;
        }
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
    const dt = deltaTime / 1000;
    
    const oldPosition = { ...this.position };
    const velocityMagnitude = Math.sqrt(this.currentVelocity.x * this.currentVelocity.x + this.currentVelocity.y * this.currentVelocity.y);
    
    
    // Apply movement
    this.position.x += this.currentVelocity.x * dt;
    this.position.y += this.currentVelocity.y * dt;
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
    const currentTime = performance.now();
    const timeSinceLastDash = currentTime - this.dashState.lastDashTime;
    const canDash = timeSinceLastDash >= this.dashState.cooldownDuration;
    
    if (input.dash && !this.lastDashInput && !this.dashState.isDashing && canDash) {
      // Only dash if there's directional input
      if (input.up || input.down || input.left || input.right) {
        this.startDash(input, currentTime);
      }
    }
    this.lastDashInput = input.dash;
  }

  private startDash(input: InputState, currentTime: number): void {
    // Calculate dash direction based on current input
    let dashDirection = { x: 0, y: 0 };
    
    if (input.up) dashDirection.y -= 1;
    if (input.down) dashDirection.y += 1;
    if (input.left) dashDirection.x -= 1;
    if (input.right) dashDirection.x += 1;
    
    // Normalize diagonal movement
    const magnitude = Math.sqrt(dashDirection.x ** 2 + dashDirection.y ** 2);
    if (magnitude > 0) {
      dashDirection.x /= magnitude;
      dashDirection.y /= magnitude;
    }
    
    this.dashState = {
      ...this.dashState,
      isDashing: true,
      dashStartPosition: { ...this.position },
      dashDirection,
      dashProgress: 0,
      isInvulnerable: true,
      lastDashTime: currentTime,
    };
  }

  private updateDash(deltaTime: number): void {
    if (!this.dashState.isDashing) return;
    
    // Simple time-based dash: 200ms duration at high speed
    const currentTime = performance.now();
    const dashDuration = 200; // 200ms dash
    const dashSpeed = 600; // Fast movement speed
    
    const timeSinceDashStart = currentTime - (this.dashState.lastDashTime || currentTime);
    
    if (timeSinceDashStart >= dashDuration) {
      // End dash
      this.dashState.isDashing = false;
      this.dashState.isInvulnerable = false;
      this.dashState.dashProgress = 1;
      // Don't reset velocity to zero - let normal movement take over
    } else {
      // Continue dash movement
      this.dashState.dashProgress = timeSinceDashStart / dashDuration;
      this.dashState.isInvulnerable = true; // Invulnerable for entire dash duration
      
      // Set velocity for dash movement at high speed
      this.currentVelocity = {
        x: this.dashState.dashDirection.x * dashSpeed,
        y: this.dashState.dashDirection.y * dashSpeed
      };
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
      normalSpeed: 150,   // Comfortable movement speed
      walkingSpeed: 75,   // Comfortable walking speed
      acceleration: 8,    // Acceleration value (not used when useAcceleration is false)
      useAcceleration: false,  // Direct movement for consistent behavior across all areas
      dashSpeed: 600,     // High speed for time-based dash (200ms duration)
      dashDistance: 120,  // Distance covered during 200ms dash (600 * 0.2 = 120 pixels)
      dashInvulnerabilityDistance: 60  // Invulnerable during first half of dash
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
    dash: 'Space'
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