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
} from "../game/types";
import { LEVELS } from "../game/levels";
import { checkAABBCollision } from "../game/collision";
import { updateSnake } from "../game/entities";
import { calculateLightBeam } from "../game/lightBeam";
import { useAudio } from "./useAudio";

interface SnakeGameState extends GameData {
  // Levels data
  levels: any[];
  
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
  rotateMirror: (direction: 'clockwise' | 'counterclockwise') => void;
  
  // Light source rotation actions
  rotateLightSource: (direction: 'clockwise' | 'counterclockwise') => void;
  
  // Flow system actions
  startFlow: () => void;
  updateFlow: (deltaTime: number) => void;
  getNextTile: (currentTileId: string, exitDirection: 'north' | 'south' | 'east' | 'west') => any;
  getOppositeDirection: (direction: 'north' | 'south' | 'east' | 'west') => 'north' | 'south' | 'east' | 'west';
  calculateExitDirection: (tileId: string, entryDirection: 'north' | 'south' | 'east' | 'west') => 'north' | 'south' | 'east' | 'west' | null;
  getTileDirections: (tileId: string) => Array<'north' | 'south' | 'east' | 'west'>;
  
  // Tile rotation actions
  rotateTile: (direction: 'left' | 'right') => void;
  
  // Path connection detection
  checkPathConnection: () => boolean;
  removeKeyWalls: () => void;
  
  // Projectile system actions
  updateProjectiles: (deltaTime: number) => void;
  spawnSpitterSnake: (position: Position) => void;
  fireProjectiles: (snakeId: string) => void;
  
  // Phase system actions
  updatePhase: (deltaTime: number) => void;
  collectPuzzleShard: (shardId: string) => void;
  getCurrentWalls: () => Wall[];
  
  // Teleporter system actions
  updateTeleporters: (deltaTime: number) => void;
  checkTeleporterCollision: () => void;
}

const PLAYER_SPEED = 0.2; // pixels per second
const WALKING_SPEED = 0.1; // pixels per second when walking (shift held)
const ACCELERATION = 1; // pixels per second squared

// Helper function for line-rectangle intersection
function lineIntersectsRect(
  start: Position,
  end: Position,
  rect: { x: number; y: number; width: number; height: number }
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
      size: { width: 25, height: 25 },
      speed: PLAYER_SPEED,
      hasKey: false,
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

    puzzleShards: [],
    puzzlePedestal: null,
    phaseWalls: [],
    keysPressed: new Set(),
    currentVelocity: { x: 0, y: 0 },
    targetVelocity: { x: 0, y: 0 },
    isWalking: false,

    setKeyPressed: (key: string, pressed: boolean) => {
      set((state) => {
        const newKeysPressed = new Set(state.keysPressed);
        if (pressed) {
          newKeysPressed.add(key);
        } else {
          newKeysPressed.delete(key);
        }

        // Check if walking (Shift key held)
        const isWalking =
          newKeysPressed.has("ShiftLeft") || newKeysPressed.has("ShiftRight");
        const moveSpeed = isWalking ? WALKING_SPEED : PLAYER_SPEED;

        // Calculate target velocity based on current pressed keys
        const targetVelocity = { x: 0, y: 0 };

        if (newKeysPressed.has("ArrowUp") || newKeysPressed.has("KeyW")) {
          targetVelocity.y -= moveSpeed;
        }
        if (newKeysPressed.has("ArrowDown") || newKeysPressed.has("KeyS")) {
          targetVelocity.y += moveSpeed;
        }
        if (newKeysPressed.has("ArrowLeft") || newKeysPressed.has("KeyA")) {
          targetVelocity.x -= moveSpeed;
        }
        if (newKeysPressed.has("ArrowRight") || newKeysPressed.has("KeyD")) {
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
          targetVelocity: targetVelocity,
          isWalking: isWalking,
        };
      });
    },

    startGame: () => {
      const level = LEVELS[0];
      set({
        currentLevel: 0,
        gameState: "playing",
        player: {
          position: { ...level.player },
          size: { width: 25, height: 25 },
          speed: PLAYER_SPEED,
          hasKey: false,
        },
        snakes: level.snakes.map((snake) => ({ ...snake })),
        walls: level.walls.map((wall) => ({ ...wall })),
        door: { ...level.door },
        key: { ...level.key },
        switches: level.switches ? level.switches.map((s) => ({ ...s })) : [],
        throwableItems: level.throwableItems
          ? level.throwableItems.map((item) => ({ ...item }))
          : [],
        patternTiles: level.patternTiles ? level.patternTiles.map((tile) => ({ ...tile })) : [],
        patternSequence: level.patternSequence ? [...level.patternSequence] : [],
        currentPatternStep: 0,
        carriedItem: null,
        levelSize: { ...level.size },
        mirrors: level.mirrors ? level.mirrors.map((mirror) => ({ ...mirror })) : [],
        crystal: level.crystal ? { ...level.crystal } : null,
        lightSource: level.lightSource ? { ...level.lightSource } : null,
        lightBeam: null,
        projectiles: [],
        teleporters: level.teleporters ? level.teleporters.map((teleporter) => ({ ...teleporter })) : [],
        // Phase system initialization
        currentPhase: level.currentPhase || 'A',
        phaseTimer: 0,
        phaseDuration: level.phaseDuration || 10000,
        puzzleShards: level.puzzleShards ? level.puzzleShards.map((shard) => ({ ...shard })) : [],
        puzzlePedestal: level.puzzlePedestal ? { ...level.puzzlePedestal } : null,
        phaseWalls: level.phaseWalls ? level.phaseWalls.map((wall) => ({ ...wall })) : [],
        currentVelocity: { x: 0, y: 0 },
        targetVelocity: { x: 0, y: 0 },
        keysPressed: new Set(),
        isWalking: false,
      });
    },

    startFromLevel: (levelIndex: number) => {
      if (levelIndex < 0 || levelIndex >= LEVELS.length) {
        return; // Invalid level index
      }
      
      const level = LEVELS[levelIndex];
      set({
        currentLevel: levelIndex,
        gameState: "playing",
        player: {
          position: { ...level.player },
          size: { width: 25, height: 25 },
          speed: PLAYER_SPEED,
          hasKey: false,
        },
        snakes: level.snakes.map((snake) => ({ ...snake })),
        walls: level.walls.map((wall) => ({ ...wall })),
        door: { ...level.door },
        key: { ...level.key },
        switches: level.switches ? level.switches.map((s) => ({ ...s })) : [],
        throwableItems: level.throwableItems
          ? level.throwableItems.map((item) => ({ ...item }))
          : [],
        patternTiles: level.patternTiles ? level.patternTiles.map((tile) => ({ ...tile })) : [],
        patternSequence: level.patternSequence ? [...level.patternSequence] : [],
        currentPatternStep: 0,
        carriedItem: null,
        levelSize: { ...level.size },
        mirrors: level.mirrors ? level.mirrors.map((mirror) => ({ ...mirror })) : [],
        crystal: level.crystal ? { ...level.crystal } : null,
        lightSource: level.lightSource ? { ...level.lightSource } : null,
        lightBeam: null,
        projectiles: [],
        teleporters: level.teleporters ? level.teleporters.map((teleporter) => ({ ...teleporter })) : [],
        // Phase system initialization  
        currentPhase: level.currentPhase || 'A',
        phaseTimer: 0,
        phaseDuration: level.phaseDuration || 10000,
        puzzleShards: level.puzzleShards ? level.puzzleShards.map((shard) => ({ ...shard })) : [],
        puzzlePedestal: level.puzzlePedestal ? { ...level.puzzlePedestal } : null,
        phaseWalls: level.phaseWalls ? level.phaseWalls.map((wall) => ({ ...wall })) : [],
        currentVelocity: { x: 0, y: 0 },
        targetVelocity: { x: 0, y: 0 },
        keysPressed: new Set(),
        isWalking: false,
      });
    },

    resetGame: () => {
      const state = get();
      const level = LEVELS[state.currentLevel];
      set({
        gameState: "playing",
        player: {
          position: { ...level.player },
          size: { width: 25, height: 25 },
          speed: PLAYER_SPEED,
          hasKey: false,
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
        mirrors: level.mirrors ? level.mirrors.map((mirror) => ({ ...mirror })) : [],
        crystal: level.crystal ? { ...level.crystal } : null,
        lightSource: level.lightSource ? { ...level.lightSource } : null,
        lightBeam: null,
        projectiles: [],
        teleporters: level.teleporters ? level.teleporters.map((teleporter) => ({ ...teleporter })) : [],
        // Phase system reset
        currentPhase: level.currentPhase || 'A',
        phaseTimer: 0,
        phaseDuration: level.phaseDuration || 10000,
        puzzleShards: level.puzzleShards ? level.puzzleShards.map((shard) => ({ ...shard })) : [],
        puzzlePedestal: level.puzzlePedestal ? { ...level.puzzlePedestal } : null,
        phaseWalls: level.phaseWalls ? level.phaseWalls.map((wall) => ({ ...wall })) : [],
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
      set({
        currentLevel: nextLevelIndex,
        gameState: "playing",
        player: {
          position: { ...level.player },
          size: { width: 25, height: 25 },
          speed: PLAYER_SPEED,
          hasKey: false,
        },
        snakes: level.snakes.map((snake) => ({ ...snake })),
        walls: level.walls.map((wall) => ({ ...wall })),
        door: { ...level.door },
        key: { ...level.key },
        switches: level.switches ? level.switches.map((s) => ({ ...s })) : [],
        throwableItems: level.throwableItems
          ? level.throwableItems.map((item) => ({ ...item }))
          : [],
        patternTiles: level.patternTiles ? level.patternTiles.map((tile) => ({ ...tile })) : [],
        patternSequence: level.patternSequence ? [...level.patternSequence] : [],
        currentPatternStep: 0,
        carriedItem: null,
        levelSize: { ...level.size },
        mirrors: level.mirrors ? level.mirrors.map((mirror) => ({ ...mirror })) : [],
        crystal: level.crystal ? { ...level.crystal } : null,
        lightSource: level.lightSource ? { ...level.lightSource } : null,
        lightBeam: null,
        teleporters: level.teleporters ? level.teleporters.map((teleporter) => ({ ...teleporter })) : [],
        currentVelocity: { x: 0, y: 0 },
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

      const canMoveX =
        newPlayerPosition.x >= 0 &&
        newPlayerPosition.x + state.player.size.width <=
          state.levelSize.width &&
        !get().getCurrentWalls().some((wall) => checkAABBCollision(testXPosition, wall));

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

      const canMoveY =
        newPlayerPosition.y >= 0 &&
        newPlayerPosition.y + state.player.size.height <=
          state.levelSize.height &&
        !get().getCurrentWalls().some((wall) => checkAABBCollision(testYPosition, wall));

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
      const isMoving = (newVelocity.x !== 0 || newVelocity.y !== 0);
      if (isMoving && !state.isWalking) { // Player makes sound when moving normally (not walking stealthily)
        playerSounds.push(updatedPlayer.position);
      }
      
      const currentWalls = get().getCurrentWalls();
      const updatedSnakes = state.snakes.map((snake) =>
        updateSnake(snake, currentWalls, deltaTime, updatedPlayer, playerSounds, state),
      );

      // Handle plumber snake tile rotations
      let updatedPatternTilesFromRotation = state.patternTiles;
      updatedSnakes.forEach(snake => {
        if (snake.type === 'plumber' && snake.tileToRotate) {
          // Check if the tile is locked (flow has passed through it)
          const isLocked = state.flowState && state.flowState.lockedTiles.includes(snake.tileToRotate);
          
          if (!isLocked) {
            const tileIndex = updatedPatternTilesFromRotation.findIndex(t => t.id === snake.tileToRotate);
            if (tileIndex !== -1) {
              const currentRotation = updatedPatternTilesFromRotation[tileIndex].rotation || 0;
              const newRotation = (currentRotation + 90) % 360;
              updatedPatternTilesFromRotation = updatedPatternTilesFromRotation.map((tile, index) =>
                index === tileIndex ? { ...tile, rotation: newRotation } : tile
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

      const hitBySnake = updatedSnakes.some((snake) => {
        const snakeRect = {
          x: snake.position.x,
          y: snake.position.y,
          width: snake.size.width,
          height: snake.size.height,
        };
        return checkAABBCollision(playerRect, snakeRect);
      });

      if (hitBySnake) {
        set({ gameState: "gameOver" });
        return;
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
      state.puzzleShards.forEach(shard => {
        if (!shard.collected && shard.phase === state.currentPhase && 
            checkAABBCollision(playerRect, shard)) {
          get().collectPuzzleShard(shard.id);
        }
      });

      // Check teleporter collisions
      const teleportResult = get().checkTeleporterCollision();
      if (teleportResult) {
        // Player is being teleported - update position and teleporter state
        updatedPlayer = {
          ...updatedPlayer,
          position: teleportResult.targetPosition
        };
        // The teleporter state will be updated in the main set() call below
        set({ teleporters: teleportResult.teleporters });
      }

      // Check switch interactions
      let updatedSwitches = state.switches.map((switchObj) => {
        // Regular switch logic (for switch1)
        if (switchObj.id === 'switch1') {
          if (checkAABBCollision(playerRect, switchObj)) {
            return { ...switchObj, isPressed: true };
          }
          return switchObj;
        }

        // Pressure plate logic (for pressure1, pressure2, pressure3)
        if (switchObj.id.startsWith('pressure')) {
          let isPressed = false;
          
          // Check if player is on the pressure plate
          if (checkAABBCollision(playerRect, switchObj)) {
            isPressed = true;
          }
          
          // Check if any of the special items are on the pressure plate
          for (const item of updatedThrowableItems) {
            if (!item.isPickedUp && !item.isThrown && 
                ['chubbs_hand', 'elis_hip', 'barbra_hat'].includes(item.type)) {
              const itemRect = { x: item.x, y: item.y, width: item.width, height: item.height };
              if (checkAABBCollision(itemRect, switchObj)) {
                isPressed = true;
                break;
              }
            }
          }
          
          return { ...switchObj, isPressed };
        }

        // Lever switch logic (for light_switch) - handled in toggleLightSwitch function
        if (switchObj.switchType === 'lever') {
          return switchObj; // State changes only on E key press
        }
        
        return switchObj;
      });

      // Check pattern tile interactions (use tiles with rotations if available)
      let updatedPatternTiles = updatedPatternTilesFromRotation.length > 0 ? [...updatedPatternTilesFromRotation] : [...state.patternTiles];
      let updatedCurrentPatternStep = state.currentPatternStep;
      let shouldOpenKeyRoom = false;

      // Check if player is stepping on any pattern tile
      for (const tile of updatedPatternTiles) {
        if (checkAABBCollision(playerRect, tile) && !tile.hasBeenActivated) {
          // Mark this tile as activated
          const tileIndex = updatedPatternTiles.findIndex(t => t.id === tile.id);
          updatedPatternTiles[tileIndex] = { ...tile, hasBeenActivated: true };
          
          // Check if this is the correct next tile in the sequence
          if (state.patternSequence[updatedCurrentPatternStep] === tile.sequenceIndex) {
            updatedCurrentPatternStep++;
            
            // If we've completed the sequence, open the key room
            if (updatedCurrentPatternStep >= state.patternSequence.length) {
              shouldOpenKeyRoom = true;
              // Start the pattern demonstration again
              updatedPatternTiles = updatedPatternTiles.map(t => ({ ...t, isGlowing: false }));
            }
          } else {
            // Wrong tile pressed, reset the pattern
            updatedCurrentPatternStep = 0;
            updatedPatternTiles = updatedPatternTiles.map(t => ({ 
              ...t, 
              hasBeenActivated: false,
              isGlowing: false 
            }));
          }
          break;
        }
      }

      // Handle pattern demonstration (make tiles glow in sequence)
      if (state.patternTiles.length > 0 && !shouldOpenKeyRoom) {
        const currentTime = Date.now();
        const demonstrationInterval = 1000; // 1 second between each tile
        const cycleTime = state.patternSequence.length * demonstrationInterval + 2000; // 2 second pause
        const timeInCycle = currentTime % cycleTime;
        
        if (timeInCycle < state.patternSequence.length * demonstrationInterval) {
          const currentDemoStep = Math.floor(timeInCycle / demonstrationInterval);
          const targetSequenceIndex = state.patternSequence[currentDemoStep];
          
          updatedPatternTiles = updatedPatternTiles.map(tile => ({
            ...tile,
            isGlowing: tile.sequenceIndex === targetSequenceIndex
          }));
        } else {
          // Pause period - no tiles glowing
          updatedPatternTiles = updatedPatternTiles.map(tile => ({
            ...tile,
            isGlowing: false
          }));
        }
      }

      // Open key room if pattern completed
      if (shouldOpenKeyRoom) {
        // Remove the left wall of the key room to allow access
        const keyRoomWalls = state.walls.filter(wall => 
          !(wall.x === 600 && wall.y === 290 && wall.width === 20 && wall.height === 40)
        );
        set({ walls: keyRoomWalls });
      }

      // Handle key room wall for level 2 pressure plates
      if (state.currentLevel === 1) { // Level 2 (0-indexed)
        const pressurePlates = updatedSwitches.filter(s => s.id.startsWith('pressure'));
        const allPressurePlatesActive = pressurePlates.length === 3 && pressurePlates.every(p => p.isPressed);
        
        // Check if the key room wall exists
        const keyRoomWallExists = state.walls.some(wall => 
          wall.x === 620 && wall.y === 320 && wall.width === 20 && wall.height === 80
        );
        
        if (allPressurePlatesActive && keyRoomWallExists) {
          // Remove the left wall of the key room
          const newWalls = state.walls.filter(wall => 
            !(wall.x === 620 && wall.y === 320 && wall.width === 20 && wall.height === 80)
          );
          set({ walls: newWalls });
        } else if (!allPressurePlatesActive && !keyRoomWallExists) {
          // Add the left wall back if not all pressure plates are active
          const newWalls = [...state.walls, { x: 620, y: 320, width: 20, height: 80 }];
          set({ walls: newWalls });
        }
      }

      // Handle Level 5 progressive wall removal switches
      if (state.currentLevel === 4) { // Level 5 (0-indexed)
        const middleSwitch = updatedSwitches.find(s => s.id === 'middle_switch');
        const innerSwitch = updatedSwitches.find(s => s.id === 'inner_switch');
        
        // Check if middle switch is pressed - remove middle rectangle walls
        if (middleSwitch && middleSwitch.isPressed) {
          const middleWallsExist = state.walls.some(wall => 
            (wall.x === 100 && wall.y === 75) || // Top middle wall
            (wall.x === 100 && wall.y === 505) || // Bottom middle wall
            (wall.x === 100 && wall.y === 75 && wall.width === 20) || // Left middle wall
            (wall.x === 680 && wall.y === 75) // Right middle wall
          );
          
          if (middleWallsExist) {
            // Remove all middle rectangle walls
            const newWalls = state.walls.filter(wall => 
              !(
                (wall.x === 100 && wall.y === 75 && wall.width === 600 && wall.height === 20) || // Top middle
                (wall.x === 100 && wall.y === 505 && wall.width === 600 && wall.height === 20) || // Bottom middle
                (wall.x === 100 && wall.y === 75 && wall.width === 20 && wall.height === 450) || // Left middle
                (wall.x === 680 && wall.y === 75 && wall.width === 20 && wall.height === 450) // Right middle
              )
            );
            set({ walls: newWalls });
          }
        }
        
        // Check if inner switch is pressed - remove inner rectangle walls
        if (innerSwitch && innerSwitch.isPressed) {
          const innerWallsExist = state.walls.some(wall => 
            (wall.x === 200 && wall.y === 150) || // Top inner wall
            (wall.x === 200 && wall.y === 430) || // Bottom inner wall
            (wall.x === 200 && wall.y === 150 && wall.width === 20) || // Left inner wall
            (wall.x === 580 && wall.y === 150) // Right inner wall
          );
          
          if (innerWallsExist) {
            // Remove all inner rectangle walls
            const newWalls = state.walls.filter(wall => 
              !(
                (wall.x === 200 && wall.y === 150 && wall.width === 400 && wall.height === 20) || // Top inner
                (wall.x === 200 && wall.y === 430 && wall.width === 400 && wall.height === 20) || // Bottom inner
                (wall.x === 200 && wall.y === 150 && wall.width === 20 && wall.height === 300) || // Left inner
                (wall.x === 580 && wall.y === 150 && wall.width === 20 && wall.height === 300) // Right inner
              )
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
          state.walls
        );
        
        // Update mirrors based on light beam
        updatedMirrors = state.mirrors.map(mirror => ({
          ...mirror,
          isReflecting: updatedLightBeam ? 
            updatedLightBeam.segments.some((segment, index) => {
              if (index === 0) return false; // Skip first segment (light source)
              const prevSegment = updatedLightBeam.segments[index - 1];
              return lineIntersectsRect(prevSegment, segment, mirror);
            }) : false
        }));
        
        // Update crystal based on light beam
        if (updatedLightBeam) {
          const crystalHit = updatedLightBeam.segments.some((segment, index) => {
            if (index === 0) return false; // Skip first segment (light source)
            const prevSegment = updatedLightBeam.segments[index - 1];
            return lineIntersectsRect(prevSegment, segment, state.crystal!);
          });
          
          updatedCrystal = { ...state.crystal, isActivated: crystalHit };
        }
      }

      // Handle Level 3 crystal activation - remove key room wall
      if (state.currentLevel === 2 && updatedCrystal && updatedCrystal.isActivated) {
        // Check if the key room wall still exists
        const keyRoomWallExists = state.walls.some(wall => 
          wall.x === 650 && wall.y === 250 && wall.width === 20 && wall.height === 120
        );
        
        if (keyRoomWallExists) {
          // Remove the left wall of the key room (x: 650, y: 250, width: 20, height: 120)
          const newWalls = state.walls.filter(wall => 
            !(wall.x === 650 && wall.y === 250 && wall.width === 20 && wall.height === 120)
          );
          set({ walls: newWalls });
        }
      }

      // Check door interaction
      let updatedDoor = state.door;
      const allSwitchesPressed =
        updatedSwitches.length === 0 ||
        updatedSwitches.every((s) => s.isPressed);

      // Level 3 (light reflection puzzle) - player must have key and crystal must be activated
      if (state.currentLevel === 2 && updatedPlayer.hasKey && updatedCrystal && updatedCrystal.isActivated) {
        updatedDoor = { ...state.door, isOpen: true };
      } 
      // Level 5 (logic gate puzzle) - player only needs the key
      else if (state.currentLevel === 4 && updatedPlayer.hasKey) {
        updatedDoor = { ...state.door, isOpen: true };
      }
      // Other levels - player must have key and all switches pressed
      else if (state.currentLevel !== 2 && state.currentLevel !== 4 && updatedPlayer.hasKey && allSwitchesPressed) {
        updatedDoor = { ...state.door, isOpen: true };
      }

      // Check exit
      if (updatedDoor.isOpen && checkAABBCollision(playerRect, updatedDoor)) {
        set({ gameState: "levelComplete" });
        return;
      }

      // --- PROJECTILE SYSTEM ---
      // Update projectiles and spitter snake firing
      get().updateProjectiles(deltaTime);

      // --- UPDATE STATE ---
      set({
        currentVelocity: newVelocity, // Use the updated velocity that includes wall collision resets
        snakes: updatedSnakes,
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
      const nonThrowableTypes = ['chubbs_hand', 'elis_hip', 'barbra_hat'];
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
      const nearbyItems = state.throwableItems.filter(item => {
        if (item.isPickedUp) return false;
        
        const distance = Math.sqrt(
          Math.pow(state.player.position.x - item.x, 2) + 
          Math.pow(state.player.position.y - item.y, 2)
        );
        return distance < 50; // Pickup range
      });

      if (nearbyItems.length === 0) return;

      // Find the closest item
      const closestItem = nearbyItems.reduce((closest, item) => {
        const closestDistance = Math.sqrt(
          Math.pow(state.player.position.x - closest.x, 2) + 
          Math.pow(state.player.position.y - closest.y, 2)
        );
        const itemDistance = Math.sqrt(
          Math.pow(state.player.position.x - item.x, 2) + 
          Math.pow(state.player.position.y - item.y, 2)
        );
        return itemDistance < closestDistance ? item : closest;
      });

      // Use the existing pickupItem function
      get().pickupItem(closestItem.id);
    },

    rotateMirror: (direction: 'clockwise' | 'counterclockwise') => {
      const state = get();
      if (state.gameState !== 'playing' || state.currentLevel !== 2) return; // Only on level 3 (0-indexed)

      // Find mirror within interaction range
      const nearbyMirror = state.mirrors.find(mirror => {
        const distance = Math.sqrt(
          Math.pow(state.player.position.x - (mirror.x + mirror.width / 2), 2) + 
          Math.pow(state.player.position.y - (mirror.y + mirror.height / 2), 2)
        );
        return distance < 60; // Interaction range
      });

      if (!nearbyMirror) return;

      // Calculate rotation change based on direction (1-degree increments)
      const rotationChange = direction === 'clockwise' ? 1 : -1;

      // Update mirror rotation
      set({
        mirrors: state.mirrors.map(mirror => 
          mirror.id === nearbyMirror.id 
            ? { ...mirror, rotation: (mirror.rotation + rotationChange + 360) % 360 }
            : mirror
        )
      });
    },

    rotateLightSource: (direction: 'clockwise' | 'counterclockwise') => {
      const state = get();
      if (state.gameState !== 'playing' || state.currentLevel !== 2 || !state.lightSource) return; // Only on level 3 (0-indexed)

      // Check if player is near light source
      const distance = Math.sqrt(
        Math.pow(state.player.position.x - state.lightSource.x, 2) + 
        Math.pow(state.player.position.y - state.lightSource.y, 2)
      );

      if (distance > 60) return; // Must be within interaction range

      // Calculate rotation change based on direction (1-degree increments)
      const rotationChange = direction === 'clockwise' ? 1 : -1;

      // Update light source rotation
      set({
        lightSource: {
          ...state.lightSource,
          rotation: (state.lightSource.rotation + rotationChange + 360) % 360
        }
      });
    },

    startFlow: () => {
      const state = get();
      if (state.currentLevel !== 3) return; // Only on level 4 (0-indexed)
      
      // Get dynamic start tile position
      const currentLevel = state.levels[state.currentLevel];
      const startTilePos = currentLevel.startTilePos;
      const startTileId = startTilePos ? `grid_tile_${startTilePos.row}_${startTilePos.col}` : 'grid_tile_3_0';
      
      set({
        flowState: {
          isActive: true,
          currentTile: startTileId,
          currentPhase: 'entry-to-center',
          entryDirection: null,
          exitDirection: 'east',
          progress: 0,
          phaseStartTime: Date.now(),
          phaseDuration: 500, // 0.5 second per phase (doubled speed)
          lastPosition: undefined,
          isBlocked: false,
          lockedTiles: [startTileId], // Lock the starting tile immediately
          completedPaths: [], // Clear previous paths when starting new flow
          emptyingPaths: [],
          isEmptying: false,
          emptyingFromTile: undefined
        }
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
          progress
        }
      });
      
      // Check if phase is complete
      if (progress >= 1) {
        if (state.flowState.currentPhase === 'entry-to-center') {
          // Move to center-to-exit phase
          set({
            flowState: {
              ...state.flowState,
              currentPhase: 'center-to-exit',
              progress: 0,
              phaseStartTime: currentTime
            }
          });
        } else if (state.flowState.currentPhase === 'center-to-exit') {
          // Handle emptying mode or regular flow
          if (state.flowState.isEmptying) {
            // Emptying mode: remove the current tile from locked tiles and completed paths
            const newLockedTiles = state.flowState.lockedTiles.filter(tileId => tileId !== state.flowState.currentTile);
            const newCompletedPaths = state.flowState.completedPaths.filter(path => path.tileId !== state.flowState.currentTile);
            
            // Remove the current tile from emptying paths to prevent infinite loops
            const newEmptyingPaths = state.flowState.emptyingPaths.filter(path => path.tileId !== state.flowState.currentTile);
            
            // Find next tile in remaining emptying paths
            const currentPath = state.flowState.emptyingPaths.find(path => path.tileId === state.flowState.currentTile);
            if (currentPath && currentPath.exitDirection && newEmptyingPaths.length > 0) {
              const nextTile = get().getNextTile(state.flowState.currentTile, currentPath.exitDirection);
              const nextPath = newEmptyingPaths.find(path => path.tileId === nextTile?.id);
              
              if (nextTile && nextPath) {
                // Move to next tile
                set({
                  flowState: {
                    ...state.flowState,
                    currentTile: nextTile.id,
                    entryDirection: nextPath.entryDirection,
                    exitDirection: nextPath.exitDirection,
                    currentPhase: 'entry-to-center',
                    progress: 0,
                    phaseStartTime: currentTime,
                    lockedTiles: newLockedTiles,
                    completedPaths: newCompletedPaths,
                    emptyingPaths: newEmptyingPaths
                  }
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
                      currentPhase: 'entry-to-center',
                      progress: 0,
                      phaseStartTime: currentTime,
                      lockedTiles: newLockedTiles,
                      completedPaths: newCompletedPaths,
                      emptyingPaths: newEmptyingPaths
                    }
                  });
                } else {
                  // Emptying complete
                  set({
                    flowState: {
                      isActive: false,
                      currentPhase: 'entry-to-center',
                      isEmptying: false,
                      currentTile: '',
                      entryDirection: null,
                      exitDirection: null,
                      progress: 0,
                      phaseStartTime: 0,
                      phaseDuration: 400,
                      completedPaths: [],
                      emptyingPaths: [],
                      lastPosition: undefined,
                      isBlocked: false,
                      lockedTiles: []
                    }
                  });
                }
              }
            } else {
              // No more emptying paths - complete the emptying process
              set({
                flowState: {
                  isActive: false,
                  currentPhase: 'entry-to-center',
                  isEmptying: false,
                  currentTile: '',
                  entryDirection: null,
                  exitDirection: null,
                  progress: 0,
                  phaseStartTime: 0,
                  phaseDuration: 400,
                  completedPaths: [],
                  emptyingPaths: [],
                  lastPosition: undefined,
                  isBlocked: false,
                  lockedTiles: []
                }
              });
            }
          } else if (state.flowState.currentTile === (state.levels[state.currentLevel].endTilePos ? `grid_tile_${state.levels[state.currentLevel].endTilePos!.row}_${state.levels[state.currentLevel].endTilePos!.col}` : 'grid_tile_6_7')) {
            // Add final tile to completed paths
            const finalPath = {
              tileId: state.flowState.currentTile,
              entryDirection: state.flowState.entryDirection,
              exitDirection: state.flowState.exitDirection
            };
            
            // Flow completed successfully - remove key walls immediately when animation reaches ending tile
            get().removeKeyWalls();
            
            // Wait 500ms before starting emptying process
            setTimeout(() => {
              const currentState = get();
              if (currentState.flowState) {
                const allPaths = [...currentState.flowState.completedPaths, finalPath];
                const currentLevel = currentState.levels[currentState.currentLevel];
                const startTilePos = currentLevel.startTilePos;
                const startTileId = startTilePos ? `grid_tile_${startTilePos.row}_${startTilePos.col}` : 'grid_tile_3_0';
                
                set({
                  flowState: {
                    ...currentState.flowState,
                    isActive: true,
                    currentPhase: 'entry-to-center', // Reuse filling animation
                    isEmptying: true,
                    currentTile: startTileId, // Start from beginning
                    entryDirection: null,
                    exitDirection: 'east',
                    progress: 0,
                    phaseStartTime: Date.now(),
                    phaseDuration: 400,
                    emptyingPaths: allPaths,
                    completedPaths: allPaths // Keep completed paths initially, remove as emptying progresses
                  }
                });
              }
            }, 500);
            
            set({
              flowState: {
                ...state.flowState,
                isActive: false,
                isEmptying: true, // Set isEmptying immediately to prevent new flows during the 2-second delay
                completedPaths: [...state.flowState.completedPaths, finalPath]
              }
            });
          } else {
            // Move to next tile
            const nextTile = get().getNextTile(state.flowState.currentTile, state.flowState.exitDirection!);
            if (nextTile) {
              const newEntryDirection = get().getOppositeDirection(state.flowState.exitDirection!);
              const newExitDirection = get().calculateExitDirection(nextTile.id, newEntryDirection);
              
              // Check if the next tile actually has a compatible direction
              const nextTileDirections = get().getTileDirections(nextTile.id);
              if (nextTileDirections.includes(newEntryDirection)) {
                // Add current tile to completed paths when exiting it
                const currentCompletedPath = {
                  tileId: state.flowState.currentTile,
                  entryDirection: state.flowState.entryDirection,
                  exitDirection: state.flowState.exitDirection
                };
                
                // Lock the next tile immediately when flow enters it
                const newLockedTiles = state.flowState.lockedTiles.includes(nextTile.id) 
                  ? state.flowState.lockedTiles 
                  : [...state.flowState.lockedTiles, nextTile.id];
                
                set({
                  flowState: {
                    ...state.flowState,
                    currentTile: nextTile.id,
                    currentPhase: 'entry-to-center',
                    entryDirection: newEntryDirection,
                    exitDirection: newExitDirection,
                    progress: 0,
                    phaseStartTime: currentTime,
                    lockedTiles: newLockedTiles,
                    completedPaths: [...state.flowState.completedPaths, currentCompletedPath]
                  }
                });
              } else {
                // Flow blocked - incompatible connection
                // Add current tile to completed paths before blocking
                const completedPath = {
                  tileId: state.flowState.currentTile,
                  entryDirection: state.flowState.entryDirection,
                  exitDirection: state.flowState.exitDirection
                };
                
                // Show blocked indicator on the tile we couldn't reach
                const blockedPosition = nextTile ? {
                  x: nextTile.x + nextTile.width / 2,
                  y: nextTile.y + nextTile.height / 2
                } : undefined;
                
                // Spawn spitter snake at blocked position
                if (blockedPosition) {
                  get().spawnSpitterSnake(blockedPosition);
                }
                
                // Wait 500ms before starting emptying process for blocked flow
                setTimeout(() => {
                  const currentState = get();
                  if (currentState.flowState) {
                    const allPaths = [...currentState.flowState.completedPaths, completedPath];
                    const currentLevel = currentState.levels[currentState.currentLevel];
                    const startTilePos = currentLevel.startTilePos;
                    const startTileId = startTilePos ? `grid_tile_${startTilePos.row}_${startTilePos.col}` : 'grid_tile_3_0';
                    
                    set({
                      flowState: {
                        ...currentState.flowState,
                        isActive: true,
                        currentPhase: 'entry-to-center', // Reuse filling animation
                        isEmptying: true,
                        currentTile: startTileId, // Start from beginning
                        entryDirection: null,
                        exitDirection: 'east',
                        progress: 0,
                        phaseStartTime: Date.now(),
                        phaseDuration: 400,
                        emptyingPaths: allPaths,
                        completedPaths: allPaths, // Keep completed paths initially, remove as emptying progresses
                        // Preserve blocked state during emptying
                        isBlocked: currentState.flowState.isBlocked,
                        lastPosition: currentState.flowState.lastPosition
                      }
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
                    completedPaths: [...state.flowState.completedPaths, completedPath]
                  }
                });
              }
            } else {
              // Flow ended unexpectedly - no tile found (edge of grid)
              // Add current tile to completed paths before ending
              const completedPath = {
                tileId: state.flowState.currentTile,
                entryDirection: state.flowState.entryDirection,
                exitDirection: state.flowState.exitDirection
              };
              
              // Calculate where the blocked tile would be based on exit direction
              const currentTileObj = state.patternTiles.find(tile => tile.id === state.flowState.currentTile);
              let blockedPosition;
              
              if (currentTileObj && state.flowState.exitDirection) {
                const tileSize = 60; // Based on Level 4 tile size
                let offsetX = 0, offsetY = 0;
                
                switch (state.flowState.exitDirection) {
                  case 'north': offsetY = -tileSize; break;
                  case 'south': offsetY = tileSize; break;
                  case 'east': offsetX = tileSize; break;
                  case 'west': offsetX = -tileSize; break;
                }
                
                blockedPosition = {
                  x: currentTileObj.x + currentTileObj.width / 2 + offsetX,
                  y: currentTileObj.y + currentTileObj.height / 2 + offsetY
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
                  const allPaths = [...currentState.flowState.completedPaths, completedPath];
                  const currentLevel = currentState.levels[currentState.currentLevel];
                  const startTilePos = currentLevel.startTilePos;
                  const startTileId = startTilePos ? `grid_tile_${startTilePos.row}_${startTilePos.col}` : 'grid_tile_3_0';
                  
                  set({
                    flowState: {
                      ...currentState.flowState,
                      isActive: true,
                      currentPhase: 'entry-to-center', // Reuse filling animation
                      isEmptying: true,
                      currentTile: startTileId, // Start from beginning
                      entryDirection: null,
                      exitDirection: 'east',
                      progress: 0,
                      phaseStartTime: Date.now(),
                      phaseDuration: 400,
                      emptyingPaths: allPaths,
                      completedPaths: allPaths, // Keep completed paths initially, remove as emptying progresses
                      // Preserve blocked state during emptying
                      isBlocked: currentState.flowState.isBlocked,
                      lastPosition: currentState.flowState.lastPosition
                    }
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
                  completedPaths: [...state.flowState.completedPaths, completedPath]
                }
              });
            }
          }
        }
      }
    },

    getNextTile: (currentTileId: string, exitDirection: 'north' | 'south' | 'east' | 'west') => {
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
        case 'north': nextRow--; break;
        case 'south': nextRow++; break;
        case 'east': nextCol++; break;
        case 'west': nextCol--; break;
      }
      
      // Check bounds
      if (nextRow < 0 || nextRow >= 8 || nextCol < 0 || nextCol >= 8) {
        return null;
      }
      
      const nextTileId = `grid_tile_${nextRow}_${nextCol}`;
      const nextTile = state.patternTiles.find(tile => tile.id === nextTileId) || null;
      
      return nextTile;
    },

    getOppositeDirection: (direction: 'north' | 'south' | 'east' | 'west') => {
      const opposites = {
        north: 'south' as const,
        south: 'north' as const,
        east: 'west' as const,
        west: 'east' as const
      };
      return opposites[direction];
    },

    calculateExitDirection: (tileId: string, entryDirection: 'north' | 'south' | 'east' | 'west') => {
      // For now, simple logic - if tile has opposite direction, flow to opposite
      // Otherwise, flow to first available direction that's not the entry
      const availableDirections = get().getTileDirections(tileId);
      const opposite = get().getOppositeDirection(entryDirection);
      
      if (availableDirections.includes(opposite)) {
        return opposite;
      }
      
      // Find first available direction that's not the entry
      return availableDirections.find(dir => dir !== entryDirection) || null;
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
      if (startTilePos && row === startTilePos.row && col === startTilePos.col) {
        return ['east' as const];
      }
      
      // Ending square (random row, column 7) only has west
      if (endTilePos && row === endTilePos.row && col === endTilePos.col) {
        return ['west' as const];
      }
      
      // For other squares, show exactly 2 directions
      const seed = row * 8 + col;
      
      let directions: Array<'north' | 'south' | 'east' | 'west'> = ['north', 'south', 'east', 'west'];
      
      // Shuffle directions deterministically
      for (let i = directions.length - 1; i > 0; i--) {
        const j = Math.floor(((seed * (i + 13)) % 100) / 100 * (i + 1));
        [directions[i], directions[j]] = [directions[j], directions[i]];
      }
      
      // Take exactly 2 directions
      directions = directions.slice(0, 2);
      
      // Apply tile rotation
      const tile = state.patternTiles.find(t => t.id === tileId);
      if (tile && tile.rotation) {
        const rotationSteps = tile.rotation / 90;
        const rotatedDirections = directions.map(dir => {
          const directionOrder = ['north', 'east', 'south', 'west'] as const;
          const currentIndex = directionOrder.indexOf(dir);
          const newIndex = (currentIndex + rotationSteps + 4) % 4;
          return directionOrder[newIndex];
        });
        return rotatedDirections;
      }
      
      return directions;
    },

    rotateTile: (direction: 'left' | 'right') => {
      const state = get();
      if (state.currentLevel !== 3) return; // Only on level 4 (0-indexed)
      
      // Find the tile the player is standing on
      const playerRect = {
        x: state.player.position.x,
        y: state.player.position.y,
        width: state.player.size.width,
        height: state.player.size.height,
      };
      
      const currentTile = state.patternTiles.find(tile => {
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
      const startTileId = startTilePos ? `grid_tile_${startTilePos.row}_${startTilePos.col}` : 'grid_tile_3_0';
      const endTileId = endTilePos ? `grid_tile_${endTilePos.row}_${endTilePos.col}` : 'grid_tile_6_7';
      
      if (currentTile.id === startTileId || currentTile.id === endTileId) {
        return;
      }
      
      // Check if this tile is locked (flow has entered it)
      if (state.flowState && state.flowState.lockedTiles.includes(currentTile.id)) {
        console.log(`Tile ${currentTile.id} is locked - flow has passed through it`);
        return; // Tile is locked, cannot rotate
      }
      
      // Calculate new rotation
      const rotationChange = direction === 'left' ? -90 : 90;
      const newRotation = ((currentTile.rotation || 0) + rotationChange + 360) % 360;
      
      // Update tile rotation
      set({
        patternTiles: state.patternTiles.map(tile => 
          tile.id === currentTile.id 
            ? { ...tile, rotation: newRotation }
            : tile
        )
      });
    },

    checkPathConnection: () => {
      const state = get();
      if (state.currentLevel !== 3) return false; // Only on level 4 (0-indexed)
      
      // Get dynamic start and end tile positions
      const currentLevel = state.levels[state.currentLevel];
      const startTilePos = currentLevel.startTilePos;
      const endTilePos = currentLevel.endTilePos;
      const startTileId = startTilePos ? `grid_tile_${startTilePos.row}_${startTilePos.col}` : 'grid_tile_3_0';
      const endTileId = endTilePos ? `grid_tile_${endTilePos.row}_${endTilePos.col}` : 'grid_tile_6_7';
      
      // Path connection check started
      
      // Always start flow visualization to show the attempted path
      get().startFlow();
      
      const visited = new Set<string>();
      const queue = [{ tileId: startTileId, entryDirection: null as null | 'north' | 'south' | 'east' | 'west' }];
      
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
            queue.push({ tileId: nextTile.id, entryDirection: requiredDirection });
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
        { x: 660, y: 40, width: 100, height: 20 }, // top wall
        { x: 660, y: 120, width: 100, height: 20 }, // bottom wall
        { x: 660, y: 50, width: 20, height: 70 }, // left wall
        { x: 740, y: 50, width: 20, height: 70 }, // right wall
      ];
      
      set({
        walls: state.walls.filter(wall => 
          !keyWallIds.some(keyWall => 
            wall.x === keyWall.x && 
            wall.y === keyWall.y && 
            wall.width === keyWall.width && 
            wall.height === keyWall.height
          )
        )
      });
      
      // Key chamber walls removed - path connected from start to end
    },

    // Projectile system functions
    updateProjectiles: (deltaTime: number) => {
      const state = get();
      const currentTime = Date.now();
      

      
      // Update projectile positions and remove expired ones
      const updatedProjectiles = state.projectiles.filter(projectile => {
        const age = currentTime - projectile.createdAt;
        if (age > projectile.lifespan) {
          return false; // Remove expired projectile
        }
        
        // Update position
        projectile.position.x += projectile.velocity.x * deltaTime;
        projectile.position.y += projectile.velocity.y * deltaTime;
        
        // Check collision with player
        if (checkAABBCollision(
          { ...projectile.position, ...projectile.size },
          { ...state.player.position, ...state.player.size }
        )) {
          // Player hit by projectile - game over
          set({ gameState: 'gameOver' });
          return false; // Remove projectile
        }
        
        // Check collision with walls
        for (const wall of state.walls) {
          if (checkAABBCollision(
            { ...projectile.position, ...projectile.size },
            wall
          )) {
            return false; // Remove projectile on wall collision
          }
        }
        
        return true; // Keep projectile
      });
      
      // Check which spitter snakes need to fire
      const snakesToFire: string[] = [];
      const updatedSnakes = state.snakes.map(snake => {
        if (snake.type === 'spitter' && snake.lastFireTime && snake.fireInterval) {
          const timeSinceLastFire = currentTime - snake.lastFireTime;
          
          if (timeSinceLastFire >= snake.fireInterval) {
            snakesToFire.push(snake.id);
            return {
              ...snake,
              lastFireTime: currentTime,
              shotCount: (snake.shotCount || 0) + 1 // Increment shot count
            };
          }
        }
        return snake;
      });

      // Fire projectiles for snakes that need it
      let newProjectilesToAdd: any[] = [];
      snakesToFire.forEach(snakeId => {
        const snake = updatedSnakes.find(s => s.id === snakeId);
        if (snake && snake.type === 'spitter') {
          const projectileSpeed = 0.3; // pixels per ms
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
                { x: 0, y: -1 },   // North
                { x: 1, y: 0 },    // East  
                { x: 0, y: 1 },    // South
                { x: -1, y: 0 },   // West
              ];
            } else {
              // Even shots: diagonal directions (NE, NW, SE, SW)
              directions = [
                { x: 1, y: -1 },   // Northeast
                { x: -1, y: -1 },  // Northwest
                { x: 1, y: 1 },    // Southeast
                { x: -1, y: 1 },   // Southwest
              ];
            }
          } else {
            // Default behavior for other levels: all 8 directions
            directions = [
              { x: 0, y: -1 },   // North
              { x: 1, y: -1 },   // Northeast
              { x: 1, y: 0 },    // East
              { x: 1, y: 1 },    // Southeast
              { x: 0, y: 1 },    // South
              { x: -1, y: 1 },   // Southwest
              { x: -1, y: 0 },   // West
              { x: -1, y: -1 }   // Northwest
            ];
          }
          
          const newProjectiles = directions.map((dir, index) => ({
            id: `${snakeId}_projectile_${Date.now()}_${index}`,
            position: {
              x: snake.position.x + snake.size.width / 2 - projectileSize.width / 2,
              y: snake.position.y + snake.size.height / 2 - projectileSize.height / 2
            },
            velocity: {
              x: dir.x * projectileSpeed,
              y: dir.y * projectileSpeed
            },
            size: projectileSize,
            createdAt: Date.now(),
            lifespan,
            color: '#00ff41' // Neon green
          }));
          
          newProjectilesToAdd = [...newProjectilesToAdd, ...newProjectiles];
        }
      });

      // Combine existing projectiles with new ones
      const allProjectiles = [...updatedProjectiles, ...newProjectilesToAdd];
      
      set({
        projectiles: allProjectiles,
        snakes: updatedSnakes
      });
    },

    spawnSpitterSnake: (position: Position) => {
      const state = get();
      const spitterId = `spitter_${Date.now()}`;
      
      const spitterSnake: Snake = {
        id: spitterId,
        type: 'spitter',
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
        shotCount: 0 // Start at 0 shots
      };
      
      set({
        snakes: [...state.snakes, spitterSnake]
      });
    },

    fireProjectiles: (snakeId: string) => {
      const state = get();
      const snake = state.snakes.find(s => s.id === snakeId);
      if (!snake || snake.type !== 'spitter') return;
      
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
            { x: 0, y: -1 },   // North
            { x: 1, y: 0 },    // East  
            { x: 0, y: 1 },    // South
            { x: -1, y: 0 },   // West
          ];
        } else {
          // Even shots: diagonal directions (NE, NW, SE, SW)
          directions = [
            { x: 1, y: -1 },   // Northeast
            { x: -1, y: -1 },  // Northwest
            { x: 1, y: 1 },    // Southeast
            { x: -1, y: 1 },   // Southwest
          ];
        }
        
        // Update the snake's shot count
        set({
          snakes: state.snakes.map(s => 
            s.id === snakeId ? { ...s, shotCount: newShotCount } : s
          )
        });
      } else {
        // Default behavior for other levels: all 8 directions
        directions = [
          { x: 0, y: -1 },   // North
          { x: 1, y: -1 },   // Northeast
          { x: 1, y: 0 },    // East
          { x: 1, y: 1 },    // Southeast
          { x: 0, y: 1 },    // South
          { x: -1, y: 1 },   // Southwest
          { x: -1, y: 0 },   // West
          { x: -1, y: -1 }   // Northwest
        ];
      }
      
      const newProjectiles = directions.map((dir, index) => ({
        id: `${snakeId}_projectile_${Date.now()}_${index}`,
        position: {
          x: snake.position.x + snake.size.width / 2 - projectileSize.width / 2,
          y: snake.position.y + snake.size.height / 2 - projectileSize.height / 2
        },
        velocity: {
          x: dir.x * projectileSpeed,
          y: dir.y * projectileSpeed
        },
        size: projectileSize,
        createdAt: Date.now(),
        lifespan,
        color: '#00ff41' // Neon green
      }));
      
      set({
        projectiles: [...state.projectiles, ...newProjectiles]
      });
    },

    collectPuzzleShard: (shardId: string) => {
      const state = get();
      const shard = state.puzzleShards.find(s => s.id === shardId);
      
      if (!shard || shard.collected || shard.phase !== state.currentPhase) return;
      
      const updatedShards = state.puzzleShards.map(s => 
        s.id === shardId ? { ...s, collected: true } : s
      );
      
      const collectedCount = updatedShards.filter(s => s.collected).length;
      let updatedPedestal = state.puzzlePedestal;
      
      if (updatedPedestal) {
        updatedPedestal = {
          ...updatedPedestal,
          collectedShards: collectedCount,
          isActivated: collectedCount >= updatedPedestal.requiredShards
        };
        
        // If pedestal is activated, open the door
        if (updatedPedestal.isActivated) {
          set({
            puzzleShards: updatedShards,
            puzzlePedestal: updatedPedestal,
            door: { ...state.door, isOpen: true }
          });
        } else {
          set({
            puzzleShards: updatedShards,
            puzzlePedestal: updatedPedestal
          });
        }
      } else {
        set({ puzzleShards: updatedShards });
      }
    },

    getCurrentWalls: () => {
      const state = get();
      if (state.currentLevel !== 4) return state.walls; // Level 5 is 0-indexed as 4
      
      // Combine regular walls with active phase walls
      const activePhaseWalls = state.phaseWalls
        .filter(wall => wall.activePhases.includes(state.currentPhase))
        .map(wall => ({ x: wall.x, y: wall.y, width: wall.width, height: wall.height }));
      
      return [...state.walls, ...activePhaseWalls];
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
        if (teleporter.type === 'sender') {
          const isPlayerOnPad = checkAABBCollision(playerRect, teleporter);
          
          // Check if teleporter is in cooldown period
          const isInCooldown = teleporter.lastTeleportTime && currentTime < teleporter.lastTeleportTime;
          
          if (isPlayerOnPad && !isInCooldown) {
            // Player is on the pad
            if (!teleporter.isActive) {
              // Start activation
              updatedTeleporters[index] = {
                ...teleporter,
                isActive: true,
                activationStartTime: currentTime
              };
            } else {
              // Check if enough time has passed (1 second)
              const timeOnPad = currentTime - (teleporter.activationStartTime || currentTime);
              if (timeOnPad >= 1000) {
                // Ready to teleport - find the linked receiver
                const receiver = state.teleporters.find(t => 
                  t.type === 'receiver' && t.id === teleporter.linkedTeleporterId
                );
                if (receiver) {
                  const teleportCooldownTime = currentTime + 500; // 500ms cooldown
                  teleportInfo = { 
                    targetPosition: { x: receiver.x, y: receiver.y },
                    teleporters: updatedTeleporters.map((t, idx) => 
                      idx === index ? { 
                        ...t, 
                        isActive: false, 
                        activationStartTime: undefined,
                        lastTeleportTime: teleportCooldownTime 
                      } : t
                    )
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
                activationStartTime: undefined
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

    evaluateLogicPuzzle: (switches: any[]) => {
      // Get switch states: ((A XOR B) AND (C AND D)) AND (NOT (E AND F))
      const A = switches.find(s => s.id === 'light_switch')?.isPressed || false;
      const B = switches.find(s => s.id === 'switch_1')?.isPressed || false;  
      const C = switches.find(s => s.id === 'switch_2')?.isPressed || false;
      const D = switches.find(s => s.id === 'switch_3')?.isPressed || false;
      const E = switches.find(s => s.id === 'switch_4')?.isPressed || false;
      const F = switches.find(s => s.id === 'switch_5')?.isPressed || false;

      // Logic evaluation: ((A XOR B) AND (C AND D)) AND (NOT (E AND F))
      const aXorB = (A && !B) || (!A && B); // XOR operation
      const cAndD = C && D; // AND operation
      const eAndF = E && F; // AND operation
      const notEAndF = !eAndF; // NOT operation
      
      const firstPart = aXorB && cAndD; // (A XOR B) AND (C AND D)
      const result = firstPart && notEAndF; // Final result

      console.log(`Logic breakdown: A=${A}, B=${B}, C=${C}, D=${D}, E=${E}, F=${F}`);
      console.log(`A XOR B = ${aXorB}, C AND D = ${cAndD}, E AND F = ${eAndF}, NOT(E AND F) = ${notEAndF}`);
      console.log(`Final result: ((${aXorB}) AND (${cAndD})) AND (${notEAndF}) = ${result}`);

      // Update key walls based on puzzle state
      const state = get();
      const currentWalls = state.walls;
      
      // Define key wall positions for identification
      const keyWallPositions = [
        { x: 710, y: 30, width: 60, height: 20 }, // Top wall
        { x: 710, y: 80, width: 60, height: 20 }, // Bottom wall
        { x: 710, y: 30, width: 20, height: 70 }, // Left wall  
        { x: 750, y: 30, width: 20, height: 70 }  // Right wall
      ];
      
      const isKeyWall = (wall: any) => {
        return keyWallPositions.some(keyWall => 
          wall.x === keyWall.x && wall.y === keyWall.y && 
          wall.width === keyWall.width && wall.height === keyWall.height
        );
      };
      
      let updatedWalls;
      if (result) {
        // Puzzle solved - remove key walls
        updatedWalls = currentWalls.filter(wall => !isKeyWall(wall));
      } else {
        // Puzzle not solved - ensure key walls are present
        const hasKeyWalls = currentWalls.some(wall => isKeyWall(wall));
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
      const nearbyLeverSwitch = state.switches.find(s => 
        s.switchType === 'lever' && checkAABBCollision(playerRect, s)
      );
      
      if (!nearbyLeverSwitch) return;

      // Toggle the switch
      const updatedSwitches = state.switches.map(s => 
        s.id === nearbyLeverSwitch.id ? { ...s, isPressed: !s.isPressed } : s
      );

      // Console log for switch toggles
      const switchNames = {
        'light_switch': 'A (Light Switch)',
        'switch_1': 'B (Switch 1)', 
        'switch_2': 'C (Switch 2)',
        'switch_3': 'D (Switch 3)',
        'switch_4': 'E (Switch 4)',
        'switch_5': 'F (Switch 5)'
      };
      const switchName = switchNames[nearbyLeverSwitch.id as keyof typeof switchNames] || nearbyLeverSwitch.id;
      const newState = !nearbyLeverSwitch.isPressed;
      console.log(`Switch ${switchName} toggled to: ${newState ? 'ON' : 'OFF'}`);

      // Only toggle the light source if it's the main light switch
      let updatedLightSource = state.lightSource;
      if (nearbyLeverSwitch.id === 'light_switch') {
        updatedLightSource = state.lightSource ? {
          ...state.lightSource,
          isOn: !state.lightSource.isOn
        } : null;
      }

      // Evaluate logic puzzle and update key walls for Level 5
      if (state.currentLevel === 4) { // Level 5 (0-indexed as 4)
        const puzzleSolved = get().evaluateLogicPuzzle(updatedSwitches);
        console.log(`Logic puzzle evaluation: ${puzzleSolved ? 'SOLVED' : 'NOT SOLVED'}`);
      }

      set({
        switches: updatedSwitches,
        lightSource: updatedLightSource
      });
    },

  })),
);
