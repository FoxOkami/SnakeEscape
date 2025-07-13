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
  type: 'stalker' | 'guard' | 'burster' | 'screensaver';
  position: Position;
  size: Size;
  speed: number;
  direction: Position;
  patrolPoints: Position[];
  currentPatrolIndex: number;
  patrolDirection: number;
  chaseSpeed: number;
  sightRange: number;
  hearingRange?: number; // For stalkers
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
}

export interface Wall extends Rectangle {}

export interface Door extends Rectangle {
  isOpen: boolean;
}

export interface Key extends Rectangle {
  collected: boolean;
}

export interface Switch extends Rectangle {
  isPressed: boolean;
  id: string;
}

export interface PatternTile extends Rectangle {
  id: string;
  isGlowing: boolean;
  sequenceIndex: number; // The order in which this tile should be stepped on
  hasBeenActivated: boolean;
}

export interface ThrowableItem extends Rectangle {
  id: string;
  type: 'rock' | 'bottle' | 'can';
  isPickedUp: boolean;
  isThrown: boolean;
  velocity?: Position;
  throwStartTime?: number;
  throwDuration?: number; // in seconds
  throwStartPos?: Position;
  throwTargetPos?: Position;
}

export interface CarriedItem {
  type: 'rock' | 'bottle' | 'can';
  id: string;
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
  size: Size;
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
}
