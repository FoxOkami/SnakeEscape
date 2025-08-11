import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import {
  GameData,
  GameState,
  Player,
  Snake,
  Position,
  Wall,
  Door,
  Key,
  Switch,
  PatternTile,
  Mirror,
  Crystal,
  LightBeam,
  FlowState,
  Projectile,
  Teleporter,
  SnakePit,
  Boulder,
  MiniBoulder,
} from "../game/types";
import { LEVELS, randomizeLevel2 } from "../game/levels";
import { checkAABBCollision } from "../game/collision";
import { updateSnake } from "../game/entities";
import { calculateLightBeam } from "../game/lightBeam";
import { useAudio } from "./useAudio";

interface SnakeGameState extends GameData {
  // Levels data
  levels: any[];

  // Pre-randomized Level 2 data (set when starting game)
  level2RandomizedSwitches?: Switch[];
  level2RandomizedThrowableItems?: any[];

  // Performance optimization
  lastLightCheckTime?: number;
  lastLightBeamHash?: string;

  // Actions
  startGame: () => void;
  startFromLevel: (levelIndex: number) => void;
  resetGame: () => void;
  movePlayer: (direction: Position) => void;
  updateGame: (deltaTime: number) => void;
  nextLevel: () => void;
  returnToMenu: () => void;

  // Input state
  keysPressed: Set<string>;
  keyStates: Map<string, number>; // Key state with timestamps
  setKeyPressed: (key: string, pressed: boolean) => void;

  // Movement state
  currentVelocity: Position;
  targetVelocity: Position;
  isWalking: boolean;

  // Item actions
  pickupItem: (itemId: string) => void;
  throwItem: (targetPosition: Position) => void;
  dropItem: () => void;
  pickupNearestItem: () => void;

  // Mirror rotation actions
  rotateMirror: (direction: "clockwise" | "counterclockwise") => void;

  // Light source rotation actions
  rotateLightSource: (direction: "clockwise" | "counterclockwise") => void;

  // Flow system actions
  startFlow: () => void;
  updateFlow: (deltaTime: number) => void;
  getNextTile: (
    currentTileId: string,
    exitDirection: "north" | "south" | "east" | "west",
  ) => any;
  getOppositeDirection: (
    direction: "north" | "south" | "east" | "west",
  ) => "north" | "south" | "east" | "west";
  calculateExitDirection: (
    tileId: string,
    entryDirection: "north" | "south" | "east" | "west",
  ) => "north" | "south" | "east" | "west" | null;
  getTileDirections: (
    tileId: string,
  ) => Array<"north" | "south" | "east" | "west">;

  // Tile rotation actions
  rotateTile: (direction: "left" | "right") => void;

  // Path connection detection
  checkPathConnection: () => boolean;
  removeKeyWalls: () => void;

  // Projectile system actions
  updateProjectiles: (deltaTime: number) => {
    hitCount: number;
    playerKilled: boolean;
  };
  spawnSpitterSnake: (position: Position) => void;
  fireProjectiles: (snakeId: string) => void;

  // Phase system actions
  updatePhase: (deltaTime: number) => void;
  collectPuzzleShard: (shardId: string) => void;
  getCurrentWalls: () => Wall[];

  // Teleporter system actions
  updateTeleporters: (deltaTime: number) => void;
  checkTeleporterCollision: () => void;

  // Snake pit system actions
  updateSnakePits: (deltaTime: number) => void;
  emergeSnakeFromPit: (pitId: string) => void;

  // Hint system actions
  showHint: () => void;
  updateHint: (deltaTime: number) => void;

  // Level 1 randomization
  randomizedSymbols?: string[] | null;
}

const PLAYER_SPEED = 0.2; // pixels per second
const WALKING_SPEED = 0.1; // pixels per second when walking (shift held)
const ACCELERATION = 1; // pixels per second squared

// Helper function to randomize Level 1
function randomizeLevel1() {
  const solutionSequence = [
    "b",
    "2",
    "iy",
    "im",
    "50/50",
    "🛥️",
    "👁️",
    "♥️",
    "u",
  ];

  // All possible tile positions (13 total, 9 will be used)
  const allTilePositions = [
    { x: 80, y: 50 }, // Original positions
    { x: 250, y: 80 },
    { x: 450, y: 60 },
    { x: 120, y: 250 },
    { x: 350, y: 220 },
    { x: 550, y: 250 },
    { x: 60, y: 480 },
    { x: 300, y: 500 },
    { x: 480, y: 380 },
    { x: 260, y: 327 }, // New positions
    { x: 620, y: 131 },
    { x: 629, y: 476 },
    { x: 457, y: 519 },
  ];

  // Shuffle all positions and take only 9
  const shuffledPositions = [...allTilePositions];
  for (let i = shuffledPositions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledPositions[i], shuffledPositions[j]] = [
      shuffledPositions[j],
      shuffledPositions[i],
    ];
  }
  const selectedPositions = shuffledPositions.slice(0, 9);

  // Shuffle the symbols randomly
  const allSymbols = [...solutionSequence];
  for (let i = allSymbols.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allSymbols[i], allSymbols[j]] = [allSymbols[j], allSymbols[i]];
  }

  // Create mapping from symbol to tile index
  const symbolToTileIndex = new Map();
  allSymbols.forEach((symbol, index) => {
    symbolToTileIndex.set(symbol, index);
  });

  // Generate new pattern sequence that follows the solution order
  const newPatternSequence = solutionSequence.map((symbol) =>
    symbolToTileIndex.get(symbol),
  );

  // Create new pattern tiles with selected positions
  const newPatternTiles = selectedPositions.map((position, index) => ({
    id: `tile${index + 1}`,
    x: position.x,
    y: position.y,
    width: 40,
    height: 40,
    isGlowing: false,
    sequenceIndex: index,
    hasBeenActivated: false,
  }));

  return {
    randomizedSymbols: allSymbols,
    newPatternSequence,
    newPatternTiles,
  };
}

// Helper function for line-rectangle intersection
function lineIntersectsRect(
  start: Position,
  end: Position,
  rect: { x: number; y: number; width: number; height: number },
): boolean {
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

export const useSnakeGame = create<SnakeGameState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    currentLevel: 0,
    gameState: "menu",
    levels: LEVELS, // Add levels to store
    player: {
      position: { x: 50, y: 350 },
      size: { width: 32, height: 32 },
      speed: PLAYER_SPEED,
      hasKey: false,
      health: 9,
      maxHealth: 9,
      isInvincible: false,
      invincibilityEndTime: 0,
    },
    snakes: [],
    walls: [],
    door: { x: 0, y: 0, width: 30, height: 40, isOpen: false },
    key: { x: 0, y: 0, width: 20, height: 20, collected: false },
    switches: [],
    throwableItems: [],
    patternTiles: [],
    patternSequence: [],
    currentPatternStep: 0,
    carriedItem: null,
    levelSize: { width: 800, height: 600 },
    mirrors: [],
    crystal: null,
    lightSource: null,
    lightBeam: null,
    flowState: null,
    projectiles: [],
    teleporters: [],
    snakePits: [],
    boulders: [],
    miniBoulders: [],
    lastLightCheckTime: 0,

    puzzleShards: [],
    puzzlePedestal: null,
    phaseWalls: [],
    hintState: null,
    keysPressed: new Set(),
    currentVelocity: { x: 0, y: 0 },
    targetVelocity: { x: 0, y: 0 },
    isWalking: false,
    keyStates: new Map(), // Track key state with timestamps
    randomizedSymbols: null, // Level 1 randomization

    setKeyPressed: (key: string, pressed: boolean) => {
      set((state) => {
        const newKeysPressed = new Set(state.keysPressed);
        const newKeyStates = new Map(state.keyStates);
        const currentTime = Date.now();

        if (pressed) {
          newKeysPressed.add(key);
          newKeyStates.set(key, currentTime);
        } else {
          newKeysPressed.delete(key);
          newKeyStates.delete(key);
        }

        // Clean up old key states to prevent memory leaks
        for (const [k, timestamp] of newKeyStates.entries()) {
          if (currentTime - timestamp > 1000) {
            // Remove keys older than 1 second
            newKeyStates.delete(k);
          }
        }

        // Enhanced key detection for problematic combinations
        // Check for recent key presses to handle missed key events
        const isKeyActiveRecently = (keyCode: string) => {
          return (
            newKeysPressed.has(keyCode) ||
            (newKeyStates.has(keyCode) &&
              currentTime - newKeyStates.get(keyCode)! < 50)
          );
        };

        // Check if walking (Ctrl key held)
        const isWalking =
          isKeyActiveRecently("ControlLeft") ||
          isKeyActiveRecently("ControlRight");
        const moveSpeed = isWalking ? WALKING_SPEED : PLAYER_SPEED;

        // Calculate target velocity with enhanced key detection
        const targetVelocity = { x: 0, y: 0 };

        if (isKeyActiveRecently("ArrowUp") || isKeyActiveRecently("KeyW")) {
          targetVelocity.y -= moveSpeed;
        }
        if (isKeyActiveRecently("ArrowDown") || isKeyActiveRecently("KeyS")) {
          targetVelocity.y += moveSpeed;
        }
        if (isKeyActiveRecently("ArrowLeft") || isKeyActiveRecently("KeyA")) {
          targetVelocity.x -= moveSpeed;
        }
        if (isKeyActiveRecently("ArrowRight") || isKeyActiveRecently("KeyD")) {
          targetVelocity.x += moveSpeed;
        }

        // Normalize diagonal movement to maintain consistent speed
        if (targetVelocity.x !== 0 && targetVelocity.y !== 0) {
          const factor = Math.sqrt(2) / 2; // 1/sqrt(2)
          targetVelocity.x *= factor;
          targetVelocity.y *= factor;
        }

        return {
          keysPressed: newKeysPressed,
          keyStates: newKeyStates,
          targetVelocity: targetVelocity,
          isWalking: isWalking,
        };
      });
    },

    startGame: () => {
      const level = LEVELS[0];

      // Randomize Level 1 symbols and pattern sequence
      const level1Randomization = randomizeLevel1();

      // Pre-randomize Level 2 data for when player progresses
      const level2Randomization = randomizeLevel2();

      set({
        currentLevel: 0,
        gameState: "playing",
        player: {
          position: { ...level.player },
          size: { width: 32, height: 32 },
          speed: PLAYER_SPEED,
          hasKey: false,
          health: 9,
          maxHealth: 9,
          isInvincible: false,
          invincibilityEndTime: 0,
        },
        snakes: level.snakes.map((snake) => ({ ...snake })),
        walls: level.walls.map((wall) => ({ ...wall })),
        door: { ...level.door },
        key: { ...level.key },
        switches: level.switches ? level.switches.map((s) => ({ ...s })) : [],
        throwableItems: level.throwableItems
          ? level.throwableItems.map((item) => ({ ...item }))
          : [],
        patternTiles: level1Randomization.newPatternTiles,
        patternSequence: level1Randomization.newPatternSequence,
        currentPatternStep: 0,
        carriedItem: null,
        levelSize: { ...level.size },
        mirrors: level.mirrors
          ? level.mirrors.map((mirror) => ({ ...mirror }))
          : [],
        crystal: level.crystal ? { ...level.crystal } : null,
        lightSource: level.lightSource ? { ...level.lightSource } : null,
        lightBeam: null,
        projectiles: [],
        teleporters: level.teleporters
          ? level.teleporters.map((teleporter) => ({ ...teleporter }))
          : [],
        snakePits: level.snakePits
          ? level.snakePits.map((pit) => ({ ...pit }))
          : [],
        // Phase system initialization
        currentPhase: level.currentPhase || "A",
        phaseTimer: 0,
        phaseDuration: level.phaseDuration || 10000,
        puzzleShards: level.puzzleShards
          ? level.puzzleShards.map((shard) => ({ ...shard }))
          : [],
        puzzlePedestal: level.puzzlePedestal
          ? { ...level.puzzlePedestal }
          : null,
        phaseWalls: level.phaseWalls
          ? level.phaseWalls.map((wall) => ({ ...wall }))
          : [],
        currentVelocity: { x: 0, y: 0 },
        targetVelocity: { x: 0, y: 0 },
        keysPressed: new Set(),
        isWalking: false,
        hintState: null, // Initialize hint state
        randomizedSymbols: level1Randomization.randomizedSymbols, // Store randomized symbols
        // Store pre-randomized Level 2 data
        level2RandomizedSwitches: level2Randomization.randomizedSwitches,
        level2RandomizedThrowableItems:
          level2Randomization.randomizedThrowableItems,
      });

      // Auto-trigger hint for Level 1 after a short delay
      setTimeout(() => {
        const currentState = get();
        if (
          currentState.currentLevel === 0 &&
          currentState.gameState === "playing"
        ) {
          currentState.showHint();
        }
      }, 3000); // 3 second delay before hint appears
    },

    startFromLevel: (levelIndex: number) => {
      if (levelIndex < 0 || levelIndex >= LEVELS.length) {
        return; // Invalid level index
      }

      const level = LEVELS[levelIndex];

      // Handle Level 1 randomization
      let patternSequence = level.patternSequence
        ? [...level.patternSequence]
        : [];
      let randomizedSymbols = null;
      let newPatternTiles = level.patternTiles
        ? level.patternTiles.map((tile) => ({ ...tile }))
        : [];

      // Handle Level 2 randomization
      let levelSwitches = level.switches
        ? level.switches.map((s) => ({ ...s }))
        : [];
      let levelThrowableItems = level.throwableItems
        ? level.throwableItems.map((item) => ({ ...item }))
        : [];

      if (levelIndex === 0) {
        const randomization = randomizeLevel1();
        patternSequence = randomization.newPatternSequence;
        randomizedSymbols = randomization.randomizedSymbols;
        newPatternTiles = randomization.newPatternTiles;
      } else if (levelIndex === 1) {
        // Use pre-stored randomization if available (from startGame), otherwise generate new
        const currentState = get();
        if (
          currentState.level2RandomizedSwitches &&
          currentState.level2RandomizedThrowableItems
        ) {
          levelSwitches = currentState.level2RandomizedSwitches.map((s) => ({
            ...s,
          }));
          levelThrowableItems = currentState.level2RandomizedThrowableItems.map(
            (item) => ({ ...item }),
          );
        } else {
          const randomization = randomizeLevel2();
          levelSwitches = randomization.randomizedSwitches;
          levelThrowableItems = randomization.randomizedThrowableItems;
        }
      }

      set({
        currentLevel: levelIndex,
        gameState: "playing",
        player: {
          position: { ...level.player },
          size: { width: 32, height: 32 },
          speed: PLAYER_SPEED,
          hasKey: false,
          health: 9,
          maxHealth: 9,
          isInvincible: false,
          invincibilityEndTime: 0,
        },
        snakes: level.snakes.map((snake) => ({ ...snake })),
        walls: level.walls.map((wall) => ({ ...wall })),
        door: { ...level.door },
        key: { ...level.key },
        switches: levelSwitches,
        throwableItems: levelThrowableItems,
        patternTiles: newPatternTiles,
        patternSequence,
        currentPatternStep: 0,
        carriedItem: null,
        levelSize: { ...level.size },
        mirrors: level.mirrors
          ? level.mirrors.map((mirror) => ({ ...mirror }))
          : [],
        crystal: level.crystal ? { ...level.crystal } : null,
        lightSource: level.lightSource ? { ...level.lightSource } : null,
        lightBeam: null,
        projectiles: [],
        teleporters: level.teleporters
          ? level.teleporters.map((teleporter) => ({ ...teleporter }))
          : [],
        snakePits: level.snakePits
          ? level.snakePits.map((pit) => ({ ...pit }))
          : [],
        // Phase system initialization
        currentPhase: level.currentPhase || "A",
        phaseTimer: 0,
        phaseDuration: level.phaseDuration || 10000,
        puzzleShards: level.puzzleShards
          ? level.puzzleShards.map((shard) => ({ ...shard }))
          : [],
        puzzlePedestal: level.puzzlePedestal
          ? { ...level.puzzlePedestal }
          : null,
        phaseWalls: level.phaseWalls
          ? level.phaseWalls.map((wall) => ({ ...wall }))
          : [],
        currentVelocity: { x: 0, y: 0 },
        targetVelocity: { x: 0, y: 0 },
        keysPressed: new Set(),
        isWalking: false,
        boulders: level.boulders
          ? level.boulders.map((boulder) => ({ ...boulder }))
          : [],
        hintState: null, // Initialize hint state
        miniBoulders: [],
        randomizedSymbols, // Store randomized symbols for Level 1
        // Clear pre-stored Level 2 data when directly selecting Level 2
        level2RandomizedSwitches:
          levelIndex === 1 ? undefined : get().level2RandomizedSwitches,
        level2RandomizedThrowableItems:
          levelIndex === 1 ? undefined : get().level2RandomizedThrowableItems,
      });

      // Auto-trigger hint for Level 1 only
      if (levelIndex === 0) {
        setTimeout(() => {
          const currentState = get();
          if (
            currentState.currentLevel === 0 &&
            currentState.gameState === "playing"
          ) {
            currentState.showHint();
          }
        }, 3000); // 3 second delay before hint appears
      }
    },

    resetGame: () => {
      const state = get();
      const level = LEVELS[state.currentLevel];
      set({
        gameState: "playing",
        player: {
          position: { ...level.player },
          size: { width: 32, height: 32 },
          speed: PLAYER_SPEED,
          hasKey: false,
          health: 9,
          maxHealth: 9,
          isInvincible: false,
          invincibilityEndTime: 0,
        },
        snakes: level.snakes.map((snake) => ({ ...snake })),
        walls: level.walls.map((wall) => ({ ...wall })),
        door: { ...level.door },
        key: { ...level.key },
        switches: level.switches ? level.switches.map((s) => ({ ...s })) : [],
        throwableItems: level.throwableItems
          ? level.throwableItems.map((item) => ({ ...item }))
          : [],
        carriedItem: null,
        levelSize: { ...level.size },
        mirrors: level.mirrors
          ? level.mirrors.map((mirror) => ({ ...mirror }))
          : [],
        crystal: level.crystal ? { ...level.crystal } : null,
        lightSource: level.lightSource ? { ...level.lightSource } : null,
        lightBeam: null,
        projectiles: [],
        teleporters: level.teleporters
          ? level.teleporters.map((teleporter) => ({ ...teleporter }))
          : [],
        snakePits: level.snakePits
          ? level.snakePits.map((pit) => ({ ...pit }))
          : [],
        // Phase system reset
        currentPhase: level.currentPhase || "A",
        phaseTimer: 0,
        phaseDuration: level.phaseDuration || 10000,
        puzzleShards: level.puzzleShards
          ? level.puzzleShards.map((shard) => ({ ...shard }))
          : [],
        puzzlePedestal: level.puzzlePedestal
          ? { ...level.puzzlePedestal }
          : null,
        phaseWalls: level.phaseWalls
          ? level.phaseWalls.map((wall) => ({ ...wall }))
          : [],
        boulders: level.boulders
          ? level.boulders.map((boulder) => ({ ...boulder }))
          : [],
        miniBoulders: [],
        currentVelocity: { x: 0, y: 0 },
        targetVelocity: { x: 0, y: 0 },
        keysPressed: new Set(),
        isWalking: false,
      });
    },

    nextLevel: () => {
      const state = get();
      const nextLevelIndex = state.currentLevel + 1;

      if (nextLevelIndex >= LEVELS.length) {
        set({ gameState: "victory" });
        return;
      }

      const level = LEVELS[nextLevelIndex];

      // Handle Level 2 randomization for nextLevel progression
      let levelSwitches = level.switches
        ? level.switches.map((s) => ({ ...s }))
        : [];
      let levelThrowableItems = level.throwableItems
        ? level.throwableItems.map((item) => ({ ...item }))
        : [];

      if (nextLevelIndex === 1) {
        // Use pre-stored randomization from startGame if available
        if (
          state.level2RandomizedSwitches &&
          state.level2RandomizedThrowableItems
        ) {
          levelSwitches = state.level2RandomizedSwitches.map((s) => ({ ...s }));
          levelThrowableItems = state.level2RandomizedThrowableItems.map(
            (item) => ({ ...item }),
          );
        } else {
          // Fallback: generate new randomization
          const randomization = randomizeLevel2();
          levelSwitches = randomization.randomizedSwitches;
          levelThrowableItems = randomization.randomizedThrowableItems;
        }
      }

      set({
        currentLevel: nextLevelIndex,
        gameState: "playing",
        player: {
          position: { ...level.player },
          size: { width: 32, height: 32 },
          speed: PLAYER_SPEED,
          hasKey: false,
          health: state.player.health, // Preserve current health
          maxHealth: 9,
          isInvincible: false,
          invincibilityEndTime: 0,
        },
        snakes: level.snakes.map((snake) => ({ ...snake })),
        walls: level.walls.map((wall) => ({ ...wall })),
        door: { ...level.door },
        key: { ...level.key },
        switches: levelSwitches,
        throwableItems: levelThrowableItems,
        // Clear pre-stored Level 2 data after using it
        level2RandomizedSwitches: undefined,
        level2RandomizedThrowableItems: undefined,
        patternTiles: level.patternTiles
          ? level.patternTiles.map((tile) => ({ ...tile }))
          : [],
        patternSequence: level.patternSequence
          ? [...level.patternSequence]
          : [],
        currentPatternStep: 0,
        carriedItem: null,
        levelSize: { ...level.size },
        mirrors: level.mirrors
          ? level.mirrors.map((mirror) => ({ ...mirror }))
          : [],
        crystal: level.crystal ? { ...level.crystal } : null,
        lightSource: level.lightSource ? { ...level.lightSource } : null,
        lightBeam: null,
        teleporters: level.teleporters
          ? level.teleporters.map((teleporter) => ({ ...teleporter }))
          : [],
        snakePits: level.snakePits
          ? level.snakePits.map((pit) => ({ ...pit }))
          : [],
        projectiles: [],
        // Phase system initialization
        currentPhase: level.currentPhase || "A",
        phaseTimer: 0,
        phaseDuration: level.phaseDuration || 10000,
        puzzleShards: level.puzzleShards
          ? level.puzzleShards.map((shard) => ({ ...shard }))
          : [],
        puzzlePedestal: level.puzzlePedestal
          ? { ...level.puzzlePedestal }
          : null,
        phaseWalls: level.phaseWalls
          ? level.phaseWalls.map((wall) => ({ ...wall }))
          : [],
        boulders: level.boulders
          ? level.boulders.map((boulder) => ({ ...boulder }))
          : [],
        currentVelocity: { x: 0, y: 0 },
        miniBoulders: [],
        targetVelocity: { x: 0, y: 0 },
        keysPressed: new Set(),
        isWalking: false,
      });
    },

    returnToMenu: () => {
      set({ gameState: "menu" });
    },

    movePlayer: (direction: Position) => {
      const state = get();

      if (state.gameState !== "playing") return;

      const newPosition = {
        x: state.player.position.x + direction.x,
        y: state.player.position.y + direction.y,
      };

      // Check bounds
      if (
        newPosition.x < 0 ||
        newPosition.x + state.player.size.width > state.levelSize.width ||
        newPosition.y < 0 ||
        newPosition.y + state.player.size.height > state.levelSize.height
      ) {
        return;
      }

      // Check wall collisions
      const playerRect = {
        x: newPosition.x,
        y: newPosition.y,
        width: state.player.size.width,
        height: state.player.size.height,
      };

      const currentWalls = get().getCurrentWalls();
      const hasWallCollision = currentWalls.some((wall) =>
        checkAABBCollision(playerRect, wall),
      );

      if (hasWallCollision) return;

      // Update player position
      set({
        player: {
          ...state.player,
          position: newPosition,
        },
      });
    },

    updateGame: (deltaTime: number) => {
      const state = get();
      if (state.gameState !== "playing") return;

      // --- SMOOTH PLAYER MOVEMENT ---
      // Smoothly interpolate current velocity toward target velocity
      let newVelocity = { ...state.currentVelocity };

      // Calculate velocity difference
      const velDiff = {
        x: state.targetVelocity.x - state.currentVelocity.x,
        y: state.targetVelocity.y - state.currentVelocity.y,
      };

      // Apply acceleration to approach target velocity
      const maxAccel = ACCELERATION * deltaTime;

      if (Math.abs(velDiff.x) > maxAccel) {
        newVelocity.x += Math.sign(velDiff.x) * maxAccel;
      } else {
        newVelocity.x = state.targetVelocity.x;
      }

      if (Math.abs(velDiff.y) > maxAccel) {
        newVelocity.y += Math.sign(velDiff.y) * maxAccel;
      } else {
        newVelocity.y = state.targetVelocity.y;
      }

      // Calculate new player position based on velocity
      const newPlayerPosition = {
        x: state.player.position.x + newVelocity.x * deltaTime,
        y: state.player.position.y + newVelocity.y * deltaTime,
      };

      // Check bounds and wall collisions for new position
      let finalPosition = { ...state.player.position };
      let finalVelocity = { ...newVelocity };

      // Check X movement
      const testXPosition = {
        x: newPlayerPosition.x,
        y: state.player.position.y,
        width: state.player.size.width,
        height: state.player.size.height,
      };

      // Check for environmental screensaver snake collisions (act as walls)
      const environmentalSnakeCollisionX = state.snakes.some((snake) => {
        if (snake.type !== 'screensaver' || !snake.id.includes('screensaver_snake_') || snake.speed > 0) {
          return false; // Only landed environmental screensaver snakes block movement
        }
        return checkAABBCollision(testXPosition, {
          x: snake.position.x,
          y: snake.position.y,
          width: snake.size.width,
          height: snake.size.height
        });
      });

      // Check for mini boulder collisions (landed ones act as walls)
      const miniBoulderCollisionX = state.miniBoulders.some(boulder => {
        if (!boulder.isLanded) return false;
        return checkAABBCollision(testXPosition, {
          x: boulder.position.x,
          y: boulder.position.y,
          width: boulder.size.width,
          height: boulder.size.height
        });
      });

      const canMoveX =
        newPlayerPosition.x >= 0 &&
        newPlayerPosition.x + state.player.size.width <=
          state.levelSize.width &&
        !get()
          .getCurrentWalls()
          .some((wall) => checkAABBCollision(testXPosition, wall)) &&
        !environmentalSnakeCollisionX &&
        !miniBoulderCollisionX;

      if (canMoveX) {
        finalPosition.x = newPlayerPosition.x;
      } else {
        finalVelocity.x = 0; // Stop horizontal movement when hitting wall
        newVelocity.x = 0; // Also reset current velocity
      }

      // Check Y movement
      const testYPosition = {
        x: finalPosition.x,
        y: newPlayerPosition.y,
        width: state.player.size.width,
        height: state.player.size.height,
      };

      // Check for environmental screensaver snake collisions (act as walls) for Y movement
      const environmentalSnakeCollisionY = state.snakes.some((snake) => {
        if (snake.type !== 'screensaver' || !snake.id.includes('screensaver_snake_') || snake.speed > 0) {
          return false; // Only landed environmental screensaver snakes block movement
        }
        return checkAABBCollision(testYPosition, {
          x: snake.position.x,
          y: snake.position.y,
          width: snake.size.width,
          height: snake.size.height
        });
      });

      // Check for mini boulder collisions (landed ones act as walls) for Y movement
      const miniBoulderCollisionY = state.miniBoulders.some(boulder => {
        if (!boulder.isLanded) return false;
        return checkAABBCollision(testYPosition, {
          x: boulder.position.x,
          y: boulder.position.y,
          width: boulder.size.width,
          height: boulder.size.height
        });
      });

      const canMoveY =
        newPlayerPosition.y >= 0 &&
        newPlayerPosition.y + state.player.size.height <=
          state.levelSize.height &&
        !get()
          .getCurrentWalls()
          .some((wall) => checkAABBCollision(testYPosition, wall)) &&
        !environmentalSnakeCollisionY &&
        !miniBoulderCollisionY;

      if (canMoveY) {
        finalPosition.y = newPlayerPosition.y;
      } else {
        finalVelocity.y = 0; // Stop vertical movement when hitting wall
        newVelocity.y = 0; // Also reset current velocity
      }

      let updatedPlayer = {
        ...state.player,
        position: finalPosition,
      };

      // --- SNAKE AI ---
      // Generate player sounds for stalker snakes when not walking stealthily
      const playerSounds: Position[] = [];
      const isMoving = newVelocity.x !== 0 || newVelocity.y !== 0;
      if (
        isMoving &&
        !state.isWalking &&
        updatedPlayer.position &&
        typeof updatedPlayer.position.x === "number" &&
        typeof updatedPlayer.position.y === "number"
      ) {
        // Player makes sound when moving normally (not walking stealthily)
        playerSounds.push(updatedPlayer.position);
      }

      const currentWalls = get().getCurrentWalls();

      // Calculate quadrant lighting for photophobic snakes (Level 5)
      let quadrantLighting = {};
      if (state.currentLevel === 4) {
        // Level 5 (0-indexed as 4)
        const A =
          state.switches.find((s) => s.id === "light_switch")?.isPressed ||
          false;
        const B =
          state.switches.find((s) => s.id === "switch_1")?.isPressed || false;
        const C =
          state.switches.find((s) => s.id === "switch_2")?.isPressed || false;
        const D =
          state.switches.find((s) => s.id === "switch_3")?.isPressed || false;
        const E =
          state.switches.find((s) => s.id === "switch_4")?.isPressed || false;
        const F =
          state.switches.find((s) => s.id === "switch_5")?.isPressed || false;

        quadrantLighting = {
          topLeft: (A && !B) || (!A && B), // A XOR B
          topRight: C && D, // C AND D
          bottomLeft: !(E && F), // NOT (E AND F)
          bottomRight: ((A && !B) || (!A && B)) && C && D, // (A XOR B) AND (C AND D)
        };
      }

      let newMiniBoulders = [...state.miniBoulders];
      let newSnakes = [...state.snakes];
      
      const updatedSnakes = state.snakes.map((snake) => {
        // Skip updating rattlesnakes that are in pits, returning to pit, or pausing - they'll be handled by updateSnakePits
        // Allow patrolling and chasing rattlesnakes to be processed by normal AI
        if (
          snake.type === "rattlesnake" &&
          (snake.isInPit ||
            snake.rattlesnakeState === "returningToPit" ||
            snake.rattlesnakeState === "pausing")
        ) {
          return snake;
        }
        
        const updatedSnake = updateSnake(
          snake,
          currentWalls,
          deltaTime,
          updatedPlayer,
          playerSounds,
          { ...state, quadrantLighting },
          LEVELS[state.currentLevel]?.size,
          state.boulders,
        );
        
        // Check for environmental effects triggered by boss boulder collision
        if (updatedSnake.environmentalEffects?.spawnMiniBoulders) {
          const spawnedMiniBoulders = get().spawnMiniBoulders(updatedSnake.environmentalEffects.boulderHitPosition, state.levelSize);
          newMiniBoulders.push(...spawnedMiniBoulders);
        }
        
        if (updatedSnake.environmentalEffects?.spawnScreensaverSnake) {
          const screensaverSnake = get().spawnScreensaverSnake(updatedSnake.environmentalEffects.boulderHitPosition, state.levelSize);
          newSnakes.push(screensaverSnake);
        }
        
        if (updatedSnake.environmentalEffects?.spawnPhotophobicSnake) {
          const photophobicSnake = get().spawnPhotophobicSnake(updatedSnake.environmentalEffects.boulderHitPosition, state.levelSize);
          newSnakes.push(photophobicSnake);
        }
        
        // Clear environmental effects after processing
        if (updatedSnake.environmentalEffects) {
          updatedSnake.environmentalEffects = undefined;
        }
        
        return updatedSnake;
      });

      // Handle plumber snake tile rotations
      let updatedPatternTilesFromRotation = state.patternTiles;
      updatedSnakes.forEach((snake) => {
        if (snake.type === "plumber" && snake.tileToRotate) {
          // Check if the tile is locked (flow has passed through it)
          const isLocked =
            state.flowState &&
            state.flowState.lockedTiles.includes(snake.tileToRotate);

          if (!isLocked) {
            const tileIndex = updatedPatternTilesFromRotation.findIndex(
              (t) => t.id === snake.tileToRotate,
            );
            if (tileIndex !== -1) {
              const currentRotation =
                updatedPatternTilesFromRotation[tileIndex].rotation || 0;
              const newRotation = (currentRotation + 90) % 360;
              updatedPatternTilesFromRotation =
                updatedPatternTilesFromRotation.map((tile, index) =>
                  index === tileIndex
                    ? { ...tile, rotation: newRotation }
                    : tile,
                );
            }
          }
          // Clear the rotation request regardless of whether rotation occurred
          snake.tileToRotate = undefined;
        }
      });

      // --- COLLISION DETECTION ---
      const playerRect = {
        x: updatedPlayer.position.x,
        y: updatedPlayer.position.y,
        width: updatedPlayer.size.width,
        height: updatedPlayer.size.height,
      };

      // Check for invincibility expiration
      const invincibilityCheckTime = performance.now();
      if (
        updatedPlayer.isInvincible &&
        invincibilityCheckTime >= updatedPlayer.invincibilityEndTime
      ) {
        updatedPlayer.isInvincible = false;
      }

      const hitBySnake =
        !updatedPlayer.isInvincible &&
        updatedSnakes.some((snake) => {
          const snakeRect = {
            x: snake.position.x,
            y: snake.position.y,
            width: snake.size.width,
            height: snake.size.height,
          };
          return checkAABBCollision(playerRect, snakeRect);
        });

      if (hitBySnake) {
        updatedPlayer.health -= 1;

        if (updatedPlayer.health <= 0) {
          // Player is dead - game over
          set({ gameState: "gameOver", player: updatedPlayer });
          return;
        } else {
          // Player takes damage but survives - start invincibility period
          updatedPlayer.isInvincible = true;
          updatedPlayer.invincibilityEndTime = invincibilityCheckTime + 1000; // 1 second of invincibility

          // Play hit sound
          const { playHit } = useAudio.getState();
          playHit();
        }
      }

      // --- THROWN ITEM PHYSICS ---
      const currentTime = performance.now() / 1000;
      let updatedThrowableItems = state.throwableItems.map((item) => {
        if (
          item.isThrown &&
          item.throwStartTime &&
          item.throwDuration &&
          item.throwStartPos &&
          item.throwTargetPos
        ) {
          const elapsedTime = currentTime - item.throwStartTime;
          const progress = Math.min(elapsedTime / item.throwDuration, 1);

          if (progress >= 1) {
            // Item has landed - play sound
            const { playRock } = useAudio.getState();
            playRock();

            return {
              ...item,
              x: item.throwTargetPos.x - item.width / 2,
              y: item.throwTargetPos.y - item.height / 2,
              isThrown: false,
              throwStartTime: undefined,
              throwDuration: undefined,
              throwStartPos: undefined,
              throwTargetPos: undefined,
            };
          } else {
            // Interpolate position during flight
            const x =
              item.throwStartPos.x +
              (item.throwTargetPos.x - item.throwStartPos.x) * progress;
            const y =
              item.throwStartPos.y +
              (item.throwTargetPos.y - item.throwStartPos.y) * progress;

            return {
              ...item,
              x: x - item.width / 2,
              y: y - item.height / 2,
            };
          }
        }
        return item;
      });

      // --- ITEM INTERACTIONS ---
      // Check key collection
      let updatedKey = state.key;
      if (!state.key.collected && checkAABBCollision(playerRect, state.key)) {
        updatedKey = { ...state.key, collected: true };
        updatedPlayer = { ...updatedPlayer, hasKey: true };
      }

      // Check puzzle shard collection (Level 5)
      state.puzzleShards.forEach((shard) => {
        if (
          !shard.collected &&
          shard.phase === state.currentPhase &&
          checkAABBCollision(playerRect, shard)
        ) {
          get().collectPuzzleShard(shard.id);
        }
      });

      // Check teleporter collisions
      const teleportResult = get().checkTeleporterCollision();
      if (teleportResult) {
        // Player is being teleported - update position and teleporter state
        updatedPlayer = {
          ...updatedPlayer,
          position: teleportResult.targetPosition,
        };
        // The teleporter state will be updated in the main set() call below
        set({ teleporters: teleportResult.teleporters });
      }

      // Check switch interactions
      let updatedSwitches = state.switches.map((switchObj) => {
        // Regular switch logic (for switch1)
        if (switchObj.id === "switch1") {
          if (checkAABBCollision(playerRect, switchObj)) {
            return { ...switchObj, isPressed: true };
          }
          return switchObj;
        }

        // Pressure plate logic (for pressure1, pressure2, pressure3)
        if (switchObj.id.startsWith("pressure")) {
          let isPressed = false;

          // Check if player is on the pressure plate
          if (checkAABBCollision(playerRect, switchObj)) {
            isPressed = true;
          }

          // Check if any throwable items are on the pressure plate
          for (const item of updatedThrowableItems) {
            if (!item.isPickedUp && !item.isThrown) {
              const itemRect = {
                x: item.x,
                y: item.y,
                width: item.width,
                height: item.height,
              };
              if (checkAABBCollision(itemRect, switchObj)) {
                isPressed = true;
                break;
              }
            }
          }

          return { ...switchObj, isPressed };
        }

        // Lever switch logic (for light_switch) - handled in toggleLightSwitch function
        if (switchObj.switchType === "lever") {
          return switchObj; // State changes only on E key press
        }

        return switchObj;
      });

      // Check pattern tile interactions (use tiles with rotations if available)
      let updatedPatternTiles =
        updatedPatternTilesFromRotation.length > 0
          ? [...updatedPatternTilesFromRotation]
          : [...state.patternTiles];
      let updatedCurrentPatternStep = state.currentPatternStep;
      let shouldOpenKeyRoom = false;

      // Check if player is stepping on any pattern tile
      for (const tile of updatedPatternTiles) {
        if (checkAABBCollision(playerRect, tile) && !tile.hasBeenActivated) {
          // Mark this tile as activated
          const tileIndex = updatedPatternTiles.findIndex(
            (t) => t.id === tile.id,
          );
          updatedPatternTiles[tileIndex] = { ...tile, hasBeenActivated: true };

          // Check if this is the correct next tile in the sequence
          if (
            state.patternSequence[updatedCurrentPatternStep] ===
            tile.sequenceIndex
          ) {
            updatedCurrentPatternStep++;

            // If we've completed the sequence, open the key room
            if (updatedCurrentPatternStep >= state.patternSequence.length) {
              shouldOpenKeyRoom = true;
              // Start the pattern demonstration again
              updatedPatternTiles = updatedPatternTiles.map((t) => ({
                ...t,
                isGlowing: false,
              }));
            }
          } else {
            // Wrong tile pressed, reset the pattern
            updatedCurrentPatternStep = 0;
            updatedPatternTiles = updatedPatternTiles.map((t) => ({
              ...t,
              hasBeenActivated: false,
              isGlowing: false,
            }));
          }
          break;
        }
      }

      // Handle pattern demonstration (make tiles glow in sequence)
      if (state.patternTiles.length > 0 && !shouldOpenKeyRoom) {
        const currentTime = Date.now();
        const demonstrationInterval = 1000; // 1 second between each tile
        const cycleTime =
          state.patternSequence.length * demonstrationInterval + 2000; // 2 second pause
        const timeInCycle = currentTime % cycleTime;

        if (
          timeInCycle <
          state.patternSequence.length * demonstrationInterval
        ) {
          const currentDemoStep = Math.floor(
            timeInCycle / demonstrationInterval,
          );
          const targetSequenceIndex = state.patternSequence[currentDemoStep];

          updatedPatternTiles = updatedPatternTiles.map((tile) => ({
            ...tile,
            isGlowing: tile.sequenceIndex === targetSequenceIndex,
          }));
        } else {
          // Pause period - no tiles glowing
          updatedPatternTiles = updatedPatternTiles.map((tile) => ({
            ...tile,
            isGlowing: false,
          }));
        }
      }

      // Open key room if pattern completed
      if (shouldOpenKeyRoom) {
        // Remove all walls of the key room to allow access
        const keyRoomWalls = state.walls.filter((wall) => {
          // Filter out all four walls of the key chamber (updated coordinates)
          const isTopWall =
            wall.x === 610 &&
            wall.y === 270 &&
            wall.width === 80 &&
            wall.height === 20;
          const isBottomWall =
            wall.x === 610 &&
            wall.y === 330 &&
            wall.width === 80 &&
            wall.height === 20;
          const isLeftWall =
            wall.x === 610 &&
            wall.y === 270 &&
            wall.width === 20 &&
            wall.height === 80;
          const isRightWall =
            wall.x === 670 &&
            wall.y === 270 &&
            wall.width === 20 &&
            wall.height === 80;

          return !(isTopWall || isBottomWall || isLeftWall || isRightWall);
        });
        set({ walls: keyRoomWalls });
      }

      // Handle key room walls for level 2 pressure plates
      if (state.currentLevel === 1) {
        // Level 2 (0-indexed)
        const pressurePlates = updatedSwitches.filter((s) =>
          s.id.startsWith("pressure"),
        );
        const allPressurePlatesActive =
          pressurePlates.length === 3 &&
          pressurePlates.every((p) => p.isPressed);

        // Define all four key room walls (matching levels.ts)
        const keyRoomWallPositions = [
          { x: 620, y: 320, width: 80, height: 20 }, // top wall
          { x: 620, y: 380, width: 80, height: 20 }, // bottom wall
          { x: 620, y: 320, width: 20, height: 80 }, // left wall
          { x: 680, y: 320, width: 20, height: 80 }, // right wall
        ];

        const isKeyRoomWall = (wall: any) => {
          return keyRoomWallPositions.some(
            (keyWall) =>
              wall.x === keyWall.x &&
              wall.y === keyWall.y &&
              wall.width === keyWall.width &&
              wall.height === keyWall.height,
          );
        };

        // Check if any key room walls exist
        const keyRoomWallsExist = state.walls.some((wall) =>
          isKeyRoomWall(wall),
        );

        if (allPressurePlatesActive && keyRoomWallsExist) {
          // Remove all key room walls
          const newWalls = state.walls.filter((wall) => !isKeyRoomWall(wall));
          set({ walls: newWalls });
        } else if (!allPressurePlatesActive && !keyRoomWallsExist) {
          // Add all key room walls back if not all pressure plates are active
          const newWalls = [...state.walls, ...keyRoomWallPositions];
          set({ walls: newWalls });
        }
      }

      // Handle Level 5 progressive wall removal switches
      if (state.currentLevel === 4) {
        // Level 5 (0-indexed)
        const middleSwitch = updatedSwitches.find(
          (s) => s.id === "middle_switch",
        );
        const innerSwitch = updatedSwitches.find(
          (s) => s.id === "inner_switch",
        );

        // Check if middle switch is pressed - remove middle rectangle walls
        if (middleSwitch && middleSwitch.isPressed) {
          const middleWallsExist = state.walls.some(
            (wall) =>
              (wall.x === 100 && wall.y === 75) || // Top middle wall
              (wall.x === 100 && wall.y === 505) || // Bottom middle wall
              (wall.x === 100 && wall.y === 75 && wall.width === 20) || // Left middle wall
              (wall.x === 680 && wall.y === 75), // Right middle wall
          );

          if (middleWallsExist) {
            // Remove all middle rectangle walls
            const newWalls = state.walls.filter(
              (wall) =>
                !(
                  (
                    (wall.x === 100 &&
                      wall.y === 75 &&
                      wall.width === 600 &&
                      wall.height === 20) || // Top middle
                    (wall.x === 100 &&
                      wall.y === 505 &&
                      wall.width === 600 &&
                      wall.height === 20) || // Bottom middle
                    (wall.x === 100 &&
                      wall.y === 75 &&
                      wall.width === 20 &&
                      wall.height === 450) || // Left middle
                    (wall.x === 680 &&
                      wall.y === 75 &&
                      wall.width === 20 &&
                      wall.height === 450)
                  ) // Right middle
                ),
            );
            set({ walls: newWalls });
          }
        }

        // Check if inner switch is pressed - remove inner rectangle walls
        if (innerSwitch && innerSwitch.isPressed) {
          const innerWallsExist = state.walls.some(
            (wall) =>
              (wall.x === 200 && wall.y === 150) || // Top inner wall
              (wall.x === 200 && wall.y === 430) || // Bottom inner wall
              (wall.x === 200 && wall.y === 150 && wall.width === 20) || // Left inner wall
              (wall.x === 580 && wall.y === 150), // Right inner wall
          );

          if (innerWallsExist) {
            // Remove all inner rectangle walls
            const newWalls = state.walls.filter(
              (wall) =>
                !(
                  (
                    (wall.x === 200 &&
                      wall.y === 150 &&
                      wall.width === 400 &&
                      wall.height === 20) || // Top inner
                    (wall.x === 200 &&
                      wall.y === 430 &&
                      wall.width === 400 &&
                      wall.height === 20) || // Bottom inner
                    (wall.x === 200 &&
                      wall.y === 150 &&
                      wall.width === 20 &&
                      wall.height === 300) || // Left inner
                    (wall.x === 580 &&
                      wall.y === 150 &&
                      wall.width === 20 &&
                      wall.height === 300)
                  ) // Right inner
                ),
            );
            set({ walls: newWalls });
          }
        }
      }

      // --- LIGHT BEAM CALCULATION ---
      let updatedLightBeam = state.lightBeam;
      let updatedMirrors = state.mirrors;
      let updatedCrystal = state.crystal;

      if (state.lightSource && state.crystal) {
        updatedLightBeam = calculateLightBeam(
          state.lightSource,
          state.mirrors,
          state.crystal,
          state.walls,
        );

        // Mirrors are already updated by calculateLightBeam function
        updatedMirrors = state.mirrors;

        // Update crystal based on light beam
        if (updatedLightBeam) {
          const crystalHit = updatedLightBeam.segments.some(
            (segment, index) => {
              if (index === 0) return false; // Skip first segment (light source)
              const prevSegment = updatedLightBeam.segments[index - 1];
              return lineIntersectsRect(prevSegment, segment, state.crystal!);
            },
          );

          updatedCrystal = { ...state.crystal, isActivated: crystalHit };
        }
      }

      // Handle Level 3 crystal activation - dynamic wall state based on light beam and mirror usage
      if (state.currentLevel === 2 && updatedCrystal) {
        // Define all four key room walls for Level 3
        const keyRoomWalls = [
          { x: 660, y: 270, width: 80, height: 20 }, // Top wall
          { x: 660, y: 330, width: 80, height: 20 }, // Bottom wall
          { x: 660, y: 270, width: 20, height: 80 }, // Left wall
          { x: 720, y: 270, width: 20, height: 80 }, // Right wall
        ];

        const keyRoomWallsExist = keyRoomWalls.some((keyWall) =>
          state.walls.some(
            (wall) =>
              wall.x === keyWall.x &&
              wall.y === keyWall.y &&
              wall.width === keyWall.width &&
              wall.height === keyWall.height,
          ),
        );

        // Check if all mirrors are being used (reflecting)
        const allMirrorsUsed = updatedMirrors.every(
          (mirror) => mirror.isReflecting,
        );

        // Puzzle is solved when crystal is activated AND all mirrors are being used
        const puzzleSolved = updatedCrystal.isActivated && allMirrorsUsed;

        if (puzzleSolved && keyRoomWallsExist) {
          // Puzzle solved - remove all key room walls
          const newWalls = state.walls.filter(
            (wall) =>
              !keyRoomWalls.some(
                (keyWall) =>
                  wall.x === keyWall.x &&
                  wall.y === keyWall.y &&
                  wall.width === keyWall.width &&
                  wall.height === keyWall.height,
              ),
          );
          set({ walls: newWalls });
        } else if (!puzzleSolved && !keyRoomWallsExist) {
          // Puzzle not solved - restore all key room walls
          const newWalls = [...state.walls, ...keyRoomWalls];
          set({ walls: newWalls });
        }
      }

      // Check door interaction
      let updatedDoor = state.door;
      const allSwitchesPressed =
        updatedSwitches.length === 0 ||
        updatedSwitches.every((s) => s.isPressed);

      // Level 3 (light reflection puzzle) - player must have key, crystal activated, and all mirrors used
      if (
        state.currentLevel === 2 &&
        updatedPlayer.hasKey &&
        updatedCrystal &&
        updatedCrystal.isActivated
      ) {
        const allMirrorsUsed = updatedMirrors.every(
          (mirror) => mirror.isReflecting,
        );
        if (allMirrorsUsed) {
          updatedDoor = { ...state.door, isOpen: true };
        }
      }
      // Level 5 (logic gate puzzle) - player only needs the key
      else if (state.currentLevel === 4 && updatedPlayer.hasKey) {
        updatedDoor = { ...state.door, isOpen: true };
      }
      // Other levels - player must have key and all switches pressed
      else if (
        state.currentLevel !== 2 &&
        state.currentLevel !== 4 &&
        updatedPlayer.hasKey &&
        allSwitchesPressed
      ) {
        updatedDoor = { ...state.door, isOpen: true };
      }

      // Check exit
      if (updatedDoor.isOpen && checkAABBCollision(playerRect, updatedDoor)) {
        set({ gameState: "levelComplete" });
        return;
      }

      // --- LEVEL 6 BOULDER MECHANICS ---
      // Check if all boulders are destroyed and spawn key if needed
      let updatedBoulders = state.boulders;
      if (state.currentLevel === 5 && state.boulders.length > 0) {
        // Level 6 (0-indexed as 5)
        const destroyedBoulders = state.boulders.filter(boulder => boulder.isDestroyed);
        const allBouldersDestroyed = destroyedBoulders.length === state.boulders.length;
        
        // If all boulders are destroyed and key hasn't been spawned yet (key starts hidden)
        if (allBouldersDestroyed && updatedKey.x === -100 && updatedKey.y === -100) {
          // Find the boulder that was destroyed most recently
          const lastDestroyedBoulder = destroyedBoulders
            .filter(boulder => boulder.destructionTime) // Only boulders with destruction time
            .sort((a, b) => (b.destructionTime || 0) - (a.destructionTime || 0))[0]; // Sort by most recent first
          
          if (lastDestroyedBoulder) {
            updatedKey = {
              ...updatedKey,
              x: lastDestroyedBoulder.x + lastDestroyedBoulder.width / 2 - 10, // Center key on boulder position
              y: lastDestroyedBoulder.y + lastDestroyedBoulder.height / 2 - 10,
              collected: false
            };
          }
        }
      }

      // --- PROJECTILE SYSTEM ---
      // Update projectiles and spitter snake firing
      const projectileResult = get().updateProjectiles(
        deltaTime,
        updatedPlayer,
      );

      // Handle projectile hits to player
      if (projectileResult.hitCount > 0) {
        updatedPlayer.health -= projectileResult.hitCount;
        updatedPlayer.isInvincible = true;
        updatedPlayer.invincibilityEndTime = performance.now() + 1000;

        if (updatedPlayer.health <= 0) {
          set({ gameState: "gameOver", player: updatedPlayer });
          return;
        }
      }

      // --- SNAKE PIT SYSTEM ---
      // Update snake pits and rattlesnake emergence
      get().updateSnakePits(deltaTime);

      // --- HINT SYSTEM ---
      // Update hint animation
      get().updateHint(deltaTime);

      // --- ENVIRONMENTAL EFFECTS ---
      // Update mini boulders physics and lifetime
      get().updateMiniBoulders(deltaTime);

      // --- UPDATE STATE ---
      // Get the most up-to-date snakes after all processing (snake pits, projectiles, environmental effects)
      const finalSnakes = newSnakes.length > state.snakes.length ? [...newSnakes] : get().snakes;

      set({
        currentVelocity: newVelocity, // Use the updated velocity that includes wall collision resets
        snakes: finalSnakes, // Use snakes after pit/projectile processing
        miniBoulders: newMiniBoulders, // Add the mini boulders to the state
        key: updatedKey,
        player: updatedPlayer,
        switches: updatedSwitches,
        door: updatedDoor,
        throwableItems: updatedThrowableItems,
        patternTiles: updatedPatternTiles,
        currentPatternStep: updatedCurrentPatternStep,
        lightBeam: updatedLightBeam,
        mirrors: updatedMirrors,
        crystal: updatedCrystal,
        boulders: updatedBoulders,
      });
    },

    pickupItem: (itemId: string) => {
      const state = get();
      if (state.carriedItem) return; // Already carrying something

      const item = state.throwableItems.find(
        (item) => item.id === itemId && !item.isPickedUp,
      );
      if (!item) return;

      const playerRect = {
        x: state.player.position.x,
        y: state.player.position.y,
        width: state.player.size.width,
        height: state.player.size.height,
      };

      // Check if player is close enough to pick up the item
      if (checkAABBCollision(playerRect, item)) {
        set({
          throwableItems: state.throwableItems.map((i) =>
            i.id === itemId ? { ...i, isPickedUp: true } : i,
          ),
          carriedItem: { type: item.type, id: item.id },
        });
      }
    },

    throwItem: (targetPosition: Position) => {
      const state = get();
      if (!state.carriedItem) return; // Not carrying anything

      // Check if the carried item is one of the non-throwable items
      const nonThrowableTypes = [
        "chubbs_hand",
        "elis_hip",
        "barbra_hat",
        "box_of_golf_balls",
        "4_iron",
        "the_prophecy",
        "hammer",
        "box_of_nails",
        "bag_of_concrete",
        "the_blue_album",
        "origami_book",
        "tennis_racket",
        "yoga_block",
      ];
      if (nonThrowableTypes.includes(state.carriedItem.type)) {
        // Instead of throwing, just drop the item at the player's position
        const itemIndex = state.throwableItems.findIndex(
          (item) => item.id === state.carriedItem!.id,
        );
        if (itemIndex === -1) return;

        set({
          throwableItems: state.throwableItems.map((item, index) =>
            index === itemIndex
              ? {
                  ...item,
                  isPickedUp: false,
                  x: state.player.position.x,
                  y: state.player.position.y,
                }
              : item,
          ),
          carriedItem: null,
        });
        return;
      }

      const currentTime = performance.now() / 1000; // Convert to seconds
      const throwDuration = 1.0; // 1 second flight time

      // Find the carried item in throwableItems array
      const itemIndex = state.throwableItems.findIndex(
        (item) => item.id === state.carriedItem!.id,
      );
      if (itemIndex === -1) return;

      const thrownItem = state.throwableItems[itemIndex];

      set({
        throwableItems: state.throwableItems.map((item, index) =>
          index === itemIndex
            ? {
                ...item,
                isThrown: true,
                throwStartTime: currentTime,
                throwDuration: throwDuration,
                throwStartPos: { ...state.player.position },
                throwTargetPos: { ...targetPosition },
              }
            : item,
        ),
        carriedItem: null,
      });
    },

    dropItem: () => {
      const state = get();
      if (!state.carriedItem) return; // Not carrying anything

      const itemIndex = state.throwableItems.findIndex(
        (item) => item.id === state.carriedItem!.id,
      );
      if (itemIndex === -1) return;

      set({
        throwableItems: state.throwableItems.map((item, index) =>
          index === itemIndex
            ? {
                ...item,
                isPickedUp: false,
                x: state.player.position.x,
                y: state.player.position.y,
              }
            : item,
        ),
        carriedItem: null,
      });
    },

    pickupNearestItem: () => {
      const state = get();
      if (state.carriedItem) return; // Already carrying something

      const playerRect = {
        x: state.player.position.x,
        y: state.player.position.y,
        width: state.player.size.width,
        height: state.player.size.height,
      };

      // Find all items within pickup range
      const nearbyItems = state.throwableItems.filter((item) => {
        if (item.isPickedUp) return false;

        const distance = Math.sqrt(
          Math.pow(state.player.position.x - item.x, 2) +
            Math.pow(state.player.position.y - item.y, 2),
        );
        return distance < 50; // Pickup range
      });

      if (nearbyItems.length === 0) return;

      // Find the closest item
      const closestItem = nearbyItems.reduce((closest, item) => {
        const closestDistance = Math.sqrt(
          Math.pow(state.player.position.x - closest.x, 2) +
            Math.pow(state.player.position.y - closest.y, 2),
        );
        const itemDistance = Math.sqrt(
          Math.pow(state.player.position.x - item.x, 2) +
            Math.pow(state.player.position.y - item.y, 2),
        );
        return itemDistance < closestDistance ? item : closest;
      });

      // Use the existing pickupItem function
      get().pickupItem(closestItem.id);
    },

    rotateMirror: (direction: "clockwise" | "counterclockwise") => {
      const state = get();
      if (state.gameState !== "playing" || state.currentLevel !== 2) return; // Only on level 3 (0-indexed)

      // Find mirror within interaction range
      const nearbyMirror = state.mirrors.find((mirror) => {
        const distance = Math.sqrt(
          Math.pow(
            state.player.position.x +
              state.player.size.width / 2 -
              (mirror.x + mirror.width / 2),
            2,
          ) +
            Math.pow(
              state.player.position.y +
                state.player.size.height / 2 -
                (mirror.y + mirror.height / 2),
              2,
            ),
        );
        return distance < 60; // Interaction range
      });

      if (!nearbyMirror) return;

      // Calculate rotation change based on direction (1-degree increments)
      const rotationChange = direction === "clockwise" ? 1 : -1;

      // Update mirror rotation
      set({
        mirrors: state.mirrors.map((mirror) =>
          mirror.id === nearbyMirror.id
            ? {
                ...mirror,
                rotation: (mirror.rotation + rotationChange + 360) % 360,
              }
            : mirror,
        ),
      });
    },

    rotateLightSource: (direction: "clockwise" | "counterclockwise") => {
      const state = get();
      if (
        state.gameState !== "playing" ||
        state.currentLevel !== 2 ||
        !state.lightSource
      )
        return; // Only on level 3 (0-indexed)

      // Check if player is near light source
      const centerX = state.lightSource.x;
      const centerY = state.lightSource.y;
      const distance = Math.sqrt(
        Math.pow(
          state.player.position.x + state.player.size.width / 2 - centerX,
          2,
        ) +
          Math.pow(
            state.player.position.y + state.player.size.height / 2 - centerY,
            2,
          ),
      );

      if (distance > 60) return; // Must be within interaction range

      // Calculate rotation change based on direction (1-degree increments)
      const rotationChange = direction === "clockwise" ? 1 : -1;

      // Update light source rotation
      set({
        lightSource: {
          ...state.lightSource,
          rotation: (state.lightSource.rotation + rotationChange + 360) % 360,
        },
      });
    },

    startFlow: () => {
      const state = get();
      if (state.currentLevel !== 3) return; // Only on level 4 (0-indexed)

      // Get dynamic start tile position
      const currentLevel = state.levels[state.currentLevel];
      const startTilePos = currentLevel.startTilePos;
      const startTileId = startTilePos
        ? `grid_tile_${startTilePos.row}_${startTilePos.col}`
        : "grid_tile_3_0";

      set({
        flowState: {
          isActive: true,
          currentTile: startTileId,
          currentPhase: "entry-to-center",
          entryDirection: null,
          exitDirection: "east",
          progress: 0,
          phaseStartTime: Date.now(),
          phaseDuration: 500, // 0.5 second per phase (doubled speed)
          lastPosition: undefined,
          isBlocked: false,
          lockedTiles: [startTileId], // Lock the starting tile immediately
          completedPaths: [], // Clear previous paths when starting new flow
          emptyingPaths: [],
          isEmptying: false,
          emptyingFromTile: undefined,
        },
      });
    },

    updateFlow: (deltaTime: number) => {
      const state = get();
      if (!state.flowState || !state.flowState.isActive) return;

      const currentTime = Date.now();
      const elapsedTime = currentTime - state.flowState.phaseStartTime;
      const progress = Math.min(elapsedTime / state.flowState.phaseDuration, 1);

      // Update progress
      set({
        flowState: {
          ...state.flowState,
          progress,
        },
      });

      // Check if phase is complete
      if (progress >= 1) {
        if (state.flowState.currentPhase === "entry-to-center") {
          // Move to center-to-exit phase
          set({
            flowState: {
              ...state.flowState,
              currentPhase: "center-to-exit",
              progress: 0,
              phaseStartTime: currentTime,
            },
          });
        } else if (state.flowState.currentPhase === "center-to-exit") {
          // Handle emptying mode or regular flow
          if (state.flowState.isEmptying) {
            // Emptying mode: remove the current tile from locked tiles and completed paths
            const newLockedTiles = state.flowState.lockedTiles.filter(
              (tileId) => tileId !== state.flowState.currentTile,
            );
            const newCompletedPaths = state.flowState.completedPaths.filter(
              (path) => path.tileId !== state.flowState.currentTile,
            );

            // Remove the current tile from emptying paths to prevent infinite loops
            const newEmptyingPaths = state.flowState.emptyingPaths.filter(
              (path) => path.tileId !== state.flowState.currentTile,
            );

            // Find next tile in remaining emptying paths
            const currentPath = state.flowState.emptyingPaths.find(
              (path) => path.tileId === state.flowState.currentTile,
            );
            if (
              currentPath &&
              currentPath.exitDirection &&
              newEmptyingPaths.length > 0
            ) {
              const nextTile = get().getNextTile(
                state.flowState.currentTile,
                currentPath.exitDirection,
              );
              const nextPath = newEmptyingPaths.find(
                (path) => path.tileId === nextTile?.id,
              );

              if (nextTile && nextPath) {
                // Move to next tile
                set({
                  flowState: {
                    ...state.flowState,
                    currentTile: nextTile.id,
                    entryDirection: nextPath.entryDirection,
                    exitDirection: nextPath.exitDirection,
                    currentPhase: "entry-to-center",
                    progress: 0,
                    phaseStartTime: currentTime,
                    lockedTiles: newLockedTiles,
                    completedPaths: newCompletedPaths,
                    emptyingPaths: newEmptyingPaths,
                  },
                });
              } else {
                // No valid next tile found, but there are still paths to empty
                // Find any remaining path to continue emptying
                const remainingPath = newEmptyingPaths[0];
                if (remainingPath) {
                  set({
                    flowState: {
                      ...state.flowState,
                      currentTile: remainingPath.tileId,
                      entryDirection: remainingPath.entryDirection,
                      exitDirection: remainingPath.exitDirection,
                      currentPhase: "entry-to-center",
                      progress: 0,
                      phaseStartTime: currentTime,
                      lockedTiles: newLockedTiles,
                      completedPaths: newCompletedPaths,
                      emptyingPaths: newEmptyingPaths,
                    },
                  });
                } else {
                  // Emptying complete
                  set({
                    flowState: {
                      isActive: false,
                      currentPhase: "entry-to-center",
                      isEmptying: false,
                      currentTile: "",
                      entryDirection: null,
                      exitDirection: null,
                      progress: 0,
                      phaseStartTime: 0,
                      phaseDuration: 400,
                      completedPaths: [],
                      emptyingPaths: [],
                      lastPosition: undefined,
                      isBlocked: false,
                      lockedTiles: [],
                    },
                  });
                }
              }
            } else {
              // No more emptying paths - complete the emptying process
              set({
                flowState: {
                  isActive: false,
                  currentPhase: "entry-to-center",
                  isEmptying: false,
                  currentTile: "",
                  entryDirection: null,
                  exitDirection: null,
                  progress: 0,
                  phaseStartTime: 0,
                  phaseDuration: 400,
                  completedPaths: [],
                  emptyingPaths: [],
                  lastPosition: undefined,
                  isBlocked: false,
                  lockedTiles: [],
                },
              });
            }
          } else if (
            state.flowState.currentTile ===
            (state.levels[state.currentLevel].endTilePos
              ? `grid_tile_${state.levels[state.currentLevel].endTilePos!.row}_${state.levels[state.currentLevel].endTilePos!.col}`
              : "grid_tile_6_7")
          ) {
            // Add final tile to completed paths
            const finalPath = {
              tileId: state.flowState.currentTile,
              entryDirection: state.flowState.entryDirection,
              exitDirection: state.flowState.exitDirection,
            };

            // Flow completed successfully - remove key walls immediately when animation reaches ending tile
            get().removeKeyWalls();

            // Wait 500ms before starting emptying process
            setTimeout(() => {
              const currentState = get();
              if (currentState.flowState) {
                const allPaths = [
                  ...currentState.flowState.completedPaths,
                  finalPath,
                ];
                const currentLevel =
                  currentState.levels[currentState.currentLevel];
                const startTilePos = currentLevel.startTilePos;
                const startTileId = startTilePos
                  ? `grid_tile_${startTilePos.row}_${startTilePos.col}`
                  : "grid_tile_3_0";

                set({
                  flowState: {
                    ...currentState.flowState,
                    isActive: true,
                    currentPhase: "entry-to-center", // Reuse filling animation
                    isEmptying: true,
                    currentTile: startTileId, // Start from beginning
                    entryDirection: null,
                    exitDirection: "east",
                    progress: 0,
                    phaseStartTime: Date.now(),
                    phaseDuration: 400,
                    emptyingPaths: allPaths,
                    completedPaths: allPaths, // Keep completed paths initially, remove as emptying progresses
                  },
                });
              }
            }, 500);

            set({
              flowState: {
                ...state.flowState,
                isActive: false,
                isEmptying: true, // Set isEmptying immediately to prevent new flows during the 2-second delay
                completedPaths: [...state.flowState.completedPaths, finalPath],
              },
            });
          } else {
            // Move to next tile
            const nextTile = get().getNextTile(
              state.flowState.currentTile,
              state.flowState.exitDirection!,
            );
            if (nextTile) {
              const newEntryDirection = get().getOppositeDirection(
                state.flowState.exitDirection!,
              );
              const newExitDirection = get().calculateExitDirection(
                nextTile.id,
                newEntryDirection,
              );

              // Check if the next tile actually has a compatible direction
              const nextTileDirections = get().getTileDirections(nextTile.id);
              if (nextTileDirections.includes(newEntryDirection)) {
                // Add current tile to completed paths when exiting it
                const currentCompletedPath = {
                  tileId: state.flowState.currentTile,
                  entryDirection: state.flowState.entryDirection,
                  exitDirection: state.flowState.exitDirection,
                };

                // Lock the next tile immediately when flow enters it
                const newLockedTiles = state.flowState.lockedTiles.includes(
                  nextTile.id,
                )
                  ? state.flowState.lockedTiles
                  : [...state.flowState.lockedTiles, nextTile.id];

                set({
                  flowState: {
                    ...state.flowState,
                    currentTile: nextTile.id,
                    currentPhase: "entry-to-center",
                    entryDirection: newEntryDirection,
                    exitDirection: newExitDirection,
                    progress: 0,
                    phaseStartTime: currentTime,
                    lockedTiles: newLockedTiles,
                    completedPaths: [
                      ...state.flowState.completedPaths,
                      currentCompletedPath,
                    ],
                  },
                });
              } else {
                // Flow blocked - incompatible connection
                // Add current tile to completed paths before blocking
                const completedPath = {
                  tileId: state.flowState.currentTile,
                  entryDirection: state.flowState.entryDirection,
                  exitDirection: state.flowState.exitDirection,
                };

                // Show blocked indicator on the tile we couldn't reach
                const blockedPosition = nextTile
                  ? {
                      x: nextTile.x + nextTile.width / 2,
                      y: nextTile.y + nextTile.height / 2,
                    }
                  : undefined;

                // Spawn spitter snake at blocked position
                if (blockedPosition) {
                  get().spawnSpitterSnake(blockedPosition);
                }

                // Wait 500ms before starting emptying process for blocked flow
                setTimeout(() => {
                  const currentState = get();
                  if (currentState.flowState) {
                    const allPaths = [
                      ...currentState.flowState.completedPaths,
                      completedPath,
                    ];
                    const currentLevel =
                      currentState.levels[currentState.currentLevel];
                    const startTilePos = currentLevel.startTilePos;
                    const startTileId = startTilePos
                      ? `grid_tile_${startTilePos.row}_${startTilePos.col}`
                      : "grid_tile_3_0";

                    set({
                      flowState: {
                        ...currentState.flowState,
                        isActive: true,
                        currentPhase: "entry-to-center", // Reuse filling animation
                        isEmptying: true,
                        currentTile: startTileId, // Start from beginning
                        entryDirection: null,
                        exitDirection: "east",
                        progress: 0,
                        phaseStartTime: Date.now(),
                        phaseDuration: 400,
                        emptyingPaths: allPaths,
                        completedPaths: allPaths, // Keep completed paths initially, remove as emptying progresses
                        // Preserve blocked state during emptying
                        isBlocked: currentState.flowState.isBlocked,
                        lastPosition: currentState.flowState.lastPosition,
                      },
                    });
                  }
                }, 500);

                set({
                  flowState: {
                    ...state.flowState,
                    isActive: false,
                    isEmptying: true, // Set isEmptying immediately to prevent new flows during the 2-second delay
                    lastPosition: blockedPosition,
                    isBlocked: true,
                    completedPaths: [
                      ...state.flowState.completedPaths,
                      completedPath,
                    ],
                  },
                });
              }
            } else {
              // Flow ended unexpectedly - no tile found (edge of grid)
              // Add current tile to completed paths before ending
              const completedPath = {
                tileId: state.flowState.currentTile,
                entryDirection: state.flowState.entryDirection,
                exitDirection: state.flowState.exitDirection,
              };

              // Calculate where the blocked tile would be based on exit direction
              const currentTileObj = state.patternTiles.find(
                (tile) => tile.id === state.flowState.currentTile,
              );
              let blockedPosition;

              if (currentTileObj && state.flowState.exitDirection) {
                const tileSize = 60; // Based on Level 4 tile size
                let offsetX = 0,
                  offsetY = 0;

                switch (state.flowState.exitDirection) {
                  case "north":
                    offsetY = -tileSize;
                    break;
                  case "south":
                    offsetY = tileSize;
                    break;
                  case "east":
                    offsetX = tileSize;
                    break;
                  case "west":
                    offsetX = -tileSize;
                    break;
                }

                blockedPosition = {
                  x: currentTileObj.x + currentTileObj.width / 2 + offsetX,
                  y: currentTileObj.y + currentTileObj.height / 2 + offsetY,
                };
              }

              // Spawn spitter snake at blocked position for edge-blocked flow
              if (blockedPosition) {
                get().spawnSpitterSnake(blockedPosition);
              }

              // Wait 500ms before starting emptying process for edge-blocked flow
              setTimeout(() => {
                const currentState = get();
                if (currentState.flowState) {
                  const allPaths = [
                    ...currentState.flowState.completedPaths,
                    completedPath,
                  ];
                  const currentLevel =
                    currentState.levels[currentState.currentLevel];
                  const startTilePos = currentLevel.startTilePos;
                  const startTileId = startTilePos
                    ? `grid_tile_${startTilePos.row}_${startTilePos.col}`
                    : "grid_tile_3_0";

                  set({
                    flowState: {
                      ...currentState.flowState,
                      isActive: true,
                      currentPhase: "entry-to-center", // Reuse filling animation
                      isEmptying: true,
                      currentTile: startTileId, // Start from beginning
                      entryDirection: null,
                      exitDirection: "east",
                      progress: 0,
                      phaseStartTime: Date.now(),
                      phaseDuration: 400,
                      emptyingPaths: allPaths,
                      completedPaths: allPaths, // Keep completed paths initially, remove as emptying progresses
                      // Preserve blocked state during emptying
                      isBlocked: currentState.flowState.isBlocked,
                      lastPosition: currentState.flowState.lastPosition,
                    },
                  });
                }
              }, 500);

              set({
                flowState: {
                  ...state.flowState,
                  isActive: false,
                  isEmptying: true, // Set isEmptying immediately to prevent new flows during the 2-second delay
                  lastPosition: blockedPosition,
                  isBlocked: true,
                  completedPaths: [
                    ...state.flowState.completedPaths,
                    completedPath,
                  ],
                },
              });
            }
          }
        }
      }
    },

    getNextTile: (
      currentTileId: string,
      exitDirection: "north" | "south" | "east" | "west",
    ) => {
      const state = get();
      const match = currentTileId.match(/grid_tile_(\d+)_(\d+)/);
      if (!match) {
        return null;
      }

      const row = parseInt(match[1]);
      const col = parseInt(match[2]);

      let nextRow = row;
      let nextCol = col;

      switch (exitDirection) {
        case "north":
          nextRow--;
          break;
        case "south":
          nextRow++;
          break;
        case "east":
          nextCol++;
          break;
        case "west":
          nextCol--;
          break;
      }

      // Check bounds
      if (nextRow < 0 || nextRow >= 8 || nextCol < 0 || nextCol >= 8) {
        return null;
      }

      const nextTileId = `grid_tile_${nextRow}_${nextCol}`;
      const nextTile =
        state.patternTiles.find((tile) => tile.id === nextTileId) || null;

      return nextTile;
    },

    getOppositeDirection: (direction: "north" | "south" | "east" | "west") => {
      const opposites = {
        north: "south" as const,
        south: "north" as const,
        east: "west" as const,
        west: "east" as const,
      };
      return opposites[direction];
    },

    calculateExitDirection: (
      tileId: string,
      entryDirection: "north" | "south" | "east" | "west",
    ) => {
      // For now, simple logic - if tile has opposite direction, flow to opposite
      // Otherwise, flow to first available direction that's not the entry
      const availableDirections = get().getTileDirections(tileId);
      const opposite = get().getOppositeDirection(entryDirection);

      if (availableDirections.includes(opposite)) {
        return opposite;
      }

      // Find first available direction that's not the entry
      return availableDirections.find((dir) => dir !== entryDirection) || null;
    },

    getTileDirections: (tileId: string) => {
      const state = get();
      // Extract tile position and determine available directions based on game logic
      const match = tileId.match(/grid_tile_(\d+)_(\d+)/);
      if (!match) return [];

      const row = parseInt(match[1]);
      const col = parseInt(match[2]);

      // Get the current level to access start and end positions
      const currentLevel = state.levels[state.currentLevel];
      const startTilePos = currentLevel.startTilePos;
      const endTilePos = currentLevel.endTilePos;

      // Starting square (random row, column 0) only has east
      if (
        startTilePos &&
        row === startTilePos.row &&
        col === startTilePos.col
      ) {
        return ["east" as const];
      }

      // Ending square (random row, column 7) only has west
      if (endTilePos && row === endTilePos.row && col === endTilePos.col) {
        return ["west" as const];
      }

      // For other squares, show exactly 2 directions
      const seed = row * 8 + col;

      let directions: Array<"north" | "south" | "east" | "west"> = [
        "north",
        "south",
        "east",
        "west",
      ];

      // Shuffle directions deterministically
      for (let i = directions.length - 1; i > 0; i--) {
        const j = Math.floor((((seed * (i + 13)) % 100) / 100) * (i + 1));
        [directions[i], directions[j]] = [directions[j], directions[i]];
      }

      // Take exactly 2 directions
      directions = directions.slice(0, 2);

      // Apply tile rotation
      const tile = state.patternTiles.find((t) => t.id === tileId);
      if (tile && tile.rotation) {
        const rotationSteps = tile.rotation / 90;
        const rotatedDirections = directions.map((dir) => {
          const directionOrder = ["north", "east", "south", "west"] as const;
          const currentIndex = directionOrder.indexOf(dir);
          const newIndex = (currentIndex + rotationSteps + 4) % 4;
          return directionOrder[newIndex];
        });
        return rotatedDirections;
      }

      return directions;
    },

    rotateTile: (direction: "left" | "right") => {
      const state = get();
      if (state.currentLevel !== 3) return; // Only on level 4 (0-indexed)

      // Find the tile the player is standing on
      const playerRect = {
        x: state.player.position.x,
        y: state.player.position.y,
        width: state.player.size.width,
        height: state.player.size.height,
      };

      const currentTile = state.patternTiles.find((tile) => {
        return (
          playerRect.x < tile.x + tile.width &&
          playerRect.x + playerRect.width > tile.x &&
          playerRect.y < tile.y + tile.height &&
          playerRect.y + playerRect.height > tile.y
        );
      });

      if (!currentTile) return; // Player not on a tile

      // Don't rotate starting and ending tiles
      const currentLevel = state.levels[state.currentLevel];
      const startTilePos = currentLevel.startTilePos;
      const endTilePos = currentLevel.endTilePos;
      const startTileId = startTilePos
        ? `grid_tile_${startTilePos.row}_${startTilePos.col}`
        : "grid_tile_3_0";
      const endTileId = endTilePos
        ? `grid_tile_${endTilePos.row}_${endTilePos.col}`
        : "grid_tile_6_7";

      if (currentTile.id === startTileId || currentTile.id === endTileId) {
        return;
      }

      // Check if this tile is locked (flow has entered it)
      if (
        state.flowState &&
        state.flowState.lockedTiles.includes(currentTile.id)
      ) {
        return; // Tile is locked, cannot rotate
      }

      // Calculate new rotation
      const rotationChange = direction === "left" ? -90 : 90;
      const newRotation =
        ((currentTile.rotation || 0) + rotationChange + 360) % 360;

      // Update tile rotation
      set({
        patternTiles: state.patternTiles.map((tile) =>
          tile.id === currentTile.id
            ? { ...tile, rotation: newRotation }
            : tile,
        ),
      });
    },

    checkPathConnection: () => {
      const state = get();
      if (state.currentLevel !== 3) return false; // Only on level 4 (0-indexed)

      // Get dynamic start and end tile positions
      const currentLevel = state.levels[state.currentLevel];
      const startTilePos = currentLevel.startTilePos;
      const endTilePos = currentLevel.endTilePos;
      const startTileId = startTilePos
        ? `grid_tile_${startTilePos.row}_${startTilePos.col}`
        : "grid_tile_3_0";
      const endTileId = endTilePos
        ? `grid_tile_${endTilePos.row}_${endTilePos.col}`
        : "grid_tile_6_7";

      // Path connection check started

      // Always start flow visualization to show the attempted path
      get().startFlow();

      const visited = new Set<string>();
      const queue = [
        {
          tileId: startTileId,
          entryDirection: null as null | "north" | "south" | "east" | "west",
        },
      ];

      while (queue.length > 0) {
        const { tileId, entryDirection } = queue.shift()!;

        if (visited.has(tileId)) continue;
        visited.add(tileId);

        // Check if we reached the end
        if (tileId === endTileId) {
          return true;
        }

        // Get available directions for this tile
        const directions = state.getTileDirections(tileId);

        // For each direction, try to move to the next tile
        for (const direction of directions) {
          // Skip if this is the entry direction (can't go back)
          if (entryDirection && direction === entryDirection) {
            continue;
          }

          // Get the next tile in this direction
          const nextTile = state.getNextTile(tileId, direction);
          if (!nextTile) {
            continue;
          }

          // Check if the next tile has a compatible direction
          const nextTileDirections = state.getTileDirections(nextTile.id);
          const requiredDirection = state.getOppositeDirection(direction);

          if (nextTileDirections.includes(requiredDirection)) {
            queue.push({
              tileId: nextTile.id,
              entryDirection: requiredDirection,
            });
          }
        }
      }

      return false;
    },

    removeKeyWalls: () => {
      const state = get();
      if (state.currentLevel !== 3) return; // Only on level 4 (0-indexed)

      // Remove the key chamber walls
      const keyWallIds = [
        { x: 720, y: 0, width: 80, height: 20 }, // top wall
        { x: 720, y: 60, width: 80, height: 20 }, // bottom wall
        { x: 720, y: 0, width: 20, height: 80 }, // left wall
        { x: 780, y: 0, width: 20, height: 80 }, // right wall
      ];

      set({
        walls: state.walls.filter(
          (wall) =>
            !keyWallIds.some(
              (keyWall) =>
                wall.x === keyWall.x &&
                wall.y === keyWall.y &&
                wall.width === keyWall.width &&
                wall.height === keyWall.height,
            ),
        ),
      });

      // Key chamber walls removed - path connected from start to end
    },

    // Projectile system functions
    updateProjectiles: (deltaTime: number, currentPlayer?: any) => {
      const state = get();
      const player = currentPlayer || state.player; // Use provided player state or fall back to state
      const currentTime = Date.now();
      let hitCount = 0;
      let playerHitThisFrame = false; // Track if player was hit this frame
      let collisionDetected = false; // Track if any collision was detected

      // Update projectile positions and remove expired ones
      const updatedProjectiles = state.projectiles.filter((projectile) => {
        const age = currentTime - projectile.createdAt;
        if (age > projectile.lifespan) {
          return false; // Remove expired projectile
        }

        // Update position
        projectile.position.x += projectile.velocity.x * deltaTime;
        projectile.position.y += projectile.velocity.y * deltaTime;

        // Check collision with player
        const projectileRect = { ...projectile.position, ...projectile.size };
        const playerRect = { ...player.position, ...player.size };
        const collision = checkAABBCollision(projectileRect, playerRect);

        // Player is invincible either from before this frame or from a hit earlier in this frame
        const isInvincible = player.isInvincible || playerHitThisFrame;

        if (!isInvincible && collision) {
          // Player hit by projectile - first hit this frame
          collisionDetected = true;
          hitCount = 1; // Only one hit per frame allowed
          playerHitThisFrame = true; // Prevent additional hits this frame

          // Don't check for player death here - let the main game loop handle it

          return false; // Remove projectile
        }

        // Check collision with walls
        for (const wall of state.walls) {
          if (
            checkAABBCollision(
              { ...projectile.position, ...projectile.size },
              wall,
            )
          ) {
            return false; // Remove projectile on wall collision
          }
        }

        return true; // Keep projectile
      });

      // Check which spitter snakes need to fire
      const snakesToFire: string[] = [];
      const updatedSnakes = state.snakes.map((snake) => {
        if (
          snake.type === "spitter" &&
          snake.lastFireTime &&
          snake.fireInterval
        ) {
          const timeSinceLastFire = currentTime - snake.lastFireTime;

          if (timeSinceLastFire >= snake.fireInterval) {
            snakesToFire.push(snake.id);
            return {
              ...snake,
              lastFireTime: currentTime,
              shotCount: (snake.shotCount || 0) + 1, // Increment shot count
            };
          }
        }
        return snake;
      });

      // Fire projectiles for snakes that need it
      let newProjectilesToAdd: any[] = [];
      snakesToFire.forEach((snakeId) => {
        const snake = updatedSnakes.find((s) => s.id === snakeId);
        if (snake && snake.type === "spitter") {
          const projectileSpeed = 0.6; // pixels per ms
          const projectileSize = { width: 6, height: 6 };
          const lifespan = 5000; // 5 seconds

          // Check if we're on Level 4 for alternating pattern
          const isLevel4 = state.currentLevel === 3; // Level 4 is 0-indexed as 3
          let directions: { x: number; y: number }[];

          if (isLevel4) {
            const isOddShot = (snake.shotCount || 1) % 2 === 1; // shotCount starts at 1 after increment

            if (isOddShot) {
              // Odd shots: cardinal directions (N, S, E, W)
              directions = [
                { x: 0, y: -1 }, // North
                { x: 1, y: 0 }, // East
                { x: 0, y: 1 }, // South
                { x: -1, y: 0 }, // West
              ];
            } else {
              // Even shots: diagonal directions (NE, NW, SE, SW)
              directions = [
                { x: 1, y: -1 }, // Northeast
                { x: -1, y: -1 }, // Northwest
                { x: 1, y: 1 }, // Southeast
                { x: -1, y: 1 }, // Southwest
              ];
            }
          } else {
            // Default behavior for other levels: all 8 directions
            directions = [
              { x: 0, y: -1 }, // North
              { x: 1, y: -1 }, // Northeast
              { x: 1, y: 0 }, // East
              { x: 1, y: 1 }, // Southeast
              { x: 0, y: 1 }, // South
              { x: -1, y: 1 }, // Southwest
              { x: -1, y: 0 }, // West
              { x: -1, y: -1 }, // Northwest
            ];
          }

          const newProjectiles = directions.map((dir, index) => ({
            id: `${snakeId}_projectile_${Date.now()}_${index}`,
            position: {
              x:
                snake.position.x +
                snake.size.width / 2 -
                projectileSize.width / 2,
              y:
                snake.position.y +
                snake.size.height / 2 -
                projectileSize.height / 2,
            },
            velocity: {
              x: dir.x * projectileSpeed,
              y: dir.y * projectileSpeed,
            },
            size: projectileSize,
            createdAt: Date.now(),
            lifespan,
            color: "#00ff41", // Neon green
          }));

          newProjectilesToAdd = [...newProjectilesToAdd, ...newProjectiles];
        }
      });

      // Combine existing projectiles with new ones
      const allProjectiles = [...updatedProjectiles, ...newProjectilesToAdd];

      set({
        projectiles: allProjectiles,
        snakes: updatedSnakes,
      });

      return { hitCount };
    },

    // Environmental effects for boss boulder collisions
    spawnMiniBoulders: (centerPosition: Position, levelSize: Size): MiniBoulder[] => {
      const miniBoulders: MiniBoulder[] = [];
      const currentTime = Date.now();
      
      // Spawn 10 mini boulders at random locations on the map
      for (let i = 0; i < 10; i++) {
        const randomX = Math.random() * (levelSize.width - 20); // 20x20 size
        const randomY = Math.random() * (levelSize.height - 20);
        
        miniBoulders.push({
          id: `mini_boulder_${currentTime}_${i}`,
          position: {
            x: randomX,
            y: randomY // Spawn directly on the map
          },
          size: { width: 20, height: 20 },
          velocity: {
            x: 0, // No movement
            y: 0
          },
          gravity: 0, // No gravity needed
          isLanded: true, // Already "landed"
          spawnTime: currentTime
        });
      }
      
      return miniBoulders;
    },

    spawnScreensaverSnake: (centerPosition: Position, levelSize: Size): Snake => {
      const currentTime = Date.now();
      
      // Use the provided center position directly (Valerie's position)
      const spawnX = centerPosition.x;
      const spawnY = centerPosition.y;
      
      // Give it a random cardinal direction to start moving
      const cardinalDirections = [
        { x: 0, y: -1 },   // North
        { x: 1, y: -1 },   // Northeast  
        { x: 1, y: 0 },    // East
        { x: 1, y: 1 },    // Southeast
        { x: 0, y: 1 },    // South
        { x: -1, y: 1 },   // Southwest
        { x: -1, y: 0 },   // West
        { x: -1, y: -1 }   // Northwest
      ];
      const randomIndex = Math.floor(Math.random() * cardinalDirections.length);
      const initialDirection = cardinalDirections[randomIndex];

      return {
        id: `screensaver_snake_${currentTime}`,
        type: 'screensaver',
        position: {
          x: spawnX,
          y: spawnY
        },
        size: { width: 40, height: 40 },
        speed: 125 + Math.random() * 125, // Random speed between 125 and 250
        direction: { x: initialDirection.x, y: initialDirection.y },
        patrolPoints: [],
        currentPatrolIndex: 0,
        patrolDirection: 1,
        chaseSpeed: 0, // Screensaver snakes don't chase
        sightRange: 0,
        isChasing: false
      };
    },

    spawnPhotophobicSnake: (centerPosition: Position, levelSize: Size): Snake => {
      const currentTime = Date.now();
      const state = get();
      
      // Spawn at Valerie's center position
      const spawnX = Math.max(16, Math.min(centerPosition.x - 16, levelSize.width - 32));
      const spawnY = Math.max(16, Math.min(centerPosition.y - 16, levelSize.height - 32));
      
      // Determine initial lighting state based on current level
      let isDark = false;
      
      if (state.currentLevel === 4) {
        // Level 5 (0-indexed as 4) - Use switch-based quadrant lighting
        const isInTopLeft = spawnX < 390 && spawnY < 290;
        const isInTopRight = spawnX > 410 && spawnY < 290;
        const isInBottomLeft = spawnX < 390 && spawnY > 310;
        const isInBottomRight = spawnX > 410 && spawnY > 310;
        
        const switches = state.switches || [];
        const A = switches.find((s) => s.id === "light_switch")?.isPressed || false;
        const B = switches.find((s) => s.id === "switch_1")?.isPressed || false;
        const C = switches.find((s) => s.id === "switch_2")?.isPressed || false;
        const D = switches.find((s) => s.id === "switch_3")?.isPressed || false;
        const E = switches.find((s) => s.id === "switch_4")?.isPressed || false;
        const F = switches.find((s) => s.id === "switch_5")?.isPressed || false;
        
        const topLeftLit = (A && !B) || (!A && B); // A XOR B
        const topRightLit = C && D; // C AND D
        const bottomLeftLit = !(E && F); // NOT (E AND F)
        const bottomRightLit = topLeftLit && topRightLit; // (A XOR B) AND (C AND D)
        
        if (isInTopLeft) {
          isDark = !topLeftLit;
        } else if (isInTopRight) {
          isDark = !topRightLit;
        } else if (isInBottomLeft) {
          isDark = !bottomLeftLit;
        } else if (isInBottomRight) {
          isDark = !bottomRightLit;
        }
      } else if (state.currentLevel === 5) {
        // Level 6 (0-indexed as 5) - Use boulder-based full-map lighting
        const destroyedBoulders = state.boulders?.filter(boulder => boulder.isDestroyed) || [];
        isDark = destroyedBoulders.length >= 1; // Dark after first boulder destroyed
      }
      
      // Give it a random initial direction
      const directions = [
        { x: 0, y: -1 },   // North
        { x: 1, y: 0 },    // East
        { x: 0, y: 1 },    // South
        { x: -1, y: 0 },   // West
      ];
      const randomIndex = Math.floor(Math.random() * directions.length);
      const initialDirection = directions[randomIndex];

      // Create basic patrol points around spawn area
      const patrolRadius = 100;
      const patrolPoints = [
        { x: spawnX - patrolRadius, y: spawnY - patrolRadius },
        { x: spawnX + patrolRadius, y: spawnY - patrolRadius },
        { x: spawnX + patrolRadius, y: spawnY + patrolRadius },
        { x: spawnX - patrolRadius, y: spawnY + patrolRadius },
      ].map(point => ({
        x: Math.max(16, Math.min(point.x, levelSize.width - 16)),
        y: Math.max(16, Math.min(point.y, levelSize.height - 16))
      }));

      return {
        id: `photophobic_snake_${currentTime}`,
        type: 'photophobic',
        position: {
          x: spawnX,
          y: spawnY
        },
        size: { width: 32, height: 32 },
        speed: 80, // Slower when patrolling normally
        direction: { x: initialDirection.x, y: initialDirection.y },
        patrolPoints,
        currentPatrolIndex: 0,
        patrolDirection: 1,
        chaseSpeed: 250, // Very fast when berserk
        sightRange: 150, // Good sight range when berserk
        hearingRange: 200, // Can hear player when in darkness
        isChasing: false,
        isInDarkness: isDark, // Set based on actual lighting conditions
        isBerserk: !isDark, // If not dark, start in berserk mode
        isPaused: false,
        isCharging: false,
      };
    },

    updateMiniBoulders: (deltaTime: number) => {
      const state = get();
      
      const updatedMiniBoulders = state.miniBoulders
        .filter((boulder) => {
          // Remove mini boulders that are older than 30 seconds
          const age = Date.now() - boulder.spawnTime;
          return age < 30000;
        });
      
      set({ miniBoulders: updatedMiniBoulders });
    },

    spawnSpitterSnake: (position: Position) => {
      const state = get();
      const spitterId = `spitter_${Date.now()}`;

      const spitterSnake: Snake = {
        id: spitterId,
        type: "spitter",
        position: { x: position.x - 12.5, y: position.y - 12.5 }, // Center the 25x25 snake
        size: { width: 25, height: 25 },
        speed: 50, // Moving snake
        direction: { x: 0, y: 0 }, // Will be set by movement logic
        patrolPoints: [],
        currentPatrolIndex: 0,
        patrolDirection: 1,
        chaseSpeed: 0,
        sightRange: 0,
        isChasing: false,
        lastFireTime: Date.now(),
        fireInterval: 3000, // 3 seconds
        movementAxis: undefined, // Will be randomly assigned on first update
        shotCount: 0, // Start at 0 shots
      };

      set({
        snakes: [...state.snakes, spitterSnake],
      });
    },

    fireProjectiles: (snakeId: string) => {
      const state = get();
      const snake = state.snakes.find((s) => s.id === snakeId);
      if (!snake || snake.type !== "spitter") return;

      const projectileSpeed = 0.3; // pixels per ms - increased from 0.15
      const projectileSize = { width: 6, height: 6 };
      const lifespan = 5000; // 5 seconds

      // Check if we're on Level 4 for alternating pattern
      const isLevel4 = state.currentLevel === 3; // Level 4 is 0-indexed as 3
      let directions: { x: number; y: number }[];

      if (isLevel4) {
        // Increment shot count for this manual fire
        const newShotCount = (snake.shotCount || 0) + 1;
        const isOddShot = newShotCount % 2 === 1;

        if (isOddShot) {
          // Odd shots: cardinal directions (N, S, E, W)
          directions = [
            { x: 0, y: -1 }, // North
            { x: 1, y: 0 }, // East
            { x: 0, y: 1 }, // South
            { x: -1, y: 0 }, // West
          ];
        } else {
          // Even shots: diagonal directions (NE, NW, SE, SW)
          directions = [
            { x: 1, y: -1 }, // Northeast
            { x: -1, y: -1 }, // Northwest
            { x: 1, y: 1 }, // Southeast
            { x: -1, y: 1 }, // Southwest
          ];
        }

        // Update the snake's shot count
        set({
          snakes: state.snakes.map((s) =>
            s.id === snakeId ? { ...s, shotCount: newShotCount } : s,
          ),
        });
      } else {
        // Default behavior for other levels: all 8 directions
        directions = [
          { x: 0, y: -1 }, // North
          { x: 1, y: -1 }, // Northeast
          { x: 1, y: 0 }, // East
          { x: 1, y: 1 }, // Southeast
          { x: 0, y: 1 }, // South
          { x: -1, y: 1 }, // Southwest
          { x: -1, y: 0 }, // West
          { x: -1, y: -1 }, // Northwest
        ];
      }

      const newProjectiles = directions.map((dir, index) => ({
        id: `${snakeId}_projectile_${Date.now()}_${index}`,
        position: {
          x: snake.position.x + snake.size.width / 2 - projectileSize.width / 2,
          y:
            snake.position.y +
            snake.size.height / 2 -
            projectileSize.height / 2,
        },
        velocity: {
          x: dir.x * projectileSpeed,
          y: dir.y * projectileSpeed,
        },
        size: projectileSize,
        createdAt: Date.now(),
        lifespan,
        color: "#00ff41", // Neon green
      }));

      set({
        projectiles: [...state.projectiles, ...newProjectiles],
      });
    },

    collectPuzzleShard: (shardId: string) => {
      const state = get();
      const shard = state.puzzleShards.find((s) => s.id === shardId);

      if (!shard || shard.collected || shard.phase !== state.currentPhase)
        return;

      const updatedShards = state.puzzleShards.map((s) =>
        s.id === shardId ? { ...s, collected: true } : s,
      );

      const collectedCount = updatedShards.filter((s) => s.collected).length;
      let updatedPedestal = state.puzzlePedestal;

      if (updatedPedestal) {
        updatedPedestal = {
          ...updatedPedestal,
          collectedShards: collectedCount,
          isActivated: collectedCount >= updatedPedestal.requiredShards,
        };

        // If pedestal is activated, open the door
        if (updatedPedestal.isActivated) {
          set({
            puzzleShards: updatedShards,
            puzzlePedestal: updatedPedestal,
            door: { ...state.door, isOpen: true },
          });
        } else {
          set({
            puzzleShards: updatedShards,
            puzzlePedestal: updatedPedestal,
          });
        }
      } else {
        set({ puzzleShards: updatedShards });
      }
    },

    getCurrentWalls: () => {
      const state = get();
      let walls = [...state.walls];

      // Level 5 (currentLevel === 4): Add phase-specific walls
      if (state.currentLevel === 4) {
        const activePhaseWalls = state.phaseWalls
          .filter((wall) => wall.activePhases.includes(state.currentPhase))
          .map((wall) => ({
            x: wall.x,
            y: wall.y,
            width: wall.width,
            height: wall.height,
          }));
        walls = [...walls, ...activePhaseWalls];
      }

      // Level 6 (currentLevel === 5): Add non-destroyed boulders as walls
      if (state.currentLevel === 5 && state.boulders.length > 0) {
        const boulderWalls = state.boulders
          .filter((boulder) => !boulder.isDestroyed)
          .map((boulder) => ({
            x: boulder.x,
            y: boulder.y,
            width: boulder.width,
            height: boulder.height,
          }));
        walls = [...walls, ...boulderWalls];
      }

      return walls;
    },

    checkTeleporterCollision: () => {
      const state = get();
      if (state.teleporters.length === 0) return null;

      const playerRect = {
        x: state.player.position.x,
        y: state.player.position.y,
        width: state.player.size.width,
        height: state.player.size.height,
      };

      const currentTime = Date.now();
      let updatedTeleporters = [...state.teleporters];
      let teleportInfo = null;

      state.teleporters.forEach((teleporter, index) => {
        if (teleporter.type === "sender") {
          const isPlayerOnPad = checkAABBCollision(playerRect, teleporter);

          // Check if teleporter is in cooldown period
          const isInCooldown =
            teleporter.lastTeleportTime &&
            currentTime < teleporter.lastTeleportTime;

          if (isPlayerOnPad && !isInCooldown) {
            // Player is on the pad
            if (!teleporter.isActive) {
              // Start activation
              updatedTeleporters[index] = {
                ...teleporter,
                isActive: true,
                activationStartTime: currentTime,
              };
            } else {
              // Check if enough time has passed (1 second)
              const timeOnPad =
                currentTime - (teleporter.activationStartTime || currentTime);
              if (timeOnPad >= 1000) {
                // Ready to teleport - find the linked receiver
                const receiver = state.teleporters.find(
                  (t) =>
                    t.type === "receiver" &&
                    t.id === teleporter.linkedTeleporterId,
                );
                if (receiver) {
                  const teleportCooldownTime = currentTime + 500; // 500ms cooldown
                  teleportInfo = {
                    targetPosition: { x: receiver.x, y: receiver.y },
                    teleporters: updatedTeleporters.map((t, idx) =>
                      idx === index
                        ? {
                            ...t,
                            isActive: false,
                            activationStartTime: undefined,
                            lastTeleportTime: teleportCooldownTime,
                          }
                        : t,
                    ),
                  };
                }
              }
            }
          } else if (!isInCooldown) {
            // Player left the pad - cancel activation (but not during cooldown)
            if (teleporter.isActive) {
              updatedTeleporters[index] = {
                ...teleporter,
                isActive: false,
                activationStartTime: undefined,
              };
            }
          }
        }
      });

      // Update teleporters state only if not teleporting
      if (!teleportInfo) {
        set({ teleporters: updatedTeleporters });
      }

      return teleportInfo;
    },

    activateTeleporter: (teleporterId: string) => {
      // This method is now handled by checkTeleporterCollision
      // Keeping for compatibility but functionality moved to checkTeleporterCollision
    },

    updateSnakePits: (deltaTime: number) => {
      const state = get();
      const currentTime = Date.now();

      // Only process snake pits if they exist
      if (!state.snakePits || state.snakePits.length === 0) {
        return;
      }

      // Snake pit processing for Level 3

      // Check for light beam intersection with pits (Level 3 only) - improved line-circle intersection
      const lightBeamHitsPit = (pit: any) => {
        if (
          state.currentLevel !== 2 ||
          !state.lightBeam ||
          !state.lightBeam.segments ||
          state.lightBeam.segments.length < 2
        ) {
          return false;
        }

        // Check each line segment of the light beam for intersection with the circular pit
        for (let i = 0; i < state.lightBeam.segments.length - 1; i++) {
          const start = state.lightBeam.segments[i];
          const end = state.lightBeam.segments[i + 1];

          // Use point-to-line-segment distance calculation for more accurate results
          const distance = distanceFromPointToLineSegment(pit, start, end);

          if (distance <= pit.radius) {
            return true;
          }
        }
        return false;
      };

      // Optimized helper function to calculate distance from point to line segment
      const distanceFromPointToLineSegment = (
        point: any,
        lineStart: any,
        lineEnd: any,
      ) => {
        const A = point.x - lineStart.x;
        const B = point.y - lineStart.y;
        const C = lineEnd.x - lineStart.x;
        const D = lineEnd.y - lineStart.y;

        const lenSq = C * C + D * D;
        if (lenSq === 0) {
          // Line segment is a point, return distance to point
          return Math.sqrt(A * A + B * B);
        }

        const param = Math.max(0, Math.min(1, (A * C + B * D) / lenSq));
        const projX = lineStart.x + param * C;
        const projY = lineStart.y + param * D;

        const dx = point.x - projX;
        const dy = point.y - projY;
        return Math.sqrt(dx * dx + dy * dy);
      };

      let updatedSnakes = [...state.snakes];
      let updatedSnakePits = [...state.snakePits];

      // Only check light beam intersections when light beam changes or on initial check
      // This prevents expensive calculations from running every frame
      const lightBeamHash =
        state.lightBeam &&
        state.lightBeam.segments &&
        state.lightBeam.segments.length > 0
          ? `${state.lightBeam.segments.length}-${Math.round(state.lightBeam.segments[0]?.x || 0)}-${Math.round(state.lightBeam.segments[0]?.y || 0)}-${Math.round(state.lightBeam.segments[state.lightBeam.segments.length - 1]?.x || 0)}-${Math.round(state.lightBeam.segments[state.lightBeam.segments.length - 1]?.y || 0)}`
          : "no-beam";

      const shouldCheckLightBeam = state.lastLightBeamHash !== lightBeamHash;

      if (shouldCheckLightBeam) {
        // Light beam hash changed
      }

      if (shouldCheckLightBeam) {
        // Update the hash to prevent recalculation until light beam changes
        set({ lastLightBeamHash: lightBeamHash });

        // Check for light beam hitting pits and trigger light emergence (only when beam changes)
        updatedSnakePits.forEach((pit, pitIndex) => {
          // Check light beam intersection only when beam actually changes
          const isCurrentlyHitByLight = lightBeamHitsPit(pit);
          const wasHitByLight = pit.isLightHit || false;

          // Always update the visual state first
          updatedSnakePits[pitIndex] = {
            ...pit,
            isLightHit: isCurrentlyHitByLight,
          };

          // Light just started hitting the pit (trigger emergence)
          if (isCurrentlyHitByLight && !wasHitByLight) {
            // Find all snakes in this pit that can emerge
            const snakesInPit = updatedSnakes.filter(
              (snake) =>
                pit.snakeIds &&
                pit.snakeIds.includes(snake.id) &&
                snake.type === "rattlesnake" &&
                snake.isInPit === true,
            );

            if (snakesInPit.length > 0) {
              // Emerge all snakes in different cardinal directions
              const cardinalDirections = ["north", "south", "east", "west"];

              snakesInPit.forEach((snake, index) => {
                const direction =
                  cardinalDirections[index % cardinalDirections.length];
                const snakeIndex = updatedSnakes.findIndex(
                  (s) => s.id === snake.id,
                );

                if (snakeIndex !== -1) {
                  // Calculate position based on direction
                  let emergenceX = pit.x - 14;
                  let emergenceY = pit.y - 14;

                  switch (direction) {
                    case "north":
                      emergenceY -= 30;
                      break;
                    case "south":
                      emergenceY += 30;
                      break;
                    case "east":
                      emergenceX += 30;
                      break;
                    case "west":
                      emergenceX -= 30;
                      break;
                  }

                  // Snake emerging from light trigger
                  updatedSnakes[snakeIndex] = {
                    ...snake,
                    isInPit: false,
                    emergenceTime: currentTime,
                    rattlesnakeState: "patrolling" as const,
                    isLightEmergence: true,
                    lightEmergenceDirection: direction as
                      | "north"
                      | "south"
                      | "east"
                      | "west",
                    patrolStartTime: currentTime,
                    isChasing: false,
                    position: { x: emergenceX, y: emergenceY },
                  };
                }
              });

              // Update pit to track light emergence
              updatedSnakePits[pitIndex] = {
                ...updatedSnakePits[pitIndex],
                lightEmergenceTime: currentTime,
                isLightEmergence: true,
              };
            }
          }
          // Light stopped hitting the pit
          else if (!isCurrentlyHitByLight && wasHitByLight) {
            updatedSnakePits[pitIndex] = {
              ...updatedSnakePits[pitIndex],
              isLightEmergence: false,
            };
          }
        });
      }

      // Process each snake pit
      updatedSnakePits.forEach((pit, pitIndex) => {
        const timeSinceLastEmergence = currentTime - pit.lastEmergenceTime;

        // Allow immediate emergence on first run (when lastEmergenceTime is 0)
        // Otherwise wait for emergence interval (5 seconds default) plus 4 seconds pit wait time
        const totalWaitTime = pit.emergenceInterval + 4000; // Add 4 second wait time in pit
        const shouldEmerge =
          pit.lastEmergenceTime === 0 ||
          timeSinceLastEmergence >= totalWaitTime;

        // Check if it's time for a new rattlesnake to emerge
        if (shouldEmerge) {
          // Find the next rattlesnake to emerge (currently in pit)
          const rattlesnakeToEmerge = updatedSnakes.find(
            (snake) =>
              pit.snakeIds.includes(snake.id) &&
              snake.type === "rattlesnake" &&
              snake.isInPit === true,
          );

          if (rattlesnakeToEmerge) {
            // Snake emerging from regular cycle
            // Emerge the rattlesnake
            const snakeIndex = updatedSnakes.findIndex(
              (s) => s.id === rattlesnakeToEmerge.id,
            );
            if (snakeIndex !== -1) {
              const emergedSnake = {
                ...rattlesnakeToEmerge,
                isInPit: false,
                emergenceTime: currentTime,
                rattlesnakeState: "patrolling" as const,
                isChasing: false, // Start patrolling, not chasing
                patrolStartTime: currentTime,
                // Set initial patrol position
                position: { x: pit.x - 14, y: pit.y - 14 }, // Center snake on pit
              };
              updatedSnakes[snakeIndex] = emergedSnake;
              // Snake emerged successfully

              // Update pit's last emergence time
              updatedSnakePits[pitIndex] = {
                ...pit,
                lastEmergenceTime: currentTime,
              };
            }
          }
        }
      });

      // Process rattlesnake behavior state machine
      updatedSnakes.forEach((snake, snakeIndex) => {
        if (
          snake.type === "rattlesnake" &&
          !snake.isInPit &&
          snake.emergenceTime
        ) {
          const timeOutOfPit = currentTime - snake.emergenceTime;
          const currentState = snake.rattlesnakeState || "patrolling";

          switch (currentState) {
            case "patrolling":
              // Different behavior for light emergence vs normal emergence
              if (snake.isLightEmergence) {
                // Check if pit is currently lit
                const pitForLightPatrol = state.snakePits.find(
                  (p) => p.id === snake.pitId,
                );
                const isPitLitForLightPatrol =
                  pitForLightPatrol && pitForLightPatrol.isLightHit;

                if (isPitLitForLightPatrol) {
                  // Pit is still lit, continue patrolling indefinitely
                  // Don't check time, just keep patrolling
                } else {
                  // Pit is no longer lit, patrol for 2 more seconds then decide
                  if (
                    snake.patrolStartTime &&
                    currentTime - snake.patrolStartTime >= 2000
                  ) {
                    // Check if currently chasing player
                    if (snake.isChasing) {
                      // Player detected during light emergence, switch to chasing state for 4 seconds
                      updatedSnakes[snakeIndex] = {
                        ...snake,
                        rattlesnakeState: "chasing",
                        patrolStartTime: currentTime, // Reset timer for chase phase
                        isLightEmergence: false, // Clear light emergence flag since now chasing
                      };
                    } else {
                      // No player detected, return to pit after 2 seconds
                      updatedSnakes[snakeIndex] = {
                        ...snake,
                        rattlesnakeState: "pausing",
                        pauseStartTime: currentTime,
                        isChasing: false,
                      };
                    }
                  }
                }
              } else {
                // Normal emergence: patrol for 4 seconds - let normal AI handle movement/detection
                // But also check if pit is lit to prevent return
                const pitForNormalPatrol = state.snakePits.find(
                  (p) => p.id === snake.pitId,
                );
                const isPitLitForNormalPatrol =
                  pitForNormalPatrol && pitForNormalPatrol.isLightHit;

                if (isPitLitForNormalPatrol) {
                  // Pit is lit, continue patrolling indefinitely regardless of time
                  // Don't check time, just keep patrolling
                } else {
                  // Pit is not lit, follow normal timing
                  if (
                    snake.patrolStartTime &&
                    currentTime - snake.patrolStartTime >= 4000
                  ) {
                    // If currently chasing player, switch to chasing state for another 4 seconds
                    if (snake.isChasing) {
                      // Player detected, entering chase phase
                      updatedSnakes[snakeIndex] = {
                        ...snake,
                        rattlesnakeState: "chasing",
                        patrolStartTime: currentTime, // Reset timer for chase phase
                      };
                    } else {
                      // No player detected, go straight to pause
                      updatedSnakes[snakeIndex] = {
                        ...snake,
                        rattlesnakeState: "pausing",
                        pauseStartTime: currentTime,
                        isChasing: false,
                      };
                    }
                  }
                }
              }
              break;

            case "chasing":
              // Check if pit is currently lit
              const pit = state.snakePits.find((p) => p.id === snake.pitId);
              const isPitLit = pit && pit.isLightHit;

              if (isPitLit) {
                // Pit is lit, continue chasing indefinitely until pit is no longer lit
                // No time limit while pit is lit
              } else {
                // Pit is not lit, chase for 4 seconds then return
                if (
                  snake.patrolStartTime &&
                  currentTime - snake.patrolStartTime >= 4000
                ) {
                  // Chase phase complete
                  updatedSnakes[snakeIndex] = {
                    ...snake,
                    rattlesnakeState: "pausing",
                    pauseStartTime: currentTime,
                    isChasing: false, // Stop chasing during pause
                  };
                } else if (!snake.patrolStartTime) {
                  // Just started chasing after pit stopped being lit, set timer
                  updatedSnakes[snakeIndex] = {
                    ...snake,
                    patrolStartTime: currentTime,
                  };
                }
              }
              break;

            case "pausing":
              // Pause for 200ms
              if (
                snake.pauseStartTime &&
                currentTime - snake.pauseStartTime >= 200
              ) {
                // Check if pit is currently lit - if so, don't return yet
                const pit = state.snakePits.find((p) => p.id === snake.pitId);
                const isPitLit = pit && pit.isLightHit;

                if (isPitLit) {
                  // Pit is lit, continue patrolling for 2 more seconds
                  updatedSnakes[snakeIndex] = {
                    ...snake,
                    rattlesnakeState: "patrolling",
                    patrolStartTime: currentTime,
                    isChasing: false,
                  };
                } else {
                  // Pit is not lit, return to pit
                  const pitPos = pit
                    ? { x: pit.x - 14, y: pit.y - 14 }
                    : snake.position;
                  updatedSnakes[snakeIndex] = {
                    ...snake,
                    rattlesnakeState: "returningToPit",
                    pitPosition: pitPos,
                    isChasing: false,
                  };
                }
              }
              break;

            case "returningToPit":
              // First check if pit is now lit - if so, interrupt return and emerge again
              const pitForReturn = state.snakePits.find(
                (p) => p.id === snake.pitId,
              );
              const isPitLitForReturn = pitForReturn && pitForReturn.isLightHit;

              if (isPitLitForReturn) {
                // Pit is now lit while returning, interrupt return and start patrolling again
                updatedSnakes[snakeIndex] = {
                  ...snake,
                  rattlesnakeState: "patrolling",
                  patrolStartTime: currentTime,
                  isLightEmergence: true, // Mark as light emergence
                  pitPosition: undefined, // Clear pit position
                  isChasing: false,
                };
              } else {
                // Move toward pit position
                if (snake.pitPosition) {
                  const dx = snake.pitPosition.x - snake.position.x;
                  const dy = snake.pitPosition.y - snake.position.y;
                  const distance = Math.sqrt(dx * dx + dy * dy);

                  if (distance <= 10) {
                    // Reached pit - go back in and update pit's last emergence time for waiting period
                    // Snake returned to pit

                    // Update the pit's lastEmergenceTime to current time for the waiting period
                    const pitIndex = updatedSnakePits.findIndex(
                      (p) => p.id === snake.pitId,
                    );
                    if (pitIndex !== -1) {
                      updatedSnakePits[pitIndex] = {
                        ...updatedSnakePits[pitIndex],
                        lastEmergenceTime: currentTime,
                      };
                    }

                    updatedSnakes[snakeIndex] = {
                      ...snake,
                      isInPit: true,
                      rattlesnakeState: "inPit",
                      emergenceTime: undefined,
                      pauseStartTime: undefined,
                      pitPosition: undefined,
                      patrolStartTime: undefined,
                      isChasing: false,
                      isLightEmergence: undefined, // Clear light emergence flag
                      lightEmergenceDirection: undefined, // Clear direction
                      position: snake.pitPosition,
                    };
                  } else {
                    // Move toward pit with controlled speed - use fixed speed per frame
                    const returnSpeedPerFrame = 1; // Fixed 1 pixel per frame for very smooth, visible movement
                    const moveDistance = Math.min(
                      returnSpeedPerFrame,
                      distance,
                    ); // Don't move further than remaining distance
                    const normalizedDx = dx / distance;
                    const normalizedDy = dy / distance;

                    // Moving back to pit smoothly

                    updatedSnakes[snakeIndex] = {
                      ...snake,
                      position: {
                        x: snake.position.x + normalizedDx * moveDistance,
                        y: snake.position.y + normalizedDy * moveDistance,
                      },
                    };
                  }
                }
              }
              break;
          }
        }
      });

      // Update state with modified snakes and pits
      set({
        snakes: updatedSnakes,
        snakePits: updatedSnakePits,
      });
    },

    evaluateLogicPuzzle: (switches: any[]) => {
      // Get switch states: ((A XOR B) AND (C AND D)) AND (NOT (E AND F))
      const A =
        switches.find((s) => s.id === "light_switch")?.isPressed || false;
      const B = switches.find((s) => s.id === "switch_1")?.isPressed || false;
      const C = switches.find((s) => s.id === "switch_2")?.isPressed || false;
      const D = switches.find((s) => s.id === "switch_3")?.isPressed || false;
      const E = switches.find((s) => s.id === "switch_4")?.isPressed || false;
      const F = switches.find((s) => s.id === "switch_5")?.isPressed || false;

      // Logic evaluation: ((A XOR B) AND (C AND D)) AND (NOT (E AND F))
      const aXorB = (A && !B) || (!A && B); // XOR operation
      const cAndD = C && D; // AND operation
      const eAndF = E && F; // AND operation
      const notEAndF = !eAndF; // NOT operation

      const firstPart = aXorB && cAndD; // (A XOR B) AND (C AND D)
      const result = firstPart && notEAndF; // Final result

      // Update key walls based on puzzle state
      const state = get();
      const currentWalls = state.walls;

      // Define key wall positions for identification (updated to match levels.ts)
      const keyWallPositions = [
        { x: 710, y: 0, width: 60, height: 20 }, // Top wall
        { x: 710, y: 70, width: 80, height: 20 }, // Bottom wall
        { x: 710, y: 20, width: 20, height: 70 }, // Left wall
        { x: 780, y: 20, width: 20, height: 70 }, // Right wall
      ];

      const isKeyWall = (wall: any) => {
        return keyWallPositions.some(
          (keyWall) =>
            wall.x === keyWall.x &&
            wall.y === keyWall.y &&
            wall.width === keyWall.width &&
            wall.height === keyWall.height,
        );
      };

      let updatedWalls;
      if (result) {
        // Puzzle solved - remove key walls
        updatedWalls = currentWalls.filter((wall) => !isKeyWall(wall));
      } else {
        // Puzzle not solved - ensure key walls are present
        const hasKeyWalls = currentWalls.some((wall) => isKeyWall(wall));
        if (!hasKeyWalls) {
          // Re-add key walls from original level definition
          updatedWalls = [...currentWalls, ...keyWallPositions];
        } else {
          updatedWalls = currentWalls;
        }
      }

      set({ walls: updatedWalls });
      return result;
    },

    toggleLightSwitch: () => {
      const state = get();
      const playerRect = {
        x: state.player.position.x,
        y: state.player.position.y,
        width: state.player.size.width,
        height: state.player.size.height,
      };

      // Find any lever switch that the player is touching
      const nearbyLeverSwitch = state.switches.find(
        (s) => s.switchType === "lever" && checkAABBCollision(playerRect, s),
      );

      if (!nearbyLeverSwitch) return;

      // Toggle the switch
      const updatedSwitches = state.switches.map((s) =>
        s.id === nearbyLeverSwitch.id ? { ...s, isPressed: !s.isPressed } : s,
      );

      // Console log for switch toggles
      const switchNames = {
        light_switch: "A (Light Switch)",
        switch_1: "B (Switch 1)",
        switch_2: "C (Switch 2)",
        switch_3: "D (Switch 3)",
        switch_4: "E (Switch 4)",
        switch_5: "F (Switch 5)",
      };
      const newState = !nearbyLeverSwitch.isPressed;

      // Only toggle the light source if it's the main light switch
      let updatedLightSource = state.lightSource;
      if (nearbyLeverSwitch.id === "light_switch") {
        updatedLightSource = state.lightSource
          ? {
              ...state.lightSource,
              isOn: !state.lightSource.isOn,
            }
          : null;
      }

      // Evaluate logic puzzle and update key walls for Level 5
      if (state.currentLevel === 4) {
        // Level 5 (0-indexed as 4)
        get().evaluateLogicPuzzle(updatedSwitches);
      }

      set({
        switches: updatedSwitches,
        lightSource: updatedLightSource,
      });
    },

    showHint: () => {
      // No longer needed - help text is always displayed on Level 1
      return;
    },

    updateHint: (deltaTime: number) => {
      // No longer needed - help text is always displayed on Level 1
      return;
    },
  })),
);
