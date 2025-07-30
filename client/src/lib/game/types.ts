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
}

export interface Snake {
  id: string;
  type: 'stalker' | 'guard' | 'burster' | 'screensaver' | 'plumber' | 'spitter' | 'photophobic' | 'rattlesnake';
  position: Position;
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
  pauseStartTime?: number; // Time when pause started (for 100ms pauses)
  isPaused?: boolean; // Whether currently paused
  chargeDirection?: Position; // Direction of direct charge at player
  isCharging?: boolean; // Whether currently charging at player
  // Rattlesnake-specific properties
  pitId?: string; // Which pit this snake belongs to
  isInPit?: boolean; // Whether snake is currently in the pit
  emergenceTime?: number; // When the snake emerged from pit
  patrolStartTime?: number; // When the snake started its patrol
  patrolDuration?: number; // How long the patrol should last
  returnToPitTime?: number; // When the snake should return to pit
  rattlesnakeState?: 'inPit' | 'patrolling' | 'chasing' | 'pausing' | 'returningToPit'; // Current behavior state
  pauseStartTime?: number; // When the pause phase started
  pitPosition?: Position; // Original pit position to return to
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
  type: 'rock' | 'bottle' | 'can' | 'chubbs_hand' | 'elis_hip' | 'barbra_hat';
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

export interface Level {
  id: number;
  name: string;
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
  size: Size;
  startTilePos?: { row: number; col: number }; // For Level 4 randomization
  endTilePos?: { row: number; col: number }; // For Level 4 randomization
}

export type GameState = 'menu' | 'playing' | 'gameOver' | 'victory' | 'levelComplete';

export interface GameData {
  currentLevel: number;
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

  puzzleShards: PuzzleShard[];
  puzzlePedestal: PuzzlePedestal | null;
  phaseWalls: PhaseWall[];
  snakePits: SnakePit[];
}
