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
  position: Position;
  size: Size;
  speed: number;
  direction: Position;
  patrolPoints: Position[];
  currentPatrolIndex: number;
  patrolDirection: number;
  chaseSpeed: number;
  sightRange: number;
  isChasing: boolean;
  chaseTarget?: Position;
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

export interface Level {
  id: number;
  name: string;
  player: Position;
  walls: Wall[];
  snakes: Snake[];
  door: Door;
  key: Key;
  switches?: Switch[];
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
  levelSize: Size;
}
