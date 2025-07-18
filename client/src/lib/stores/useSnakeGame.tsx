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
} from "../game/types";
import { LEVELS } from "../game/levels";
import { checkAABBCollision } from "../game/collision";
import { updateSnake } from "../game/entities";
import { calculateLightBeam } from "../game/lightBeam";
import { useAudio } from "./useAudio";

interface SnakeGameState extends GameData {
  // Actions
  startGame: () => void;
  startFromLevel: (levelIndex: number) => void;
  resetGame: () => void;
  movePlayer: (direction: Position) => void;
  updateGame: (deltaTime: number) => void;
  nextLevel: () => void;
  returnToMenu: () => void;
  
  // Connection status display
  connectionStatus: string | null;
  setConnectionStatus: (status: string | null) => void;

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
    keysPressed: new Set(),
    currentVelocity: { x: 0, y: 0 },
    targetVelocity: { x: 0, y: 0 },
    isWalking: false,
    connectionStatus: null,

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

      const hasWallCollision = state.walls.some((wall) =>
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
        !state.walls.some((wall) => checkAABBCollision(testXPosition, wall));

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
        !state.walls.some((wall) => checkAABBCollision(testYPosition, wall));

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
      
      const updatedSnakes = state.snakes.map((snake) =>
        updateSnake(snake, state.walls, deltaTime, updatedPlayer, playerSounds),
      );

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
        
        return switchObj;
      });

      // Check pattern tile interactions
      let updatedPatternTiles = [...state.patternTiles];
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
      } else if (state.currentLevel !== 2 && updatedPlayer.hasKey && allSwitchesPressed) {
        updatedDoor = { ...state.door, isOpen: true };
      }

      // Check exit
      if (updatedDoor.isOpen && checkAABBCollision(playerRect, updatedDoor)) {
        set({ gameState: "levelComplete" });
        return;
      }

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
      
      set({
        flowState: {
          isActive: true,
          currentTile: 'grid_tile_3_0',
          currentPhase: 'entry-to-center',
          entryDirection: null,
          exitDirection: 'east',
          progress: 0,
          phaseStartTime: Date.now(),
          phaseDuration: 1000, // 1 second per phase
          lastPosition: undefined,
          isBlocked: false,
          completedPaths: [] // Clear previous paths when starting new flow
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
          // Check if we're at the end tile
          if (state.flowState.currentTile === 'grid_tile_6_7') {
            // Add final tile to completed paths
            const finalPath = {
              tileId: state.flowState.currentTile,
              entryDirection: state.flowState.entryDirection,
              exitDirection: state.flowState.exitDirection
            };
            
            // Flow completed successfully - remove key walls
            get().removeKeyWalls();
            set({
              flowState: {
                ...state.flowState,
                isActive: false,
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
                // Add current tile to completed paths
                const completedPath = {
                  tileId: state.flowState.currentTile,
                  entryDirection: state.flowState.entryDirection,
                  exitDirection: state.flowState.exitDirection
                };
                
                set({
                  flowState: {
                    ...state.flowState,
                    currentTile: nextTile.id,
                    currentPhase: 'entry-to-center',
                    entryDirection: newEntryDirection,
                    exitDirection: newExitDirection,
                    progress: 0,
                    phaseStartTime: currentTime,
                    completedPaths: [...state.flowState.completedPaths, completedPath]
                  }
                });
              } else {
                // Flow blocked - incompatible connection
                console.log("Flow blocked: next tile doesn't have compatible direction");
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
                
                set({
                  flowState: {
                    ...state.flowState,
                    isActive: false,
                    lastPosition: blockedPosition,
                    isBlocked: true,
                    completedPaths: [...state.flowState.completedPaths, completedPath]
                  }
                });
              }
            } else {
              // Flow ended unexpectedly - no tile found (edge of grid)
              console.log("Flow ended: no next tile found");
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
              
              set({
                flowState: {
                  ...state.flowState,
                  isActive: false,
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
        console.log(`Invalid tile ID: ${currentTileId}`);
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
      
      console.log(`  From ${currentTileId} (${row},${col}) going ${exitDirection} to (${nextRow},${nextCol})`);
      
      // Check bounds
      if (nextRow < 0 || nextRow >= 8 || nextCol < 0 || nextCol >= 8) {
        console.log(`  Out of bounds: (${nextRow},${nextCol})`);
        return null;
      }
      
      const nextTileId = `grid_tile_${nextRow}_${nextCol}`;
      const nextTile = state.patternTiles.find(tile => tile.id === nextTileId) || null;
      
      if (!nextTile) {
        console.log(`  No tile found for ${nextTileId}`);
      }
      
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
      
      // Starting square (3,0) only has east
      if (row === 3 && col === 0) {
        return ['east' as const];
      }
      
      // Ending square (6,7) only has west
      if (row === 6 && col === 7) {
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
      if (currentTile.id === 'grid_tile_3_0' || currentTile.id === 'grid_tile_6_7') {
        return;
      }
      
      // Check if this tile has been part of any flow path and lock it
      if (state.flowState && state.flowState.completedPaths.some(path => path.tileId === currentTile.id)) {
        console.log(`Tile ${currentTile.id} is locked - flow has passed through it`);
        get().setConnectionStatus("⚠️ Tile is locked! Flow has already passed through this pipe.");
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
      
      // Use BFS to find path from start (3,0) to end (6,7)
      const startTileId = 'grid_tile_3_0';
      const endTileId = 'grid_tile_6_7';
      
      console.log("=== Starting Path Connection Check ===");
      console.log("Start tile:", startTileId);
      console.log("End tile:", endTileId);
      
      // Always start flow visualization to show the attempted path
      get().startFlow();
      
      const visited = new Set<string>();
      const queue = [{ tileId: startTileId, entryDirection: null as null | 'north' | 'south' | 'east' | 'west' }];
      
      while (queue.length > 0) {
        const { tileId, entryDirection } = queue.shift()!;
        
        if (visited.has(tileId)) continue;
        visited.add(tileId);
        
        console.log(`Processing tile: ${tileId}, entry: ${entryDirection}`);
        
        // Check if we reached the end
        if (tileId === endTileId) {
          console.log("✓ Path found! Connected successfully!");
          return true;
        }
        
        // Get available directions for this tile
        const directions = state.getTileDirections(tileId);
        console.log(`  Available directions for ${tileId}:`, directions);
        
        // For each direction, try to move to the next tile
        for (const direction of directions) {
          // Skip if this is the entry direction (can't go back)
          if (entryDirection && direction === entryDirection) {
            console.log(`  Skipping ${direction} (entry direction)`);
            continue;
          }
          
          // Get the next tile in this direction
          const nextTile = state.getNextTile(tileId, direction);
          if (!nextTile) {
            console.log(`  No tile found in ${direction} direction`);
            continue;
          }
          
          console.log(`  Found next tile: ${nextTile.id} in ${direction} direction`);
          
          // Check if the next tile has a compatible direction
          const nextTileDirections = state.getTileDirections(nextTile.id);
          const requiredDirection = state.getOppositeDirection(direction);
          
          console.log(`  Next tile directions:`, nextTileDirections);
          console.log(`  Required direction: ${requiredDirection}`);
          
          if (nextTileDirections.includes(requiredDirection)) {
            console.log(`  ✓ Compatible! Adding ${nextTile.id} to queue`);
            queue.push({ tileId: nextTile.id, entryDirection: requiredDirection });
          } else {
            console.log(`  ✗ Not compatible, skipping`);
          }
        }
      }
      
      console.log("✗ No path found");
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
      
      console.log("Key chamber walls removed! Path connected from start to end.");
    },

    setConnectionStatus: (status: string | null) => {
      set({ connectionStatus: status });
      
      // Auto-clear status after 3 seconds
      if (status) {
        setTimeout(() => {
          set({ connectionStatus: null });
        }, 3000);
      }
    },
  })),
);
