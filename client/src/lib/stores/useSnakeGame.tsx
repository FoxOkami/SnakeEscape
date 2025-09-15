import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { useKeyBindings } from './useKeyBindings';
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

// Inventory item interface
export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  image: string;
  duration: 'permanent' | 'temporary';
  modifiers: {
    playerSpeed?: number; // multiplier for player speed
    walkSpeed?: number; // multiplier for walk speed
    dashSpeed?: number; // multiplier for dash speed
    dashDuration?: number; // multiplier for dash duration
    dashCooldown?: number; // multiplier for dash cooldown time
    biteProtection?: number; // additional bites player can take before dying
    snakeChaseMultiplier?: number; // multiplier for snake chase values (affects all non-boss snakes)
    snakeSightMultiplier?: number; // multiplier for snake sight detection radius
    snakeHearingMultiplier?: number; // multiplier for snake hearing detection radius
    [key: string]: any; // allow for future modifiers
  };
  isActive?: boolean; // for temporary items
  activatedAt?: number; // timestamp when activated
  expiresAt?: number; // timestamp when expires (for temporary items)
}
import { LEVELS, randomizeLevel2, getLevelKeyByIndex, getLevelIndexByKey } from "../game/levels";
import { checkAABBCollision, slideAlongWall } from "../game/collision";
import { updateSnake } from "../game/entities";
import { updateBossSnake } from "../game/bossSnake";
import { calculateLightBeam } from "../game/lightBeam";
import { useAudio } from "./useAudio";
import { 
  PlayerController, 
  createGamePlayerController, 
  keysToInputState,
  type InputState,
  type CustomKeyBindings 
} from "../game/PlayerController";

interface SnakeGameState extends GameData {
  // Levels data
  levels: any[];

  // Pre-randomized Level 2 data (set when starting game)
  level2RandomizedSwitches?: Switch[];
  level2RandomizedThrowableItems?: any[];

  // Debug frame tracking
  frameNumber: number;

  // Performance optimization
  lastLightCheckTime?: number;
  lastLightBeamHash?: string;

  // Actions
  startGame: () => void;
  startFromLevel: (levelIndex: number) => void;
  startLevel: (levelIndex: number) => void;
  startLevelByName: (levelKey: string) => void;
  resetGame: () => void;
  returnToHub: () => void;
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
  isDashing: boolean;
  dashState: {
    isActive: boolean;
    startTime: number;
    startPosition: { x: number; y: number };
    direction: { x: number; y: number };
    progress: number;
    isInvulnerable: boolean;
    lastDashTime: number;
    cooldownDuration: number;
  };
  
  // Unified Player Controller
  playerController: PlayerController | null;
  updatePlayerController: (deltaTime: number, inputState: InputState) => void;
  configurePlayerController: () => void;

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
  fireProjectiles: (snakeId: string, sequentialIndex?: number, clockwise?: boolean, startingAngle?: number, burstRound?: number, roundAngleShift?: number) => void;

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

  // Switch actions
  toggleLightSwitch: () => void;

  // Inventory system
  showInventory: boolean;
  inventoryItems: InventoryItem[];
  openInventory: () => void;
  closeInventory: () => void;
  addInventoryItem: (item: InventoryItem) => void;
  removeInventoryItem: (itemId: string) => void;
  useInventoryItem: (itemId: string) => void;
  togglePermanentItem: (itemId: string) => void;
  clearTemporaryItems: () => void;

  // Hub reset system
  resetForHub: () => void;

  // Level 1 randomization
  randomizedSymbols?: string[] | null;

  // Phantom removal control
  phantomRemovalInProgress?: boolean;
}

const BASE_PLAYER_SPEED = 150; // base pixels per second
const BASE_WALKING_SPEED = 75; // base pixels per second when walking (shift held)
const ACCELERATION = 1; // pixels per second squared

// Centralized function to calculate speed multipliers from inventory items
export function getSpeedMultipliers(inventoryItems: InventoryItem[]) {
  let playerSpeedMultiplier = 1;
  let walkSpeedMultiplier = 1;
  let dashSpeedMultiplier = 1;
  let dashDurationMultiplier = 1;
  let dashCooldownMultiplier = 1;
  
  // Apply modifiers from active items
  inventoryItems.forEach(item => {
    if (item.isActive) {
      if (item.modifiers.playerSpeed) {
        playerSpeedMultiplier *= item.modifiers.playerSpeed;
      }
      if (item.modifiers.walkSpeed) {
        walkSpeedMultiplier *= item.modifiers.walkSpeed;
      }
      if (item.modifiers.dashSpeed) {
        dashSpeedMultiplier *= item.modifiers.dashSpeed;
      }
      if (item.modifiers.dashDuration) {
        dashDurationMultiplier *= item.modifiers.dashDuration;
      }
      if (item.modifiers.dashCooldown) {
        dashCooldownMultiplier *= item.modifiers.dashCooldown;
      }
    }
  });
  
  return {
    playerSpeedMultiplier,
    walkSpeedMultiplier,
    dashSpeedMultiplier,
    dashDurationMultiplier,
    dashCooldownMultiplier
  };
}

export function getSnakeDetectionMultipliers(inventoryItems: InventoryItem[]) {
  let snakeSightMultiplier = 1;
  let snakeHearingMultiplier = 1;
  
  // Apply modifiers from active items
  inventoryItems.forEach(item => {
    if (item.isActive) {
      if (item.modifiers.snakeSightMultiplier) {
        snakeSightMultiplier *= item.modifiers.snakeSightMultiplier;
      }
      if (item.modifiers.snakeHearingMultiplier) {
        snakeHearingMultiplier *= item.modifiers.snakeHearingMultiplier;
      }
    }
  });
  
  return {
    snakeSightMultiplier,
    snakeHearingMultiplier
  };
}

// Helper function to calculate current player speeds with item modifiers (for game levels)
function getPlayerSpeeds(inventoryItems: InventoryItem[]) {
  const multipliers = getSpeedMultipliers(inventoryItems);
  return {
    playerSpeed: BASE_PLAYER_SPEED * multipliers.playerSpeedMultiplier,
    walkingSpeed: BASE_WALKING_SPEED * multipliers.walkSpeedMultiplier,
    dashSpeed: 600 * multipliers.dashSpeedMultiplier, // Base dash speed of 600
    dashDuration: 200 * multipliers.dashDurationMultiplier, // Base dash duration of 200ms
    dashCooldown: 1000 * multipliers.dashCooldownMultiplier // Base dash cooldown of 1000ms
  };
}

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
    currentLevelKey: "hub",
    gameState: "hub",
    levels: LEVELS, // Add levels to store
    player: {
      position: { x: 50, y: 350 },
      size: { width: 32, height: 32 },
      speed: BASE_PLAYER_SPEED,
      hasKey: false,
      health: 9,
      maxHealth: 9,
      shieldHealth: 0,
      maxShieldHealth: 0,
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
    frameNumber: 0,

    puzzleShards: [],
    puzzlePedestal: null,
    phaseWalls: [],
    hintState: null,
    keysPressed: new Set(),
    currentVelocity: { x: 0, y: 0 },
    targetVelocity: { x: 0, y: 0 },
    isWalking: false,
    isDashing: false,
    dashState: {
      isActive: false,
      startTime: 0,
      startPosition: { x: 0, y: 0 },
      direction: { x: 0, y: 0 },
      progress: 0,
      isInvulnerable: false,
      lastDashTime: 0,
      cooldownDuration: 1500, // 1.5 seconds in milliseconds
    },
    keyStates: new Map(), // Track key state with timestamps
    showInventory: false,
    inventoryItems: [], // Inventory starts empty - items can be obtained through cheat codes
    randomizedSymbols: null, // Level 1 randomization
    
    // Unified Player Controller
    playerController: null,

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

        // Get current key bindings
        const keyBindings = useKeyBindings.getState().keyBindings;
        
        // Check if dashing using custom key binding
        const isDashing = isKeyActiveRecently(keyBindings.dash);
        
        // Check if walking using custom key binding, but clear walking if dashing
        const isWalkingKeyPressed =
          isKeyActiveRecently(keyBindings.walking) ||
          isKeyActiveRecently("ControlRight"); // Keep ControlRight as backup
        const isWalking = isWalkingKeyPressed && !isDashing; // Clear walking when dashing
        
        // Get dynamic speeds based on inventory items
        const currentState = get();
        const speeds = getPlayerSpeeds(currentState.inventoryItems);
        const moveSpeed = isWalking ? speeds.walkingSpeed : speeds.playerSpeed;

        // Calculate target velocity with enhanced key detection using custom key bindings
        const targetVelocity = { x: 0, y: 0 };

        if (isKeyActiveRecently(keyBindings.up)) {
          targetVelocity.y -= moveSpeed;
        }
        if (isKeyActiveRecently(keyBindings.down)) {
          targetVelocity.y += moveSpeed;
        }
        if (isKeyActiveRecently(keyBindings.left)) {
          targetVelocity.x -= moveSpeed;
        }
        if (isKeyActiveRecently(keyBindings.right)) {
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
          isDashing: isDashing,
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
        currentLevelKey: "hub",
        gameState: "playing",
        player: {
          position: { ...level.player },
          size: { width: 32, height: 32 },
          speed: BASE_PLAYER_SPEED,
          hasKey: false,
          health: 9,
          maxHealth: 9,
          shieldHealth: 0,
          maxShieldHealth: 0,
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
    isDashing: false,
    dashState: {
      isActive: false,
      startTime: 0,
      startPosition: { x: 0, y: 0 },
      direction: { x: 0, y: 0 },
      progress: 0,
      isInvulnerable: false,
      lastDashTime: 0,
      cooldownDuration: 1500, // 1.5 seconds in milliseconds
    },
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
          currentState.currentLevelKey === "pattern_memory" &&
          currentState.gameState === "playing"
        ) {
          currentState.showHint();
        }
      }, 3000); // 3 second delay before hint appears
    },

    startFromLevel: (levelIndex: number) => {
      console.log(`*** startFromLevel called for level ${levelIndex} - this will wipe rattlesnake properties ***`);
      if (levelIndex < 0 || levelIndex >= LEVELS.length) {
        return; // Invalid level index
      }

      // Create a deep copy of the level to prevent mutations
      const level = JSON.parse(JSON.stringify(LEVELS[levelIndex]));

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

      if (levelIndex === 1) {
        // Level 1 (index 1) gets Level 1 randomization
        const randomization = randomizeLevel1();
        patternSequence = randomization.newPatternSequence;
        randomizedSymbols = randomization.randomizedSymbols;
        newPatternTiles = randomization.newPatternTiles;
      } else if (levelIndex === 2) {
        // Level 2 (index 2) gets Level 2 randomization
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

      // Calculate shield health from all active items (both permanent and temporary)
      const currentState = get();
      let totalBiteProtection = 0;
      currentState.inventoryItems.forEach(item => {
        if (item.isActive && item.modifiers.biteProtection) {
          totalBiteProtection += item.modifiers.biteProtection;
        }
      });

      // Preserve current shield health, but cap it at the new maximum
      const preservedShieldHealth = Math.min(currentState.player.shieldHealth, totalBiteProtection);

      set({
        currentLevel: levelIndex,
        currentLevelKey: getLevelKeyByIndex(levelIndex),
        gameState: "playing",
        player: {
          position: { ...level.player },
          size: { width: 32, height: 32 },
          speed: BASE_PLAYER_SPEED,
          hasKey: false,
          health: 9,
          maxHealth: 9,
          shieldHealth: preservedShieldHealth,
          maxShieldHealth: totalBiteProtection,
          isInvincible: false,
          invincibilityEndTime: 0,
        },
        snakes: level.snakes.map((snake) => ({ ...snake })),
        walls: level.walls,
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
    isDashing: false,
    dashState: {
      isActive: false,
      startTime: 0,
      startPosition: { x: 0, y: 0 },
      direction: { x: 0, y: 0 },
      progress: 0,
      isInvulnerable: false,
      lastDashTime: 0,
      cooldownDuration: 1500, // 1.5 seconds in milliseconds
    },
        boulders: level.boulders
          ? level.boulders.map((boulder) => ({ ...boulder }))
          : [],
        hintState: null, // Initialize hint state
        miniBoulders: [],
        randomizedSymbols, // Store randomized symbols for Level 1
        // Clear pre-stored Level 2 data when directly selecting Level 2
        level2RandomizedSwitches:
          levelIndex === 2 ? undefined : get().level2RandomizedSwitches,
        level2RandomizedThrowableItems:
          levelIndex === 2 ? undefined : get().level2RandomizedThrowableItems,
        
        // Reset PlayerController to ensure it doesn't have old position
        playerController: null,
      });
      
      // Force reconfigure PlayerController with new spawn position
      get().configurePlayerController();

      // Auto-trigger hint for Level 1 only
      if (levelIndex === 1) {
        setTimeout(() => {
          const currentState = get();
          if (
            currentState.currentLevelKey === "pattern_memory" &&
            currentState.gameState === "playing"
          ) {
            currentState.showHint();
          }
        }, 3000); // 3 second delay before hint appears
      }
    },

    resetGame: () => {
      console.log("*** resetGame called - this will wipe rattlesnake properties ***");
      const state = get();
      const level = LEVELS[state.currentLevel];
      
      // Calculate shield health from all active items (both permanent and temporary)
      let totalBiteProtection = 0;
      state.inventoryItems.forEach(item => {
        if (item.isActive && item.modifiers.biteProtection) {
          totalBiteProtection += item.modifiers.biteProtection;
        }
      });
      
      set({
        gameState: "playing",
        player: {
          position: { ...level.player },
          size: { width: 32, height: 32 },
          speed: BASE_PLAYER_SPEED,
          hasKey: false,
          health: 9,
          maxHealth: 9,
          shieldHealth: totalBiteProtection,
          maxShieldHealth: totalBiteProtection,
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
    isDashing: false,
    dashState: {
      isActive: false,
      startTime: 0,
      startPosition: { x: 0, y: 0 },
      direction: { x: 0, y: 0 },
      progress: 0,
      isInvulnerable: false,
      lastDashTime: 0,
      cooldownDuration: 1500, // 1.5 seconds in milliseconds
    },
      });
    },

    nextLevel: () => {
      console.log("*** nextLevel called - this will wipe rattlesnake properties ***");
      const state = get();
      const nextLevelIndex = state.currentLevel + 1;

      if (nextLevelIndex >= LEVELS.length) {
        // All levels completed, return to hub
        get().resetForHub();
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

      if (nextLevelIndex === 2) {
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

      // Calculate shield health from all active items (both permanent and temporary)
      let totalBiteProtection = 0;
      state.inventoryItems.forEach(item => {
        if (item.isActive && item.modifiers.biteProtection) {
          totalBiteProtection += item.modifiers.biteProtection;
        }
      });

      // Preserve current shield health, but cap it at the new maximum
      const preservedShieldHealth = Math.min(state.player.shieldHealth, totalBiteProtection);

      set({
        currentLevel: nextLevelIndex,
        currentLevelKey: getLevelKeyByIndex(nextLevelIndex),
        gameState: "playing",
        player: {
          position: { ...level.player },
          size: { width: 32, height: 32 },
          speed: BASE_PLAYER_SPEED,
          hasKey: false,
          health: state.player.health, // Preserve current health
          maxHealth: 9,
          shieldHealth: preservedShieldHealth, // Preserve current shield health
          maxShieldHealth: totalBiteProtection,
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
    isDashing: false,
    dashState: {
      isActive: false,
      startTime: 0,
      startPosition: { x: 0, y: 0 },
      direction: { x: 0, y: 0 },
      progress: 0,
      isInvulnerable: false,
      lastDashTime: 0,
      cooldownDuration: 1500, // 1.5 seconds in milliseconds
    },
        
        // Reset PlayerController to ensure it doesn't have old position
        playerController: null,
      });
      
      // Force reconfigure PlayerController with new spawn position
      get().configurePlayerController();
    },

    returnToMenu: () => {
      get().resetForHub();
    },

    openInventory: () => {
      set({ showInventory: true });
    },

    closeInventory: () => {
      set({ showInventory: false });
    },

    addInventoryItem: (item: InventoryItem) => {
      set((state) => ({
        inventoryItems: [...state.inventoryItems, item]
      }));
    },

    removeInventoryItem: (itemId: string) => {
      set((state) => ({
        inventoryItems: state.inventoryItems.filter(item => item.id !== itemId)
      }));
    },

    useInventoryItem: (itemId: string) => {
      set((state) => {
        const item = state.inventoryItems.find(i => i.id === itemId);
        if (!item) return state;
        
        
        // Mark item as active (both temporary and permanent)
        const updatedItem = {
          ...item,
          isActive: true,
          activatedAt: Date.now()
        };
        
        // Calculate new shield health from all active items (both permanent and temporary)
        const updatedInventory = state.inventoryItems.map(i => i.id === itemId ? updatedItem : i);
        let totalBiteProtection = 0;
        updatedInventory.forEach(inventoryItem => {
          if (inventoryItem.isActive && inventoryItem.modifiers.biteProtection) {
            totalBiteProtection += inventoryItem.modifiers.biteProtection;
          }
        });

        // Update player shield health
        const updatedPlayer = {
          ...state.player,
          maxShieldHealth: totalBiteProtection,
          shieldHealth: totalBiteProtection
        };
        
        return {
          inventoryItems: updatedInventory,
          player: updatedPlayer
        };
      });
    },

    togglePermanentItem: (itemId: string) => {
      set((state) => {
        const item = state.inventoryItems.find(i => i.id === itemId);
        if (!item || item.duration !== 'permanent') return state;
        
        // Toggle the active state
        const updatedItem = {
          ...item,
          isActive: !item.isActive,
          activatedAt: item.isActive ? undefined : Date.now()
        };
        
        // Update inventory
        const updatedInventory = state.inventoryItems.map(i => i.id === itemId ? updatedItem : i);
        
        // Recalculate shield health from all active items (both permanent and temporary)
        let totalBiteProtection = 0;
        updatedInventory.forEach(inventoryItem => {
          if (inventoryItem.isActive && inventoryItem.modifiers.biteProtection) {
            totalBiteProtection += inventoryItem.modifiers.biteProtection;
          }
        });

        // Update player shield health
        const updatedPlayer = {
          ...state.player,
          maxShieldHealth: totalBiteProtection,
          shieldHealth: totalBiteProtection
        };
        
        return {
          inventoryItems: updatedInventory,
          player: updatedPlayer
        };
      });
    },

    // Clear temporary items but keep permanent items active (called when returning to hub - end of run)
    clearTemporaryItems: () => {
      set((state) => ({
        inventoryItems: state.inventoryItems
          .filter(item => item.duration === 'permanent') // Keep only permanent items
          // Temporary items are removed when returning to hub
      }));
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
      if (state.gameState !== "playing" || state.showInventory) return;

      const currentTime = Date.now();
      
      // Increment frame counter for debugging
      set((state) => ({ frameNumber: state.frameNumber + 1 }));

      // Initialize unified PlayerController if needed
      if (!state.playerController) {
        get().configurePlayerController();
      }

      // Convert current input state for PlayerController
      const keyBindings = useKeyBindings.getState().keyBindings;
      const inputState: InputState = {
        up: state.keysPressed.has(keyBindings.up),
        down: state.keysPressed.has(keyBindings.down),
        left: state.keysPressed.has(keyBindings.left),
        right: state.keysPressed.has(keyBindings.right),
        walking: state.isWalking,
        dash: state.isDashing
      };

      // Update player using unified controller
      get().updatePlayerController(deltaTime, inputState);

      // Get updated state after PlayerController update
      const updatedState = get();
      
      // --- SNAKE AI ---
      // Generate player sounds for stalker snakes when not walking stealthily
      const playerSounds: Position[] = [];
      const isMoving = updatedState.currentVelocity.x !== 0 || updatedState.currentVelocity.y !== 0;
      if (
        isMoving &&
        !updatedState.isWalking &&
        updatedState.player.position &&
        typeof updatedState.player.position.x === "number" &&
        typeof updatedState.player.position.y === "number"
      ) {
        // Player makes sound when moving normally (not walking stealthily)
        playerSounds.push(updatedState.player.position);
      }

      const currentWalls = get().getCurrentWalls();

      // Calculate quadrant lighting for photophobic snakes (Level 5)
      let quadrantLighting = {};
      if (state.currentLevelKey === "light_switch") {
        // Level 5 (0-indexed as 5)
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
      
      // Rotation-based rattlesnake behavior: Only 1 snake per pit patrols at a time, with 1s delays
      let updatedSnakePits = [...state.snakePits];
      
      newSnakes.forEach((snake, index) => {
        if (snake.type === "rattlesnake" && snake.pitId) {
          const pitIndex = updatedSnakePits.findIndex((p) => p.id === snake.pitId);
          if (pitIndex === -1) return;
          
          const pit = updatedSnakePits[pitIndex];
          const pitPosition = { x: pit.x - 14, y: pit.y - 14 };
          
          // Initialize rattlesnake state if needed
          if (!snake.rattlesnakeState || !snake.patrolStartTime) {
            newSnakes[index] = {
              ...snake,
              rattlesnakeState: "inPit",
              patrolStartTime: currentTime,
              currentPatrolIndex: 0,
              patrolDirection: 1,
              position: pitPosition,
              isInPit: true,
            };
            return;
          }

          // Check if this snake is the one that should be patrolling for this pit
          const currentSnakeId = pit.snakeIds[pit.currentSnakeIndex];
          const isMyTurn = snake.id === currentSnakeId;
          const isPitLit = pit.isLightHit || false;
          
          // State machine for rattlesnake behavior
          switch (snake.rattlesnakeState) {
            case "inPit":
              // If pit is lit, all snakes should emerge and patrol continuously
              if (isPitLit) {
                newSnakes[index] = {
                  ...snake,
                  rattlesnakeState: "patrolling",
                  currentPatrolIndex: 0,
                  patrolDirection: 1,
                  isInPit: false,
                  isLightEmergence: true,
                };
              }
              // Normal one-at-a-time system when pit is not lit
              else if (isMyTurn && currentTime >= pit.nextEmergenceTime && !pit.isSnakePatrolling) {
                // Time to emerge and start patrolling
                newSnakes[index] = {
                  ...snake,
                  rattlesnakeState: "patrolling",
                  currentPatrolIndex: 0,
                  patrolDirection: 1,
                  isInPit: false,
                };
                // Mark this pit as having a snake patrolling
                updatedSnakePits[pitIndex] = {
                  ...pit,
                  isSnakePatrolling: true,
                };
              } else {
                // Stay in pit
                newSnakes[index] = {
                  ...snake,
                  position: pitPosition,
                  isInPit: true,
                };
              }
              break;

            case "patrolling":
              // Let entity system handle patrol movement, but check if completed
              if (snake.patrolPoints && snake.patrolPoints.length > 0) {
                // Check if reached final patrol point (completed full route)
                if (snake.currentPatrolIndex >= snake.patrolPoints.length - 1 && snake.patrolDirection === 1) {
                  // If pit is still lit, restart patrol instead of returning to pit
                  if (isPitLit) {
                    newSnakes[index] = {
                      ...snake,
                      currentPatrolIndex: 0, // Reset patrol to beginning
                      patrolDirection: 1,
                      isInPit: false,
                      isLightEmergence: true,
                    };
                  } else {
                    // Pit not lit, completed patrol, start returning to pit
                    // If this was a light emergence, increment the returning count
                    if (snake.isLightEmergence) {
                      updatedSnakePits[pitIndex] = {
                        ...pit,
                        lightEmergedSnakesReturning: (pit.lightEmergedSnakesReturning || 0) + 1,
                      };
                    }
                    newSnakes[index] = {
                      ...snake,
                      rattlesnakeState: "returningToPit",
                      isInPit: false,
                      isLightEmergence: snake.isLightEmergence, // Keep the flag to track this snake
                    };
                  }
                } else {
                  // Still patrolling
                  newSnakes[index] = {
                    ...snake,
                    isInPit: false,
                  };
                }
              } else {
                // No patrol points
                if (isPitLit) {
                  // Keep patrolling if pit is lit (even without points)
                  newSnakes[index] = {
                    ...snake,
                    isInPit: false,
                    isLightEmergence: true,
                  };
                } else {
                  // Return to pit if no points and not lit
                  // If this was a light emergence, increment the returning count
                  if (snake.isLightEmergence) {
                    updatedSnakePits[pitIndex] = {
                      ...pit,
                      lightEmergedSnakesReturning: (pit.lightEmergedSnakesReturning || 0) + 1,
                    };
                  }
                  newSnakes[index] = {
                    ...snake,
                    rattlesnakeState: "returningToPit",
                    isInPit: false,
                    isLightEmergence: snake.isLightEmergence, // Keep the flag to track this snake
                  };
                }
              }
              break;

            case "returningToPit":
              // If pit becomes lit while returning, immediately turn around and patrol
              if (isPitLit) {
                newSnakes[index] = {
                  ...snake,
                  rattlesnakeState: "patrolling",
                  currentPatrolIndex: 0,
                  patrolDirection: 1,
                  isInPit: false,
                  isLightEmergence: true,
                };
              } else {
                // Check if reached pit location
                const distanceToPit = Math.sqrt(
                  Math.pow(snake.position.x - pitPosition.x, 2) + 
                  Math.pow(snake.position.y - pitPosition.y, 2)
                );
                
                if (distanceToPit < 20) {
                  // Reached pit - handle differently for light emerged vs normal snakes
                  const wasLightEmergence = snake.isLightEmergence;
                  const lightReturningCount = pit.lightEmergedSnakesReturning || 0;
                  
                  if (wasLightEmergence) {
                    // This was a light-emerged snake returning
                    const newReturningCount = Math.max(0, lightReturningCount - 1);
                    
                    // Only restart normal rotation when the LAST light-emerged snake returns
                    if (newReturningCount === 0) {
                      // Last snake returning from light emergence - restart normal rotation
                      const nextSnakeIndex = (pit.currentSnakeIndex + 1) % pit.snakeIds.length;
                      updatedSnakePits[pitIndex] = {
                        ...pit,
                        currentSnakeIndex: nextSnakeIndex,
                        nextEmergenceTime: currentTime + pit.emergenceInterval,
                        lastEmergenceTime: currentTime,
                        isSnakePatrolling: false,
                        lightEmergedSnakesReturning: 0,
                      };
                    } else {
                      // Still have more light-emerged snakes returning
                      updatedSnakePits[pitIndex] = {
                        ...pit,
                        lightEmergedSnakesReturning: newReturningCount,
                      };
                    }
                  } else {
                    // Normal snake returning - advance rotation as usual
                    const nextSnakeIndex = (pit.currentSnakeIndex + 1) % pit.snakeIds.length;
                    updatedSnakePits[pitIndex] = {
                      ...pit,
                      currentSnakeIndex: nextSnakeIndex,
                      nextEmergenceTime: currentTime + pit.emergenceInterval,
                      lastEmergenceTime: currentTime,
                      isSnakePatrolling: false,
                    };
                  }
                  
                  newSnakes[index] = {
                    ...snake,
                    rattlesnakeState: "inPit",
                    patrolStartTime: currentTime,
                    position: pitPosition,
                    isInPit: true,
                    isLightEmergence: false,
                  };
                } else {
                  // Still returning to pit
                  newSnakes[index] = {
                    ...snake,
                    isInPit: false,
                  };
                }
              }
              break;
          }
        }
      });
      
      // Update snake pits in state
      set({ snakePits: updatedSnakePits });
      
      // Calculate snake chase multiplier from active permanent items
      let snakeChaseMultiplier = 1; // Default multiplier
      state.inventoryItems.forEach(item => {
        if (item.duration === 'permanent' && item.isActive && item.modifiers.snakeChaseMultiplier !== undefined) {
          snakeChaseMultiplier *= item.modifiers.snakeChaseMultiplier;
        }
      });
      
      // Handle boss snakes first to avoid TypeScript narrowing issues
      const bossSnakes = newSnakes.filter((snake): snake is Snake => snake.type === "boss");
      const nonBossSnakes = newSnakes.filter(snake => snake.type !== "boss");
      
      // Process boss snakes separately
      const updatedBossSnakes = bossSnakes.map((snake) => {
        // Debug: Log boss snakes in boss_valerie level
        if (updatedState.currentLevelKey === "boss_valerie") {
          console.log(`🐍 BOSS SNAKE DEBUG: id=${snake.id}, type=${snake.type}, position=(${snake.position.x}, ${snake.position.y}), totalHits=${snake.totalBoulderHits || 0}`);
        }
        
        // Call updateBossSnake directly with frame number for debugging
        const updatedSnake = updateBossSnake(
          snake,
          currentWalls,
          deltaTime / 1000, // Convert to seconds
          updatedState.player,
          currentTime,
          LEVELS[updatedState.currentLevel]?.size,
          updatedState.boulders,
          get().frameNumber // Pass current frame number
        );
          
          // Process environmental effects for boss snakes (same as other snakes)
          if (updatedSnake.environmentalEffects?.spawnScreensaverSnake) {
            console.log(`🐍 GAME LOOP: Processing spawnScreensaverSnake for snake ${updatedSnake.id}`);
            const screensaverSnake = get().spawnScreensaverSnake(updatedSnake.environmentalEffects.boulderHitPosition, updatedState.levelSize);
            console.log(`🐍 GAME LOOP: Created screensaver snake ${screensaverSnake.id} at position (${screensaverSnake.position.x}, ${screensaverSnake.position.y})`);
            newSnakes.push(screensaverSnake);
            console.log(`🐍 GAME LOOP: Added to newSnakes array, total newSnakes: ${newSnakes.length}`);
            // Clear the flag immediately after spawning
            updatedSnake.environmentalEffects.spawnScreensaverSnake = false;
          }
          
          if (updatedSnake.environmentalEffects?.spawnPhotophobicSnake) {
            const photophobicSnake = get().spawnPhotophobicSnake(updatedSnake.environmentalEffects.boulderHitPosition, updatedState.levelSize);
            newSnakes.push(photophobicSnake);
            // Clear the flag immediately after spawning
            updatedSnake.environmentalEffects.spawnPhotophobicSnake = false;
          }
          
          if (updatedSnake.environmentalEffects?.spawnPhantom) {
            console.log(`👻 GAME LOOP: Processing spawnPhantom for snake ${updatedSnake.id}`);
            // Only spawn phantom if one doesn't already exist with this ID
            const phantomExists = newSnakes.some(s => s.id === updatedSnake.environmentalEffects?.phantomId);
            if (!phantomExists) {
              const phantom = get().spawnPhantom(
                updatedSnake.environmentalEffects.phantomSpawnPosition!, 
                updatedSnake.environmentalEffects.phantomId!,
                updatedSnake.environmentalEffects.phantomLevelBounds
              );
              console.log(`👻 GAME LOOP: Created phantom snake ${phantom.id} at position (${phantom.position.x}, ${phantom.position.y})`);
              newSnakes.push(phantom);
              console.log(`👻 GAME LOOP: Added phantom to newSnakes array, total newSnakes: ${newSnakes.length}`);
            }
            // Clear phantom spawn flag after spawning but keep other environmental effects
            updatedSnake.environmentalEffects.spawnPhantom = false;
          }
          
          if (updatedSnake.environmentalEffects?.spawnRainSnake) {
            console.log(`🌧️ GAME LOOP: Processing spawnRainSnake for snake ${updatedSnake.id}`);
            // Only spawn rain snake if one doesn't already exist with this ID
            const rainSnakeExists = newSnakes.some(s => s.id === updatedSnake.environmentalEffects?.rainSnakeId);
            if (!rainSnakeExists) {
              const rainSnake = get().spawnRainSnake(
                updatedSnake.environmentalEffects.rainSnakeSpawnPosition!, 
                updatedSnake.environmentalEffects.rainSnakeId!,
                updatedSnake.environmentalEffects.rainMovementPattern,
                updatedSnake.environmentalEffects.rainAngle,
                updatedSnake.environmentalEffects.sineAmplitude,
                updatedSnake.environmentalEffects.sineFrequency
              );
              console.log(`🌧️ GAME LOOP: Created rain snake ${rainSnake.id} at position (${rainSnake.position.x}, ${rainSnake.position.y})`);
              newSnakes.push(rainSnake);
            }
            // Clear rain snake spawn flag after spawning
            updatedSnake.environmentalEffects.spawnRainSnake = false;
          }
          
          if (updatedSnake.environmentalEffects?.fireProjectiles && updatedSnake.environmentalEffects?.projectileSourceId) {
            console.log(`💥 GAME LOOP: Processing fireProjectiles for snake ${updatedSnake.id}`);
            // Fire projectiles for Phase 3 boss
            get().fireProjectiles(
              updatedSnake.environmentalEffects.projectileSourceId,
              updatedSnake.environmentalEffects.sequentialProjectileIndex,
              updatedSnake.environmentalEffects.projectileClockwise,
              updatedSnake.environmentalEffects.startingAngle,
              updatedSnake.environmentalEffects.burstRound,
              updatedSnake.environmentalEffects.roundAngleShift
            );
            // Clear projectile firing flag after firing
            updatedSnake.environmentalEffects.fireProjectiles = false;
            updatedSnake.environmentalEffects.projectileSourceId = undefined;
          }
          
          return updatedSnake;
      });
      
      // Process non-boss snakes separately  
      const updatedNonBossSnakes = nonBossSnakes.map((snake, index) => {
        // Debug: Log non-boss snakes in boss_valerie level
        if (updatedState.currentLevelKey === "boss_valerie") {
          console.log(`🐍 NON-BOSS SNAKE DEBUG: Snake ${index}: id=${snake.id}, type=${snake.type}, position=(${snake.position.x}, ${snake.position.y})`);
        }
        
        // Rattlesnakes need both timing logic AND entity updates for movement
        if (snake.type === "rattlesnake") {
          // If rattlesnake is out of pit, update it with entity logic
          if (!snake.isInPit) {
            return updateSnake(
              snake,
              currentWalls,
              deltaTime,
              updatedState.player,
              playerSounds,
              { ...updatedState, quadrantLighting },
              { width: 800, height: 600 },
              undefined, // boulders
              state.snakePits // Pass snake pits for pit position lookup
            );
          }
          return snake; // If in pit, just return as-is
        }
        
        // Apply snake chase multiplier to non-boss snakes (but not on Skate Rink level)
        let modifiedSnake = snake;
        if (snake.type !== 'boss' && snakeChaseMultiplier !== 1 && updatedState.currentLevelKey !== 'boss_valerie') {
          modifiedSnake = {
            ...snake,
            speed: snake.speed * Math.max(0.1, snakeChaseMultiplier) // Ensure minimum speed for animation
          };
        }
        
        const updatedSnake = updateSnake(
          modifiedSnake,
          currentWalls,
          deltaTime,
          updatedState.player,
          playerSounds,
          { ...updatedState, quadrantLighting },
          LEVELS[updatedState.currentLevel]?.size,
          updatedState.boulders,
        );
        
        // Check for environmental effects triggered by boss boulder collision
        if (updatedSnake.environmentalEffects?.spawnMiniBoulders) {
          const spawnedMiniBoulders = get().spawnMiniBoulders(updatedSnake.environmentalEffects.boulderHitPosition, updatedState.levelSize);
          newMiniBoulders.push(...spawnedMiniBoulders);
          // Clear the flag immediately after spawning
          updatedSnake.environmentalEffects.spawnMiniBoulders = false;
        }
        
        if (updatedSnake.environmentalEffects?.spawnScreensaverSnake) {
          console.log(`🐍 GAME LOOP: Processing spawnScreensaverSnake for snake ${updatedSnake.id}`);
          const screensaverSnake = get().spawnScreensaverSnake(updatedSnake.environmentalEffects.boulderHitPosition, updatedState.levelSize);
          console.log(`🐍 GAME LOOP: Created screensaver snake ${screensaverSnake.id} at position (${screensaverSnake.position.x}, ${screensaverSnake.position.y})`);
          newSnakes.push(screensaverSnake);
          console.log(`🐍 GAME LOOP: Added to newSnakes array, total newSnakes: ${newSnakes.length}`);
          // Clear the flag immediately after spawning
          updatedSnake.environmentalEffects.spawnScreensaverSnake = false;
        }
        
        if (updatedSnake.environmentalEffects?.spawnPhotophobicSnake) {
          const photophobicSnake = get().spawnPhotophobicSnake(updatedSnake.environmentalEffects.boulderHitPosition, updatedState.levelSize);
          newSnakes.push(photophobicSnake);
          // Clear the flag immediately after spawning
          updatedSnake.environmentalEffects.spawnPhotophobicSnake = false;
        }
        
        if (updatedSnake.environmentalEffects?.spawnPhantom) {
          // Only spawn phantom if one doesn't already exist with this ID
          const phantomExists = newSnakes.some(s => s.id === updatedSnake.environmentalEffects?.phantomId);
          if (!phantomExists) {
            const phantom = get().spawnPhantom(
              updatedSnake.environmentalEffects.phantomSpawnPosition!, 
              updatedSnake.environmentalEffects.phantomId!,
              updatedSnake.environmentalEffects.phantomLevelBounds
            );
            newSnakes.push(phantom);
          }
          // Clear phantom spawn flag after spawning but keep other environmental effects
          updatedSnake.environmentalEffects.spawnPhantom = false;
        }
        
        if (updatedSnake.environmentalEffects?.spawnRainSnake) {
          // Only spawn rain snake if one doesn't already exist with this ID
          const rainSnakeExists = newSnakes.some(s => s.id === updatedSnake.environmentalEffects?.rainSnakeId);
          if (!rainSnakeExists) {
            const rainSnake = get().spawnRainSnake(
              updatedSnake.environmentalEffects.rainSnakeSpawnPosition!, 
              updatedSnake.environmentalEffects.rainSnakeId!,
              updatedSnake.environmentalEffects.rainMovementPattern,
              updatedSnake.environmentalEffects.rainAngle,
              updatedSnake.environmentalEffects.sineAmplitude,
              updatedSnake.environmentalEffects.sineFrequency
            );
            newSnakes.push(rainSnake);
          }
          // Clear rain snake spawn flag after spawning
          updatedSnake.environmentalEffects.spawnRainSnake = false;
        }
        
        if (updatedSnake.environmentalEffects?.fireProjectiles && updatedSnake.environmentalEffects?.projectileSourceId) {
          // Fire projectiles for Phase 3 boss
          get().fireProjectiles(
            updatedSnake.environmentalEffects.projectileSourceId,
            updatedSnake.environmentalEffects.sequentialProjectileIndex,
            updatedSnake.environmentalEffects.projectileClockwise,
            updatedSnake.environmentalEffects.startingAngle,
            updatedSnake.environmentalEffects.burstRound,
            updatedSnake.environmentalEffects.roundAngleShift
          );
          // Clear projectile firing flag after firing
          updatedSnake.environmentalEffects.fireProjectiles = false;
          updatedSnake.environmentalEffects.projectileSourceId = undefined;
          updatedSnake.environmentalEffects.sequentialProjectileIndex = undefined;
          updatedSnake.environmentalEffects.projectileClockwise = undefined;
          updatedSnake.environmentalEffects.startingAngle = undefined;
          updatedSnake.environmentalEffects.burstRound = undefined;
          updatedSnake.environmentalEffects.roundAngleShift = undefined;
        }
        
        // Clear environmental effects after processing (except phantom spawning which is handled separately)
        if (updatedSnake.environmentalEffects && 
            !updatedSnake.environmentalEffects.spawnMiniBoulders &&
            !updatedSnake.environmentalEffects.spawnScreensaverSnake &&
            !updatedSnake.environmentalEffects.spawnPhotophobicSnake &&
            !updatedSnake.environmentalEffects.spawnPhantom &&
            !updatedSnake.environmentalEffects.fireProjectiles) {
          updatedSnake.environmentalEffects = undefined;
        }
        
        return updatedSnake;
      });
      
      // Combine boss and non-boss snakes back together
      const updatedSnakes = [...updatedBossSnakes, ...updatedNonBossSnakes];

      // Handle spitter snake projectile firing
      let newProjectilesToAdd: any[] = [];
      updatedSnakes.forEach((snake) => {
        if (snake.type === "spitter" && snake.shouldFire) {
          const projectileSpeed = 0.6; // pixels per ms
          const projectileSize = { width: 6, height: 6 };
          const lifespan = 5000; // 5 seconds

          // Check if we're on Level 4 for alternating pattern
          const isLevel4 = state.currentLevelKey === "grid_puzzle";
          let directions: { x: number; y: number }[];

          if (isLevel4) {
            const isOddShot = (snake.shotCount || 1) % 2 === 1;

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
            id: `${snake.id}_projectile_${Date.now()}_${index}`,
            position: {
              x: snake.position.x + snake.size.width / 2 - projectileSize.width / 2,
              y: snake.position.y + snake.size.height / 2 - projectileSize.height / 2,
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
          
          // Clear the shouldFire flag
          snake.shouldFire = false;
        }
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

      // Initialize local player and dash state for modifications
      let updatedPlayer = { ...updatedState.player };
      let updatedDashState = { ...updatedState.dashState };

      // --- SHIELD HEALTH SYNCHRONIZATION ---
      // Keep shield health in sync with active items (both permanent and temporary)
      let totalBiteProtection = 0;
      state.inventoryItems.forEach(item => {
        if (item.isActive && item.modifiers.biteProtection) {
          totalBiteProtection += item.modifiers.biteProtection;
        }
      });

      // Update shield health if protection has changed
      if (updatedPlayer.maxShieldHealth !== totalBiteProtection) {
        updatedPlayer.maxShieldHealth = totalBiteProtection;
        // If getting new protection, set shield to max
        if (totalBiteProtection > updatedPlayer.shieldHealth) {
          updatedPlayer.shieldHealth = totalBiteProtection;
        }
        // If protection decreased, cap shield health
        else if (updatedPlayer.shieldHealth > totalBiteProtection) {
          updatedPlayer.shieldHealth = totalBiteProtection;
        }
      }

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
        !updatedDashState.isInvulnerable &&
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
        // Apply damage: shield first, then health
        if (updatedPlayer.shieldHealth > 0) {
          // Damage shield first
          updatedPlayer.shieldHealth -= 1;
        } else {
          // Shield depleted, damage health
          updatedPlayer.health -= 1;
        }

        // Check if player dies (only when both health and shield are depleted)
        if (updatedPlayer.health <= 0 && updatedPlayer.shieldHealth <= 0) {
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
      const itemTime = performance.now() / 1000;
      let updatedThrowableItems = state.throwableItems.map((item) => {
        if (
          item.isThrown &&
          item.throwStartTime &&
          item.throwDuration &&
          item.throwStartPos &&
          item.throwTargetPos
        ) {
          const elapsedTime = itemTime - item.throwStartTime;
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
        // IMPORTANT: Update the PlayerController's internal position to match the teleport
        // This prevents the PlayerController from overwriting the teleported position on the next frame
        if (state.playerController) {
          state.playerController.setPosition(teleportResult.targetPosition);
        }
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
              // Reset all tile glowing states
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

      // No pattern demonstration needed for Level 1 - players figure out the sequence themselves

      // Open key room if pattern completed
      if (shouldOpenKeyRoom) {
        // Remove all walls of the key room to allow access
        const keyRoomWalls = state.walls.filter((wall) => {
          // Filter out all four walls of the key chamber
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
      if (state.currentLevelKey === "item_collection") {
        // Level 2 uses pressure plates (MacGruber level)
        const pressurePlates = updatedSwitches.filter((s) =>
          s.id.startsWith("pressure"),
        );
        const allPressurePlatesActive =
          pressurePlates.length === 3 &&
          pressurePlates.every((p) => p.isPressed);

        // Define all four key room walls for Level 2 (different coordinates than Level 1)
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
      if (state.currentLevelKey === "boss_valerie") {
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
      if (state.currentLevelKey === "light_reflection" && updatedCrystal) {
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

      // All levels - door opens when player has the key (puzzles become optional)
      if (updatedPlayer.hasKey) {
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
      if (state.currentLevelKey === "boss_valerie" && state.boulders.length > 0) {
        // Level 6 (0-indexed as 6)
        const destroyedBoulders = state.boulders.filter(boulder => boulder.isDestroyed);
        const allBouldersDestroyed = destroyedBoulders.length === state.boulders.length;
        
        // If all boulders are destroyed and key hasn't been spawned yet (key starts hidden)
        if (allBouldersDestroyed && updatedKey.x === -100 && updatedKey.y === -100) {
          // Spawn key at the center of the map (800x600 level)
          updatedKey = {
            ...updatedKey,
            x: 400 - 10, // Center of map (400) minus half key width (10)
            y: 300 - 10, // Center of map (300) minus half key height (10)
            collected: false
          };
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
      // Process phantom completion and removal AFTER all snake updates
      // Use updatedSnakes (with position updates) as the base, then add any new snakes spawned
      let finalSnakes = newSnakes.length > updatedSnakes.length ? [...newSnakes] : [...updatedSnakes];
      
      if (!get().phantomRemovalInProgress) {
        const phantomsThatReturned = finalSnakes.filter(snake => 
          snake.type === 'phantom' && 
          snake.hasReturnedToSpawn && 
          !snake.processedForRemoval
        );
        
        if (phantomsThatReturned.length > 0) {
          set(state => ({ ...state, phantomRemovalInProgress: true }));
          
          // Group phantoms by their boss (look for phantoms that belong to the same boss)
          const bossSnakes = finalSnakes.filter(snake => snake.type === 'boss' && snake.bossState === 'waitingForPhantom');
          
          bossSnakes.forEach(bossSnake => {
            if (bossSnake.phantomIds && bossSnake.phantomIds.length > 0) {
              // Check how many of this boss's phantoms have returned
              const bossPhantomIds = bossSnake.phantomIds;
              const returnedPhantoms = phantomsThatReturned.filter(phantom => 
                bossPhantomIds.includes(phantom.id)
              );
              const remainingPhantoms = finalSnakes.filter(snake => 
                snake.type === 'phantom' && 
                bossPhantomIds.includes(snake.id) && 
                !snake.hasReturnedToSpawn
              );
              
              
              // Only resume tracking if ALL phantoms from this boss have returned
              if (remainingPhantoms.length === 0 && returnedPhantoms.length > 0) {
                bossSnake.bossState = 'tracking';
                bossSnake.phantomIds = undefined;
                bossSnake.phantomSpawnStartTime = undefined;
                bossSnake.phantomSpawnCount = undefined;
              }
            }
            // Legacy single phantom support
            else if (bossSnake.phantomId) {
              const legacyPhantom = phantomsThatReturned.find(phantom => phantom.id === bossSnake.phantomId);
              if (legacyPhantom) {
                bossSnake.bossState = 'tracking';
                bossSnake.phantomId = undefined;
              }
            }
          });
          
          phantomsThatReturned.forEach(phantom => {
          });
          
          // Remove all phantoms that have returned to spawn
          finalSnakes = finalSnakes.filter(snake => !(snake.type === 'phantom' && snake.hasReturnedToSpawn));
          
          // Reset the flag after a short delay
          setTimeout(() => {
            set(state => ({ ...state, phantomRemovalInProgress: false }));
          }, 100);
        }
      }

      // Remove rain snakes that have fallen off the bottom of the screen
      const rainSnakesToRemove = finalSnakes.filter(snake => 
        snake.type === 'rainsnake' && snake.position.y > (state.levelSize?.height || 600) + 50
      );
      
      if (rainSnakesToRemove.length > 0) {
        finalSnakes = finalSnakes.filter(snake => !(snake.type === 'rainsnake' && snake.position.y > (state.levelSize?.height || 600) + 50));
      }

      set({
        currentVelocity: state.playerController?.getCurrentVelocity() || { x: 0, y: 0 }, // Get velocity from PlayerController
        snakes: finalSnakes, // Use snakes after pit/projectile processing
        miniBoulders: newMiniBoulders, // Add the mini boulders to the state
        projectiles: [...(state.projectiles || []), ...newProjectilesToAdd], // Add new spitter projectiles
        key: updatedKey,
        player: updatedPlayer,
        switches: updatedSwitches,
        dashState: updatedDashState, // Update dash state
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
      if (state.gameState !== "playing" || state.currentLevelKey !== "light_reflection") return; // Only on level 3 (0-indexed)

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
        state.currentLevelKey !== "light_reflection" ||
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
      if (state.currentLevelKey !== "grid_puzzle") return; // Only on level 4 (0-indexed)

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
      if (state.currentLevelKey !== "grid_puzzle") return; // Only on level 4 (0-indexed)

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
      if (state.currentLevelKey !== "grid_puzzle") return false; // Only on level 4 (0-indexed)

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
      if (state.currentLevelKey !== "grid_puzzle") return; // Only on level 4 (0-indexed)

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
      const updatedProjectiles = state.projectiles.filter((projectile, index) => {
        const age = currentTime - projectile.createdAt;
        if (age > projectile.lifespan) {
          // Add debugging for Valerie level expired projectiles
          if (state.currentLevelKey === "boss_valerie") {
            console.log(`⏰ EXPIRED: Projectile ${projectile.id} expired after ${age}ms (lifespan: ${projectile.lifespan}ms)`);
          }
          return false; // Remove expired projectile
        }

        // Update position
        const oldX = projectile.position.x;
        const oldY = projectile.position.y;
        projectile.position.x += projectile.velocity.x * deltaTime;
        projectile.position.y += projectile.velocity.y * deltaTime;
        
        // Add debugging for Valerie level projectile movement
        if (state.currentLevelKey === "boss_valerie" && index === 0) {
          console.log(`🚀 PROJECTILE MOVE: deltaTime=${deltaTime.toFixed(4)}, moved from (${oldX.toFixed(1)}, ${oldY.toFixed(1)}) to (${projectile.position.x.toFixed(1)}, ${projectile.position.y.toFixed(1)}), vel=(${projectile.velocity.x.toFixed(2)}, ${projectile.velocity.y.toFixed(2)})`);
        }
        

        // Check collision with player
        const projectileRect = { ...projectile.position, ...projectile.size };
        const playerRect = { ...player.position, ...player.size };
        const collision = checkAABBCollision(projectileRect, playerRect);

        // Player is invincible either from before this frame, from a hit earlier in this frame, or during dash
        const isInvincible = player.isInvincible || playerHitThisFrame || state.dashState.isInvulnerable;

        if (!isInvincible && collision) {
          // Player hit by projectile - first hit this frame
          collisionDetected = true;
          hitCount = 1; // Only one hit per frame allowed
          playerHitThisFrame = true; // Prevent additional hits this frame

          // Add debugging for Valerie level player hits
          if (state.currentLevelKey === "boss_valerie") {
            console.log(`🎯 PLAYER HIT: Projectile ${projectile.id} hit player`);
          }

          // Don't check for player death here - let the main game loop handle it

          return false; // Remove projectile
        }

        // Check collision with walls - boss projectiles with wall penetration can pass through
        const allowWallPenetration = projectile.canPenetrateWalls && state.currentLevelKey === "boss_valerie";
        
        if (!allowWallPenetration) {
          for (const wall of state.walls) {
            const projectileRect = { 
              x: projectile.position?.x ?? projectile.x ?? 0,
              y: projectile.position?.y ?? projectile.y ?? 0,
              width: projectile.size?.width ?? projectile.width ?? 6,
              height: projectile.size?.height ?? projectile.height ?? 6
            };
            
            if (checkAABBCollision(projectileRect, wall)) {
              // Add debugging for wall collisions
              if (state.currentLevelKey === "boss_valerie") {
                console.log(`🧱 WALL COLLISION: Projectile ${projectile.id} at (${projectileRect.x.toFixed(1)}, ${projectileRect.y.toFixed(1)}) size (${projectileRect.width}x${projectileRect.height}) hit wall at (${wall.x}, ${wall.y}) size (${wall.width}x${wall.height})`);
              }
              return false; // Remove projectile on wall collision
            }
          }
        } else {
          // Boss projectiles pass through walls - add debug logging
          if (state.currentLevelKey === "boss_valerie") {
            console.log(`🌟 BOSS PROJECTILE: ${projectile.id} passing through walls (wall penetration enabled)`);
          }
        }

        return true; // Keep projectile
      });

      // Update the state with filtered projectiles
      if (state.currentLevelKey === "boss_valerie" && (state.projectiles.length > 0 || updatedProjectiles.length > 0)) {
        console.log(`🎯 PROJECTILE UPDATE: Before: ${state.projectiles.length}, After: ${updatedProjectiles.length}, Removed: ${state.projectiles.length - updatedProjectiles.length}`);
        
        // Log remaining projectiles for debugging
        if (updatedProjectiles.length > 0 && updatedProjectiles.length <= 5) {
          updatedProjectiles.forEach((proj, i) => {
            console.log(`🎯 REMAINING PROJ ${i}: ${proj.id} at (${proj.position.x.toFixed(1)}, ${proj.position.y.toFixed(1)}) age=${Date.now() - proj.createdAt}ms`);
          });
        } else if (updatedProjectiles.length > 5) {
          console.log(`🎯 REMAINING PROJECTS: ${updatedProjectiles.length} total projectiles still active`);
        }
      }
      
      set({ projectiles: updatedProjectiles });

      // Spitter firing logic will be handled in the main snake update loop below
      // This prevents the duplicate update issue

      return { hitCount };
    },

    // Environmental effects for boss boulder collisions
    spawnMiniBoulders: (centerPosition: Position, levelSize: { width: number; height: number }): MiniBoulder[] => {
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

    spawnScreensaverSnake: (centerPosition: Position, levelSize: { width: number; height: number }): Snake => {
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
        size: { width: 60, height: 60 },
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

    spawnPhotophobicSnake: (centerPosition: Position, levelSize: { width: number; height: number }): Snake => {
      const currentTime = Date.now();
      const state = get();
      
      // Count existing photophobic snakes to determine if this is the first or second
      const existingPhotophobicSnakes = state.snakes.filter(snake => snake.type === 'photophobic');
      const isFirstPhotophobicSnake = existingPhotophobicSnakes.length === 0;
      
      // Spawn at Valerie's center position
      const spawnX = Math.max(16, Math.min(centerPosition.x - 16, levelSize.width - 32));
      const spawnY = Math.max(16, Math.min(centerPosition.y - 16, levelSize.height - 32));
      
      // Determine initial lighting state based on current level
      let isDark = false;
      
      if (state.currentLevelKey === "grid_puzzle") {
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
      } else if (state.currentLevelKey === "light_switch") {
        // Level 6 (0-indexed as 5) - Boulder-based lighting
        // ON → OFF (1st) → ON (2nd) → OFF (3rd) → ON (4th)
        const destroyedBoulders = state.boulders?.filter(boulder => boulder.isDestroyed) || [];
        const destroyedCount = destroyedBoulders.length;
        
        if (destroyedCount === 0) {
          isDark = false; // Light is on at start
        } else if (destroyedCount === 1) {
          isDark = true;  // Light is off after 1st boulder
        } else if (destroyedCount === 2) {
          isDark = false; // Light is on after 2nd boulder
        } else if (destroyedCount === 3) {
          isDark = true;  // Light is off after 3rd boulder
        } else {
          isDark = false; // Light is on after 4th boulder
        }
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

      // Speed settings: first photophobic snake is 25% slower, second is normal speed
      const baseSpeed = 80;
      const baseChaseSpeed = 250;
      const speedMultiplier = isFirstPhotophobicSnake ? 0.75 : 1.0; // 25% slower for first snake

      return {
        id: `photophobic_snake_${currentTime}`,
        type: 'photophobic',
        position: {
          x: spawnX,
          y: spawnY
        },
        spawnPoint: {
          x: spawnX,
          y: spawnY
        },
        size: { width: 32, height: 32 },
        speed: Math.round(baseSpeed * speedMultiplier), // 60 for first, 80 for second
        direction: { x: initialDirection.x, y: initialDirection.y },
        patrolPoints: [], // No patrol points for photophobic snakes
        currentPatrolIndex: 0,
        patrolDirection: 1,
        chaseSpeed: Math.round(baseChaseSpeed * speedMultiplier), // 188 for first, 250 for second
        sightRange: 800, // Entire map width for Level 6
        hearingRange: 600, // Entire map height for Level 6
        isChasing: false,
        isInDarkness: isDark, // Set based on actual lighting conditions
        isBerserk: !isDark, // If not dark, start in berserk mode
        isPaused: false,
        isCharging: false,
      };
    },

    spawnPhantom: (spawnPosition: Position, phantomId: string, levelBounds?: { width: number; height: number }): Snake => {
      
      // Determine initial direction based on alternating pattern (every other phantom goes opposite direction)
      // Extract spawn count from phantom ID to determine direction
      const idParts = phantomId.split('_');
      const spawnCount = idParts.length >= 3 ? parseInt(idParts[2]) : 0;
      
      // Every other phantom starts in opposite direction (alternating north/south)
      // Spawn count 0, 2, 4, 6... start north
      // Spawn count 1, 3, 5, 7... start south
      const initialDirection = (spawnCount % 2 === 0) ? 'north' : 'south';
      const directionVector = initialDirection === 'north' ? { x: 0, y: -1 } : { x: 0, y: 1 };
      
      // Determine rotation direction based on wall position and initial direction
      // When on west wall: north=clockwise, south=counterclockwise  
      // When on east wall: north=counterclockwise, south=clockwise
      const screenCenter = levelBounds ? levelBounds.width / 2 : 400;
      const isOnWestWall = spawnPosition.x < screenCenter;
      
      let rotationDirection: 'clockwise' | 'counterclockwise';
      if (isOnWestWall) {
        rotationDirection = initialDirection === 'north' ? 'clockwise' : 'counterclockwise';
      } else {
        rotationDirection = initialDirection === 'north' ? 'counterclockwise' : 'clockwise';
      }
      
      
      const phantom = {
        id: phantomId,
        type: 'phantom' as const,
        position: { x: spawnPosition.x, y: spawnPosition.y },
        size: { width: 130, height: 130 }, // Same size as boss Valerie (130x130)
        speed: 540, // Triple Valerie's max speed for extremely fast phantom movement
        direction: directionVector, // Set based on spawn side
        patrolPoints: [],
        currentPatrolIndex: 0,
        patrolDirection: 1,
        chaseSpeed: 0,
        sightRange: 0,
        isChasing: false,
        isPhantom: true,
        originalSpawnPosition: { x: spawnPosition.x, y: spawnPosition.y },
        phantomDirection: initialDirection as 'north' | 'south',
        phantomRotation: rotationDirection, // Rotation based on wall position and initial direction
        hasReturnedToSpawn: false
      };
      return phantom;
    },

    spawnRainSnake: (spawnPosition: Position, rainSnakeId: string, movementPattern?: string, angle?: number, amplitude?: number, frequency?: number): Snake => {
      
      // Random speed between 150 and 600 (50% faster bottom end, 200% faster top end)
      const randomSpeed = 150 + Math.random() * 450;
      
      // Set direction based on movement pattern
      let direction = { x: 0, y: 1 }; // Default straight down
      if (movementPattern === 'angled' && angle) {
        // Convert 30-degree angle to direction vector
        const radians = (angle * Math.PI) / 180;
        direction = { x: Math.sin(radians), y: Math.cos(radians) };
      }
      
      const rainSnake = {
        id: rainSnakeId,
        type: 'rainsnake' as const,
        position: { x: spawnPosition.x, y: spawnPosition.y },
        size: { width: 40, height: 40 }, // Standard snake size
        speed: randomSpeed,
        direction: direction,
        patrolPoints: [],
        currentPatrolIndex: 0,
        patrolDirection: 1,
        chaseSpeed: 0, // Rain snakes don't chase, they just fall
        sightRange: 0, // No sight range needed
        isChasing: false,
        isRainSnake: true,
        rainSpeed: randomSpeed,
        rainMovementPattern: movementPattern as 'straight' | 'angled' | 'sine' | undefined,
        rainAngle: angle,
        sineAmplitude: amplitude,
        sineFrequency: frequency,
        initialX: spawnPosition.x // Store initial X for sine wave calculation
      };
      
      return rainSnake;
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

    fireProjectiles: (snakeId: string, sequentialIndex?: number, clockwise?: boolean, startingAngle?: number, burstRound?: number, roundAngleShift?: number) => {
      const state = get();
      const snake = state.snakes.find((s) => s.id === snakeId);
      if (!snake || (snake.type !== "spitter" && snake.type !== "boss")) return;
      
      console.log(`💥 FIRE DEBUG: Snake ${snakeId}, type: ${snake.type}, bossPhase: ${snake.bossPhase}, burstRound: ${burstRound}, roundAngleShift: ${roundAngleShift}`);

      // Boss projectiles (Phase 3 Valerie) vs regular spitter projectiles
      const isBossProjectiles = snake.type === "boss" && snake.bossPhase === 3;
      console.log(`💥 FIRE DEBUG: isBossProjectiles = ${isBossProjectiles}`);
      const projectileSpeed = isBossProjectiles ? 2.0 : 0.3; // Boss projectiles are much faster now
      const projectileSize = { width: 8, height: 8 }; // Larger boss projectiles
      const lifespan = 6000; // 6 seconds for boss projectiles

      let directions: { x: number; y: number }[];

      console.log(`💥 CONDITION CHECK: isBossProjectiles=${isBossProjectiles}, burstRound=${burstRound}, roundAngleShift=${roundAngleShift}`);
      if (isBossProjectiles && burstRound !== undefined && roundAngleShift !== undefined) {
        console.log(`💥 ENTERING BOSS PROJECTILE CREATION`);
        // Phase 3 boss: 4-round burst firing with angle shifts
        const totalProjectiles = 24;
        const angleStep = 360 / totalProjectiles; // 15 degrees per projectile
        
        console.log(`💥 CALCULATION DEBUG: totalProjectiles=${totalProjectiles}, angleStep=${angleStep}, roundAngleShift=${roundAngleShift}`);
        
        directions = [];
        try {
          for (let i = 0; i < totalProjectiles; i++) {
            // Calculate angle for this projectile with round shift applied
            const baseAngle = i * angleStep; // 0°, 15°, 30°, etc.
            const shiftedAngle = baseAngle + roundAngleShift; // Add 0°, 3°, 6°, or 9° shift
            
            // Normalize angle to 0-360 range
            const normalizedAngle = ((shiftedAngle % 360) + 360) % 360;
            
            // Convert to radians and create direction
            const angleRad = normalizedAngle * (Math.PI / 180);
            const dir = {
              x: Math.cos(angleRad),
              y: Math.sin(angleRad)
            };
            
            // Validate direction values
            if (isNaN(dir.x) || isNaN(dir.y)) {
              console.log(`❌ INVALID DIRECTION: Projectile ${i} has NaN direction: (${dir.x}, ${dir.y}), angle=${normalizedAngle}`);
              continue;
            }
            
            directions.push(dir);
          }
          
          console.log(`💥 PROJECTILE CREATE: Created ${directions.length} boss projectiles for round ${burstRound}`);
          console.log(`💥 DEBUG CHECKPOINT 1: Immediately after projectile creation`);
          console.log(`💥 DEBUG CHECKPOINT 2: directions array length = ${directions.length}`);
          console.log(`💥 POST-CREATE DEBUG: About to continue to state update...`);
        } catch (error) {
          console.log(`❌ PROJECTILE CREATION ERROR:`, error);
          return; // Exit early on error
        }
        
      } else if (isBossProjectiles) {
        // Phase 3 boss: Fallback to all 30 projectiles at once (if sequential parameters not provided)
        directions = [];
        for (let i = 0; i < 30; i++) {
          const angle = (i * 12) * (Math.PI / 180); // Convert 12-degree increments to radians
          directions.push({
            x: Math.cos(angle),
            y: Math.sin(angle)
          });
        }
      } else if (state.currentLevelKey === "grid_puzzle") { // Level 4 spitter behavior
        // Check if we're on Level 4 for alternating pattern
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

      const projectileColor = isBossProjectiles ? "#ff4444" : "#00ff41"; // Red for boss, green for spitters

      const spawnX = snake.position.x + snake.size.width / 2 - projectileSize.width / 2;
      const spawnY = snake.position.y + snake.size.height / 2 - projectileSize.height / 2;
      
      const newProjectiles = directions.map((dir, index) => ({
        id: `${snakeId}_projectile_${Date.now()}_${index}`,
        position: {
          x: spawnX,
          y: spawnY,
        },
        velocity: {
          x: dir.x * projectileSpeed,
          y: dir.y * projectileSpeed,
        },
        size: projectileSize,
        createdAt: Date.now(),
        lifespan,
        color: projectileColor,
        canPenetrateWalls: isBossProjectiles, // Boss projectiles in Phase 3 can pass through walls
      }));
      
      // Add spawn position debugging for Valerie
      if (snake.type === "boss" && snake.bossPhase === 3) {
        console.log(`🎯 SPAWN DEBUG: Boss at (${snake.position.x}, ${snake.position.y}) size (${snake.size.width}x${snake.size.height}), projectiles spawn at (${spawnX}, ${spawnY})`);
        
        // Check if spawn position collides with walls
        const spawnRect = { x: spawnX, y: spawnY, width: projectileSize.width, height: projectileSize.height };
        const currentState = get(); // Fresh state call to avoid stale state
        for (const wall of currentState.walls) {
          if (checkAABBCollision(spawnRect, wall)) {
            console.log(`❌ SPAWN COLLISION: Projectile spawn position (${spawnX}, ${spawnY}) immediately collides with wall at (${wall.x}, ${wall.y})`);
          }
        }
      }

      // Add targeted debugging for Valerie
      if (snake.type === "boss" && snake.bossPhase === 3) {
        // Get fresh state to avoid stale state issues
        const freshState = get();
        console.log(`🎯 FIREPROJECTILES: Adding ${newProjectiles.length} projectiles to state (currently has ${freshState.projectiles.length})`);
        console.log(`🎯 PROJECTILE SAMPLE: First projectile - pos: (${newProjectiles[0]?.position.x}, ${newProjectiles[0]?.position.y}), vel: (${newProjectiles[0]?.velocity.x}, ${newProjectiles[0]?.velocity.y}), lifespan: ${newProjectiles[0]?.lifespan}ms`);
        console.log(`🎯 STATE UPDATE: About to update state with ${[...freshState.projectiles, ...newProjectiles].length} total projectiles`);
      }
      
      // Get fresh state for the actual update to avoid stale state
      const finalState = get();
      const updatedProjectiles = [...finalState.projectiles, ...newProjectiles];
      
      // Add debugging to track state update
      if (snake.type === "boss" && snake.bossPhase === 3) {
        console.log(`🔄 STATE UPDATE: Before set() - finalState.projectiles.length: ${finalState.projectiles.length}, adding: ${newProjectiles.length}, total will be: ${updatedProjectiles.length}`);
      }
      
      set({
        projectiles: updatedProjectiles,
      });
      
      // Verify the state was actually updated
      if (snake.type === "boss" && snake.bossPhase === 3) {
        const verifyState = get();
        console.log(`✅ STATE VERIFIED: After set() - projectiles.length: ${verifyState.projectiles.length}`);
      }
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

      // Level 5 (currentLevelKey === "grid_puzzle"): Add phase-specific walls
      if (state.currentLevelKey === "grid_puzzle") {
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

      // Level 6: Add non-destroyed boulders as walls
      if (state.currentLevelKey === "boss_valerie" && state.boulders.length > 0) {
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
                  // Center the player on the receiver pad
                  const targetX = receiver.x + (receiver.width / 2) - (state.player.size.width / 2);
                  const targetY = receiver.y + (receiver.height / 2) - (state.player.size.height / 2);
                  teleportInfo = {
                    targetPosition: { x: targetX, y: targetY },
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
          state.currentLevelKey !== "light_reflection" ||
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

          // Light just started hitting the pit - state machine will handle snake emergence
          if (isCurrentlyHitByLight && !wasHitByLight) {
            // Update pit to track light emergence
            updatedSnakePits[pitIndex] = {
              ...updatedSnakePits[pitIndex],
              lightEmergenceTime: currentTime,
              isLightEmergence: true,
            };
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
      if (state.currentLevelKey === "light_switch") {
        // Level 5 (0-indexed as 5)
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

    startLevel: (levelIndex: number) => {
      get().startFromLevel(levelIndex);
    },

    startLevelByName: (levelKey: string) => {
      const levelIndex = getLevelIndexByKey(levelKey);
      if (levelIndex >= 0) {
        get().startFromLevel(levelIndex);
      }
    },

    // Centralized function to handle all hub reset logic
    resetForHub: () => {
      const state = get();
      state.clearTemporaryItems(); // Clear temporary items when returning to hub
      
      // Calculate shield health from remaining active permanent items
      let totalBiteProtection = 0;
      state.inventoryItems.forEach(item => {
        if (item.duration === 'permanent' && item.isActive && item.modifiers.biteProtection) {
          totalBiteProtection += item.modifiers.biteProtection;
        }
      });
      
      // Reset player health to full and apply shield protection
      set({ 
        gameState: "hub",
        currentLevel: 0,
        currentLevelKey: "hub",
        player: {
          ...state.player,
          health: state.player.maxHealth, // Reset to full health
          shieldHealth: totalBiteProtection, // Apply shield from permanent items
          maxShieldHealth: totalBiteProtection,
          isInvincible: false,
          invincibilityEndTime: 0
        }
      });
    },

    returnToHub: () => {
      get().resetForHub();
    },

    // Unified Player Controller methods
    updatePlayerController: (deltaTime: number, inputState: InputState) => {
      const state = get();
      if (!state.playerController) return;
      
      // Update PlayerController speeds based on active inventory items
      const speeds = getPlayerSpeeds(state.inventoryItems);
      state.playerController.updateConfig({
        normalSpeed: speeds.playerSpeed,
        walkingSpeed: speeds.walkingSpeed,
        dashSpeed: speeds.dashSpeed,
        dashDuration: speeds.dashDuration,
        dashCooldown: speeds.dashCooldown
      });
      
      // Get the intended position from unified controller
      const intendedPosition = state.playerController.update(inputState, deltaTime);
      
      // Check wall collisions using existing collision system
      const playerRect = {
        x: intendedPosition.x,
        y: intendedPosition.y,
        width: state.player.size.width,
        height: state.player.size.height,
      };

      const currentWalls = get().getCurrentWalls();
      const hasWallCollision = currentWalls.some((wall) =>
        checkAABBCollision(playerRect, wall),
      );

      let finalPosition = intendedPosition;
      
      // If there's a wall collision, use slideAlongWall to maintain smooth movement
      if (hasWallCollision) {
        finalPosition = slideAlongWall(
          state.player.position,
          intendedPosition,
          currentWalls,
          state.player.size
        );
        
        // Update the PlayerController's internal position to match the actual final position
        // This prevents position accumulation when blocked by walls
        state.playerController.setPosition(finalPosition);
      }
      
      // Note: Don't call setPosition during gameplay as it interferes with dash state
      // The PlayerController will sync naturally on the next frame
      
      // Update dash state from controller
      const controllerDashState = state.playerController.getDashState();
      
      // Calculate walking state for unified PlayerController system
      // Check if walking key is currently pressed to update badge display
      const keyBindings = useKeyBindings.getState().keyBindings;
      const currentTime = Date.now();
      
      const isKeyActiveRecently = (keyCode: string) => {
        return (
          state.keysPressed.has(keyCode) ||
          (state.keyStates.has(keyCode) &&
            currentTime - state.keyStates.get(keyCode)! < 50)
        );
      };
      
      // Check if walking key is pressed, but clear walking if dashing
      const isWalkingKeyPressed =
        isKeyActiveRecently(keyBindings.walking) ||
        isKeyActiveRecently("ControlRight"); // Keep ControlRight as backup
      const isWalking = isWalkingKeyPressed && !controllerDashState.isDashing;
      
      // Update store state
      set({
        player: {
          ...state.player,
          position: finalPosition,
        },
        dashState: {
          isActive: controllerDashState.isDashing,
          startTime: 0, // Not used in PlayerController
          startPosition: controllerDashState.dashStartPosition,
          direction: controllerDashState.dashDirection,
          progress: controllerDashState.dashProgress,
          isInvulnerable: controllerDashState.isInvulnerable,
          lastDashTime: controllerDashState.lastDashTime,
          cooldownDuration: controllerDashState.cooldownDuration,
        },
        currentVelocity: state.playerController.getCurrentVelocity(),
        targetVelocity: state.playerController.getTargetVelocity(),
        isWalking: isWalking,
      });
      
    },

    configurePlayerController: () => {
      const state = get();
      
      // Initialize controller if it doesn't exist
      if (!state.playerController) {
        const boundaries = {
          minX: 20,
          maxX: state.levelSize.width - 20,
          minY: 20,
          maxY: state.levelSize.height - 20
        };
          
        const controller = createGamePlayerController(
          state.player.position,
          state.player.size,
          boundaries
        );
        
        set({ playerController: controller });
        return;
      }
      
      // Use same configuration for all levels (including hub)
      const inventoryItems = state.inventoryItems;
      const speeds = getPlayerSpeeds(inventoryItems);
      
      state.playerController.updateConfig({
        normalSpeed: speeds.playerSpeed,
        walkingSpeed: speeds.walkingSpeed,
        acceleration: 8,
        useAcceleration: false, // Direct movement for all levels
        dashSpeed: speeds.dashSpeed,
        dashDuration: speeds.dashDuration,
        dashCooldown: speeds.dashCooldown,
        dashDistance: 96,
        dashInvulnerabilityDistance: 32
      });
      
      // Update boundaries for current level
      const boundaries = {
        minX: 20,
        maxX: state.levelSize.width - 20,
        minY: 20,
        maxY: state.levelSize.height - 20
      };
      state.playerController.setBoundaries(boundaries);
      
      // Update position and size
      state.playerController.setPosition(state.player.position);
    },
  })),
);
