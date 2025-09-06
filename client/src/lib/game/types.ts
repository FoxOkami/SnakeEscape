export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rectangle extends Position, Size {}

export interface Player {
  position: Position;
  size: Size;
  speed: number;
  hasKey: boolean;
  health: number;
  maxHealth: number;
  shieldHealth: number;
  maxShieldHealth: number;
  isInvincible: boolean;
  invincibilityEndTime: number;
}

export interface Snake {
  id: string;
  type: 'stalker' | 'guard' | 'burster' | 'screensaver' | 'plumber' | 'spitter' | 'photophobic' | 'rattlesnake' | 'boss' | 'phantom' | 'rainsnake' | 'friendly';
  position: Position;
  spawnPoint?: Position; // Original spawn position for return behavior
  fallbackTarget?: Position; // Generated patrol target for snakes without predefined patrol points
  size: Size;
  speed: number;
  direction: Position;
  patrolPoints: Position[];
  currentPatrolIndex: number;
  patrolDirection: number;
  chaseSpeed: number;
  sightRange: number;
  hearingRange?: number; // For stalkers and rattlesnakes
  isChasing: boolean;
  chaseTarget?: Position;
  lastHeardSound?: Position;
  soundCooldown?: number;
  dashSpeed?: number; // For bursters
  isDashing?: boolean;
  dashStartTime?: number;
  dashDuration?: number;
  dashTarget?: Position;
  lastSeenPlayer?: Position;
  lostSightCooldown?: number;
  // Plumber-specific properties
  currentTileId?: string; // Current tile the plumber is on
  entryDirection?: 'north' | 'south' | 'east' | 'west'; // Direction plumber entered current tile from
  nextRotationTime?: number; // Time when next rotation should occur
  tileToRotate?: string; // Tile ID that needs to be rotated
  // Spitter-specific properties
  lastFireTime?: number; // Time when last projectile was fired
  fireInterval?: number; // Time between shots (3000ms = 3 seconds)
  movementAxis?: 'horizontal' | 'vertical'; // Whether spitter moves east-west or north-south
  shotCount?: number; // Track shot number for alternating patterns
  // Phase system properties
  activePhase?: 'A' | 'B' | 'C'; // Phase restriction for Level 5
  // Photophobic-specific properties
  isInDarkness?: boolean; // Whether the quadrant is dark (has overlay)
  isBerserk?: boolean; // Whether in aggressive light-exposed state
  photophobicPauseStartTime?: number; // Time when pause started (for 100ms pauses)
  isPaused?: boolean; // Whether currently paused
  chargeDirection?: Position; // Direction of direct charge at player
  isCharging?: boolean; // Whether currently charging at player
  // Audio pause properties
  isAudioPaused?: boolean; // Whether paused due to losing audio contact
  audioPauseStartTime?: number; // When the 500ms audio pause started
  wasHearingPlayer?: boolean; // Whether snake was actively hearing sounds in previous frame
  // Rattlesnake-specific properties
  pitId?: string; // Which pit this snake belongs to
  isInPit?: boolean; // Whether snake is currently in the pit
  emergenceTime?: number; // When the snake emerged from pit
  patrolStartTime?: number; // When the snake started its patrol
  patrolDuration?: number; // How long the patrol should last
  returnToPitTime?: number; // When the snake should return to pit
  rattlesnakeState?: 'inPit' | 'patrolling' | 'chasing' | 'pausing' | 'returningToPit'; // Current behavior state
  rattlesnakePauseStartTime?: number; // When the pause phase started
  pitPosition?: Position; // Original pit position to return to
  // Light emergence properties
  isLightEmergence?: boolean; // Whether this snake emerged due to light detection
  lightEmergenceDirection?: 'north' | 'south' | 'east' | 'west'; // Cardinal direction for light emergence
  // Boss-specific properties (Valerie)
  bossState?: 'tracking' | 'pausing' | 'charging' | 'recoiling' | 'recovering' | 'movingToCenter' | 'centerPause' | 'movingToWall' | 'waitingForPhantom' | 'chargingHalfway' | 'pausingAtHalfway' | 'returningToCenter' | 'projectileBarrage' | 'exitingNorth' | 'snakeRain' | 'phase4Complete' | 'returningToArea'; // Current boss behavior state
  playerSnapshot?: Position; // Snapshot of player position when starting charge
  chargeStartTime?: number; // When the charge started
  pauseStartTime?: number; // When the pause started (100ms pause)
  isChargingAtSnapshot?: boolean; // Whether currently charging at snapshot location
  bossColor?: 'normal' | 'charging' | 'stunned'; // Color state for boss
  // Recoil properties
  recoilStartPosition?: Position; // Where recoil started from
  recoilTargetPosition?: Position; // Where recoil should end
  recoilStartTime?: number; // When recoil animation started
  recoilDirection?: Position; // Direction of recoil movement
  recoilFromBoulder?: boolean; // Whether recoil was caused by boulder collision
  // Enhanced boss behavior properties
  centerTargetPosition?: Position; // Target position when moving to center
  centerPauseStartTime?: number; // When center pause started
  wallTargetPosition?: Position; // Target position when moving to wall (Phase 2)
  speedBoostApplied?: boolean; // Whether 5% speed boost has been applied
  halfwayPauseStartTime?: number; // When pause at halfway point started
  // Ramping speed properties (per-charge ramping)
  chargeRampStartTime?: number; // When current charge ramp began
  chargeBaseSpeed?: number; // Starting speed for current charge
  chargeMaxSpeed?: number; // Maximum speed for charge
  isInitialPause?: boolean; // Whether this is the first pause to let player adjust
  
  // Environmental effects triggered when boss hits boulder
  environmentalEffects?: {
    spawnMiniBoulders: boolean;
    spawnScreensaverSnake: boolean;
    spawnPhotophobicSnake?: boolean;
    spawnPhantom?: boolean;
    phantomSpawnPosition?: Position;
    phantomId?: string;
    phantomLevelBounds?: { width: number; height: number };
    spawnRainSnake?: boolean; // New flag for Phase 4 rain snake spawning
    rainSnakeSpawnPosition?: Position; // Position where rain snake should spawn
    rainSnakeId?: string; // ID for the rain snake
    boulderHitPosition: Position;
    fireProjectiles?: boolean; // New flag for Phase 3 projectile firing
    projectileSourceId?: string; // Which snake is firing the projectiles
    sequentialProjectileIndex?: number; // Which projectile in the sequence (0-14)
    projectileClockwise?: boolean; // Direction of projectile sequence
    startingAngle?: number; // Starting angle in degrees (0=east, 180=west)
    burstRound?: number; // Which burst round (0-3) for 4-round system
    roundAngleShift?: number; // Angle shift for current round (0°, 3°, 6°, 9°)
    rainMovementPattern?: 'straight' | 'angled' | 'sine'; // Movement pattern for rain snakes
    rainAngle?: number; // Angle for angled movement (30 degrees)
    sineAmplitude?: number; // Amplitude for sine wave movement
    sineFrequency?: number; // Frequency for sine wave movement
  };
  
  // Phase system for boss battles
  bossPhase?: number; // Current phase (1-4)
  totalBoulderHits?: number; // Total number of boulder hits across all boulders
  
  // Additional boss properties for charge tracking
  chargeDistanceTraveled?: number; // Distance traveled during current charge
  recoilDuration?: number; // Duration of recoil animation
  
  // Phase 2 phantom properties
  phantomId?: string; // ID of spawned phantom (for Valerie to track) - legacy single phantom
  phantomIds?: string[]; // IDs of all spawned phantoms (for multi-phantom tracking)
  phantomSpawnStartTime?: number; // When the first phantom was spawned
  phantomSpawnCount?: number; // How many phantoms have been spawned (0-6)
  isPhantom?: boolean; // Whether this snake is a phantom
  originalSpawnPosition?: Position; // Original position where phantom was spawned (for return)
  phantomDirection?: 'north' | 'east' | 'south' | 'west'; // Current direction phantom is moving
  phantomRotation?: 'clockwise' | 'counterclockwise'; // Rotation pattern for wall collisions
  hasReturnedToSpawn?: boolean; // Whether phantom has completed its journey
  totalTravelDistance?: number; // Total distance phantom has traveled (to ensure full lap before return)
  debugLogged?: boolean; // Temporary flag for debug logging to prevent spam
  isMarkedForRemoval?: boolean; // Flag to prevent duplicate removal processing
  processedForRemoval?: boolean; // Flag to ensure phantom is only processed once for removal
  
  // Phase 3 projectile barrage properties
  halfwayTargetPosition?: Position; // Halfway position between Valerie and player for Phase 3
  projectileBarrageStartTime?: number; // When projectile barrage began
  barrageProjectileCount?: number; // How many projectiles have been fired (0-30)
  sequentialProjectileStarted?: boolean; // Whether sequential firing has been initialized
  burstProjectileStarted?: boolean; // Whether burst firing has been initialized
  projectileClockwise?: boolean; // Direction to fire projectiles (clockwise/counter-clockwise)
  startingAngle?: number; // Starting angle for projectile sequence (0=east, 180=west)
  
  // Phase 4 properties
  exitTargetPosition?: Position; // Target position when exiting north
  snakeRainStartTime?: number; // When snake rain began
  snakeRainCount?: number; // How many rain snakes have been spawned
  snakeRainIds?: string[]; // IDs of all spawned rain snakes
  isRainSnake?: boolean; // Whether this snake is a rain snake falling from north
  rainSpeed?: number; // Speed for rain snakes (random between 150-600)
  phaseCompletionLogged?: boolean; // Flag to prevent infinite logging in phase4Complete
  returnTargetPosition?: Position; // Target position when returning to playable area
  phase4Count?: number; // How many times phase 4 has been triggered (1, 2, or 3)
  rainMovementPattern?: 'straight' | 'angled' | 'sine'; // Movement pattern for rain snakes
  rainAngle?: number; // Angle for angled movement (30 degrees)
  sineAmplitude?: number; // Amplitude for sine wave movement
  sineFrequency?: number; // Frequency for sine wave movement
  initialX?: number; // Initial X position for sine wave calculation
}

export interface Wall extends Rectangle {}

export interface Door extends Rectangle {
  isOpen: boolean;
}

export interface Key extends Rectangle {
  collected: boolean;
}

export interface SnakePit extends Position {
  id: string;
  radius: number;
  snakeIds: string[]; // IDs of snakes that belong to this pit
  lastEmergenceTime: number; // When a snake last emerged
  emergenceInterval: number; // Time between emergences (3000ms = 3 seconds)
  // Rotation system properties
  currentSnakeIndex: number; // Which snake in the list should emerge next (0-based index)
  nextEmergenceTime: number; // When the next snake should emerge
  isSnakePatrolling: boolean; // Is a snake from this pit currently patrolling
  // Light detection properties
  isLightHit?: boolean; // Whether light beam is currently hitting this pit
  lightEmergenceTime?: number; // When snakes emerged due to light hit
  isLightEmergence?: boolean; // Whether current emergence is due to light
}

export interface Switch extends Rectangle {
  isPressed: boolean;
  id: string;
  switchType?: 'button' | 'lever'; // Visual style of the switch
}

export interface PatternTile extends Rectangle {
  id: string;
  isGlowing: boolean;
  sequenceIndex: number; // The order in which this tile should be stepped on
  hasBeenActivated: boolean;
  customGraphics?: {
    circle?: {
      radius: number;
      color: string;
      centerX: number;
      centerY: number;
    };
    line?: {
      startX: number;
      startY: number;
      endX: number;
      endY: number;
      thickness: number;
      color: string;
    };
  };
  // Cardinal directions available for flow
  cardinalDirections?: {
    north: boolean;
    south: boolean;
    east: boolean;
    west: boolean;
  };
  // Rotation for tiles (0, 90, 180, 270 degrees)
  rotation?: number;
}

export interface FlowState {
  isActive: boolean;
  currentTile: string; // tile ID
  currentPhase: 'entry-to-center' | 'center-to-exit' | 'emptying'; // Flow phase
  entryDirection: 'north' | 'south' | 'east' | 'west' | null; // Where flow entered from
  exitDirection: 'north' | 'south' | 'east' | 'west' | null; // Where flow is heading
  progress: number; // 0 to 1, progress through current phase
  phaseStartTime: number; // When current phase started
  phaseDuration: number; // 1000ms per phase
  lastPosition?: { x: number; y: number }; // Position where flow stopped (for blocked connections)
  isBlocked?: boolean; // True if flow stopped due to incompatible connection
  lockedTiles: string[]; // Tiles that cannot be rotated (locked when flow enters them)
  completedPaths: Array<{
    tileId: string;
    entryDirection: 'north' | 'south' | 'east' | 'west' | null;
    exitDirection: 'north' | 'south' | 'east' | 'west' | null;
  }>; // Track all completed tile paths for persistent visualization (only when flow exits them)
  emptyingPaths: Array<{
    tileId: string;
    entryDirection: 'north' | 'south' | 'east' | 'west' | null;
    exitDirection: 'north' | 'south' | 'east' | 'west' | null;
  }>; // Paths that are being emptied (removed from completedPaths as they empty)
  isEmptying?: boolean; // True when flow is emptying backward
  emptyingFromTile?: string; // Current tile being emptied from
}

export interface ThrowableItem extends Rectangle {
  id: string;
  type: 'rock' | 'bottle' | 'can' | 'chubbs_hand' | 'elis_hip' | 'barbra_hat' | 
        'box_of_golf_balls' | '4_iron' | 'the_prophecy' | 'hammer' | 'box_of_nails' | 
        'bag_of_concrete' | 'the_blue_album' | 'origami_book' | 'tennis_racket' | 'yoga_block';
  isPickedUp: boolean;
  isThrown: boolean;
  velocity?: Position;
  throwStartTime?: number;
  throwDuration?: number; // in seconds
  throwStartPos?: Position;
  throwTargetPos?: Position;
}

export interface Mirror extends Rectangle {
  id: string;
  rotation: number; // 0-360 degrees
  isReflecting: boolean; // true if light is hitting it
}

export interface LightBeam {
  start: Position;
  end: Position;
  segments: Position[]; // Array of points for the light path
}

export interface Crystal extends Rectangle {
  id: string;
  isActivated: boolean; // true if light is hitting it
}

export interface LightSource extends Position {
  rotation: number; // 0-360 degrees, 0 = north, 90 = east, 180 = south, 270 = west
  isOn: boolean; // Whether the light source is currently on
  brightness?: number; // Optional brightness level (0-1)
  radius?: number; // Optional light radius
}

export interface Projectile {
  id: string;
  position: Position;
  velocity: Position;
  size: Size;
  createdAt: number;
  lifespan: number; // How long projectile lives (ms)
  color: string;
}

export interface CarriedItem {
  type: 'rock' | 'bottle' | 'can' | 'chubbs_hand' | 'elis_hip' | 'barbra_hat';
  id: string;
}

export interface PuzzleShard extends Rectangle {
  id: string;
  phase: 'A' | 'B' | 'C'; // Which phase this shard appears in
  collected: boolean;
  shardType: 'a' | 'b' | 'c';
}

export interface PuzzlePedestal extends Rectangle {
  id: string;
  requiredShards: number; // Number of shards needed to activate
  collectedShards: number; // Current number of collected shards
  isActivated: boolean;
}

export interface PhaseWall extends Rectangle {
  id: string;
  wallType: 'shifting' | 'gate'; // ^ = shifting wall, = = gate
  activePhases: ('A' | 'B' | 'C')[]; // Which phases this wall is solid
}

export interface Teleporter extends Rectangle {
  id: string;
  type: 'sender' | 'receiver'; // sender = teleporter pad, receiver = receiving pad
  linkedTeleporterId?: string; // ID of linked teleporter for sender
  activationDelay: number; // Time in ms player must stand on pad before teleporting
  isActive: boolean; // Whether teleporter is currently active (player standing on it)
  activationStartTime?: number; // When player started standing on teleporter
  lastTeleportTime?: number; // Cooldown timestamp to prevent immediate re-activation
}

export interface Boulder extends Rectangle {
  id: string;
  hitCount: number; // Number of times hit by Valerie
  maxHits: number; // Number of hits required to break (2 for level 6)
  isDestroyed: boolean; // Whether the boulder has been destroyed
  destructionTime?: number; // When the boulder was destroyed (timestamp)
  hasSpawnedScreensaver?: boolean; // Whether this boulder has already spawned a screensaver snake
}

export interface MiniBoulder {
  id: string;
  position: Position;
  size: Size;
  velocity: Position;
  gravity: number;
  isLanded: boolean;
  spawnTime: number;
}

export interface Level {
  id: number;
  name: string;
  levelKey: string; // Semantic identifier for code checks
  player: Position;
  walls: Wall[];
  snakes: Snake[];
  door: Door;
  key: Key;
  switches?: Switch[];
  throwableItems?: ThrowableItem[];
  patternTiles?: PatternTile[];
  patternSequence?: number[]; // The correct sequence to step on tiles
  mirrors?: Mirror[];
  crystal?: Crystal;
  lightSource?: LightSource;
  teleporters?: Teleporter[];
  snakePits?: SnakePit[];
  boulders?: Boulder[];
  size: Size;
  startTilePos?: { row: number; col: number }; // For Level 4 randomization
  endTilePos?: { row: number; col: number }; // For Level 4 randomization
}

export type GameState = 'menu' | 'hub' | 'playing' | 'gameOver' | 'victory' | 'levelComplete';

export interface HintState {
  isActive: boolean; // Whether hint is currently showing
  startTime: number; // When the hint started
  currentPhase: 'waiting' | 'appearing' | 'visible' | 'disappearing' | 'finished'; // Current animation phase
  visibleCharacterCount: number; // How many characters are currently visible
  hintString: string; // The full hint string to display
}

export interface GameData {
  currentLevel: number;
  currentLevelKey: string;
  gameState: GameState;
  player: Player;
  snakes: Snake[];
  walls: Wall[];
  door: Door;
  key: Key;
  switches: Switch[];
  throwableItems: ThrowableItem[];
  patternTiles: PatternTile[];
  patternSequence: number[];
  currentPatternStep: number;
  carriedItem: CarriedItem | null;
  levelSize: Size;
  mirrors: Mirror[];
  crystal: Crystal | null;
  lightSource: LightSource | null;
  lightBeam: LightBeam | null;
  flowState: FlowState | null;
  projectiles: Projectile[];
  teleporters: Teleporter[];
  boulders: Boulder[];
  miniBoulders: MiniBoulder[];

  puzzleShards: PuzzleShard[];
  puzzlePedestal: PuzzlePedestal | null;
  phaseWalls: PhaseWall[];
  snakePits: SnakePit[];
  hintState: HintState | null;
}
