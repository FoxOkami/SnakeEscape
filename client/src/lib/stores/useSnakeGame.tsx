import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { GameData, GameState, Player, Snake, Position, Wall, Door, Key, Switch } from "../game/types";
import { LEVELS } from "../game/levels";
import { checkAABBCollision } from "../game/collision";
import { updateSnake } from "../game/entities";
import { useAudio } from "./useAudio";

interface SnakeGameState extends GameData {
  // Actions
  startGame: () => void;
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
}

const PLAYER_SPEED = 80; // pixels per second
const WALKING_SPEED = 40; // pixels per second when walking (shift held)
const ACCELERATION = 400; // pixels per second squared

export const useSnakeGame = create<SnakeGameState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    currentLevel: 0,
    gameState: 'menu',
    player: {
      position: { x: 50, y: 350 },
      size: { width: 25, height: 25 },
      speed: PLAYER_SPEED,
      hasKey: false
    },
    snakes: [],
    walls: [],
    door: { x: 0, y: 0, width: 30, height: 40, isOpen: false },
    key: { x: 0, y: 0, width: 20, height: 20, collected: false },
    switches: [],
    throwableItems: [],
    carriedItem: null,
    levelSize: { width: 800, height: 600 },
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
        const isWalking = newKeysPressed.has('ShiftLeft') || newKeysPressed.has('ShiftRight');
        const moveSpeed = isWalking ? WALKING_SPEED : PLAYER_SPEED;
        
        // Calculate target velocity based on current pressed keys
        const targetVelocity = { x: 0, y: 0 };
        
        if (newKeysPressed.has('ArrowUp') || newKeysPressed.has('KeyW')) {
          targetVelocity.y -= moveSpeed;
        }
        if (newKeysPressed.has('ArrowDown') || newKeysPressed.has('KeyS')) {
          targetVelocity.y += moveSpeed;
        }
        if (newKeysPressed.has('ArrowLeft') || newKeysPressed.has('KeyA')) {
          targetVelocity.x -= moveSpeed;
        }
        if (newKeysPressed.has('ArrowRight') || newKeysPressed.has('KeyD')) {
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
          isWalking: isWalking
        };
      });
    },

    startGame: () => {
      const level = LEVELS[0];
      set({
        currentLevel: 0,
        gameState: 'playing',
        player: {
          position: { ...level.player },
          size: { width: 25, height: 25 },
          speed: PLAYER_SPEED,
          hasKey: false
        },
        snakes: level.snakes.map(snake => ({ ...snake })),
        walls: level.walls.map(wall => ({ ...wall })),
        door: { ...level.door },
        key: { ...level.key },
        switches: level.switches ? level.switches.map(s => ({ ...s })) : [],
        throwableItems: level.throwableItems ? level.throwableItems.map(item => ({ ...item })) : [],
        carriedItem: null,
        levelSize: { ...level.size },
        currentVelocity: { x: 0, y: 0 },
        targetVelocity: { x: 0, y: 0 },
        keysPressed: new Set(),
        isWalking: false
      });
    },

    resetGame: () => {
      const state = get();
      const level = LEVELS[state.currentLevel];
      set({
        gameState: 'playing',
        player: {
          position: { ...level.player },
          size: { width: 25, height: 25 },
          speed: PLAYER_SPEED,
          hasKey: false
        },
        snakes: level.snakes.map(snake => ({ ...snake })),
        walls: level.walls.map(wall => ({ ...wall })),
        door: { ...level.door },
        key: { ...level.key },
        switches: level.switches ? level.switches.map(s => ({ ...s })) : [],
        throwableItems: level.throwableItems ? level.throwableItems.map(item => ({ ...item })) : [],
        carriedItem: null,
        levelSize: { ...level.size },
        currentVelocity: { x: 0, y: 0 },
        targetVelocity: { x: 0, y: 0 },
        keysPressed: new Set(),
        isWalking: false
      });
    },

    nextLevel: () => {
      const state = get();
      const nextLevelIndex = state.currentLevel + 1;
      
      if (nextLevelIndex >= LEVELS.length) {
        set({ gameState: 'victory' });
        return;
      }
      
      const level = LEVELS[nextLevelIndex];
      set({
        currentLevel: nextLevelIndex,
        gameState: 'playing',
        player: {
          position: { ...level.player },
          size: { width: 25, height: 25 },
          speed: PLAYER_SPEED,
          hasKey: false
        },
        snakes: level.snakes.map(snake => ({ ...snake })),
        walls: level.walls.map(wall => ({ ...wall })),
        door: { ...level.door },
        key: { ...level.key },
        switches: level.switches ? level.switches.map(s => ({ ...s })) : [],
        throwableItems: level.throwableItems ? level.throwableItems.map(item => ({ ...item })) : [],
        carriedItem: null,
        levelSize: { ...level.size },
        currentVelocity: { x: 0, y: 0 },
        targetVelocity: { x: 0, y: 0 },
        keysPressed: new Set(),
        isWalking: false
      });
    },

    returnToMenu: () => {
      set({ gameState: 'menu' });
    },

    movePlayer: (direction: Position) => {
      const state = get();
      
      if (state.gameState !== 'playing') return;

      const newPosition = {
        x: state.player.position.x + direction.x,
        y: state.player.position.y + direction.y
      };

      // Check bounds
      if (newPosition.x < 0 || newPosition.x + state.player.size.width > state.levelSize.width ||
          newPosition.y < 0 || newPosition.y + state.player.size.height > state.levelSize.height) {
        return;
      }

      // Check wall collisions
      const playerRect = {
        x: newPosition.x,
        y: newPosition.y,
        width: state.player.size.width,
        height: state.player.size.height
      };

      const hasWallCollision = state.walls.some(wall => 
        checkAABBCollision(playerRect, wall)
      );

      if (hasWallCollision) return;
      
      // Update player position
      set({
        player: {
          ...state.player,
          position: newPosition
        }
      });
    },

    updateGame: (deltaTime: number) => {
      const state = get();
      if (state.gameState !== 'playing') return;
      


      // --- SMOOTH PLAYER MOVEMENT ---
      // Smoothly interpolate current velocity toward target velocity
      let newVelocity = { ...state.currentVelocity };
      
      // Calculate velocity difference
      const velDiff = {
        x: state.targetVelocity.x - state.currentVelocity.x,
        y: state.targetVelocity.y - state.currentVelocity.y
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
        y: state.player.position.y + newVelocity.y * deltaTime
      };
      
      // Check bounds and wall collisions for new position
      let finalPosition = { ...state.player.position };
      let finalVelocity = { ...newVelocity };
      
      // Check X movement
      const testXPosition = {
        x: newPlayerPosition.x,
        y: state.player.position.y,
        width: state.player.size.width,
        height: state.player.size.height
      };
      
      const canMoveX = newPlayerPosition.x >= 0 && 
                       newPlayerPosition.x + state.player.size.width <= state.levelSize.width &&
                       !state.walls.some(wall => checkAABBCollision(testXPosition, wall));
      
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
        height: state.player.size.height
      };
      
      const canMoveY = newPlayerPosition.y >= 0 && 
                       newPlayerPosition.y + state.player.size.height <= state.levelSize.height &&
                       !state.walls.some(wall => checkAABBCollision(testYPosition, wall));
      
      if (canMoveY) {
        finalPosition.y = newPlayerPosition.y;
      } else {
        finalVelocity.y = 0; // Stop vertical movement when hitting wall
        newVelocity.y = 0; // Also reset current velocity
      }

      let updatedPlayer = {
        ...state.player,
        position: finalPosition
      };



      // --- SNAKE AI ---
      const updatedSnakes = state.snakes.map(snake => 
        updateSnake(snake, state.walls, deltaTime, updatedPlayer, [])
      );

      // --- COLLISION DETECTION ---
      const playerRect = {
        x: updatedPlayer.position.x,
        y: updatedPlayer.position.y,
        width: updatedPlayer.size.width,
        height: updatedPlayer.size.height
      };

      const hitBySnake = updatedSnakes.some(snake => {
        const snakeRect = {
          x: snake.position.x,
          y: snake.position.y,
          width: snake.size.width,
          height: snake.size.height
        };
        return checkAABBCollision(playerRect, snakeRect);
      });

      if (hitBySnake) {
        set({ gameState: 'gameOver' });
        return;
      }

      // --- THROWN ITEM PHYSICS ---
      const currentTime = performance.now() / 1000;
      let updatedThrowableItems = state.throwableItems.map(item => {
        if (item.isThrown && item.throwStartTime && item.throwDuration && item.throwStartPos && item.throwTargetPos) {
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
              throwTargetPos: undefined
            };
          } else {
            // Interpolate position during flight
            const x = item.throwStartPos.x + (item.throwTargetPos.x - item.throwStartPos.x) * progress;
            const y = item.throwStartPos.y + (item.throwTargetPos.y - item.throwStartPos.y) * progress;
            
            return {
              ...item,
              x: x - item.width / 2,
              y: y - item.height / 2
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
      let updatedSwitches = state.switches.map(switchObj => {
        if (checkAABBCollision(playerRect, switchObj)) {
          return { ...switchObj, isPressed: true };
        }
        return switchObj;
      });

      // Check door interaction
      let updatedDoor = state.door;
      const allSwitchesPressed = updatedSwitches.length === 0 || updatedSwitches.every(s => s.isPressed);
      
      if (updatedPlayer.hasKey && allSwitchesPressed) {
        updatedDoor = { ...state.door, isOpen: true };
      }

      // Check exit
      if (updatedDoor.isOpen && checkAABBCollision(playerRect, updatedDoor)) {
        set({ gameState: 'levelComplete' });
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
        throwableItems: updatedThrowableItems
      });
    },

    pickupItem: (itemId: string) => {
      const state = get();
      if (state.carriedItem) return; // Already carrying something
      
      const item = state.throwableItems.find(item => item.id === itemId && !item.isPickedUp);
      if (!item) return;
      
      const playerRect = {
        x: state.player.position.x,
        y: state.player.position.y,
        width: state.player.size.width,
        height: state.player.size.height
      };
      
      // Check if player is close enough to pick up the item
      if (checkAABBCollision(playerRect, item)) {
        set({
          throwableItems: state.throwableItems.map(i => 
            i.id === itemId ? { ...i, isPickedUp: true } : i
          ),
          carriedItem: { type: item.type, id: item.id }
        });
      }
    },

    throwItem: (targetPosition: Position) => {
      const state = get();
      if (!state.carriedItem) return; // Not carrying anything
      
      const currentTime = performance.now() / 1000; // Convert to seconds
      const throwDuration = 1.0; // 1 second flight time
      
      // Find the carried item in throwableItems array
      const itemIndex = state.throwableItems.findIndex(item => item.id === state.carriedItem!.id);
      if (itemIndex === -1) return;
      
      const thrownItem = state.throwableItems[itemIndex];
      
      set({
        throwableItems: state.throwableItems.map((item, index) => 
          index === itemIndex ? {
            ...item,
            isThrown: true,
            throwStartTime: currentTime,
            throwDuration: throwDuration,
            throwStartPos: { ...state.player.position },
            throwTargetPos: { ...targetPosition }
          } : item
        ),
        carriedItem: null
      });
    }
  }))
);
