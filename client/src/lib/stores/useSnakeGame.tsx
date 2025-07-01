import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { GameData, GameState, Player, Snake, Position, Wall, Door, Key, Switch } from "../game/types";
import { LEVELS } from "../game/levels";
import { checkAABBCollision } from "../game/collision";
import { updateSnake } from "../game/entities";

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
}

const PLAYER_SPEED = 200; // pixels per second
const ACCELERATION = 1200; // pixels per second squared

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
    levelSize: { width: 800, height: 600 },
    keysPressed: new Set(),
    currentVelocity: { x: 0, y: 0 },
    targetVelocity: { x: 0, y: 0 },

    setKeyPressed: (key: string, pressed: boolean) => {
      set((state) => {
        const newKeysPressed = new Set(state.keysPressed);
        if (pressed) {
          newKeysPressed.add(key);
        } else {
          newKeysPressed.delete(key);
        }
        
        // Calculate target velocity based on current pressed keys
        const targetVelocity = { x: 0, y: 0 };
        
        if (newKeysPressed.has('ArrowUp') || newKeysPressed.has('KeyW')) {
          targetVelocity.y -= PLAYER_SPEED;
        }
        if (newKeysPressed.has('ArrowDown') || newKeysPressed.has('KeyS')) {
          targetVelocity.y += PLAYER_SPEED;
        }
        if (newKeysPressed.has('ArrowLeft') || newKeysPressed.has('KeyA')) {
          targetVelocity.x -= PLAYER_SPEED;
        }
        if (newKeysPressed.has('ArrowRight') || newKeysPressed.has('KeyD')) {
          targetVelocity.x += PLAYER_SPEED;
        }
        
        // Normalize diagonal movement to maintain consistent speed
        if (targetVelocity.x !== 0 && targetVelocity.y !== 0) {
          const factor = Math.sqrt(2) / 2; // 1/sqrt(2)
          targetVelocity.x *= factor;
          targetVelocity.y *= factor;
        }
        
        return { 
          keysPressed: newKeysPressed,
          targetVelocity: targetVelocity
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
        levelSize: { ...level.size },
        currentVelocity: { x: 0, y: 0 },
        targetVelocity: { x: 0, y: 0 },
        keysPressed: new Set()
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
        levelSize: { ...level.size },
        currentVelocity: { x: 0, y: 0 },
        targetVelocity: { x: 0, y: 0 },
        keysPressed: new Set()
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
        levelSize: { ...level.size },
        currentVelocity: { x: 0, y: 0 },
        targetVelocity: { x: 0, y: 0 },
        keysPressed: new Set()
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
      }

      let updatedPlayer = {
        ...state.player,
        position: finalPosition
      };

      // --- SNAKE AI ---
      const updatedSnakes = state.snakes.map(snake => 
        updateSnake(snake, state.walls, deltaTime, updatedPlayer)
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
        currentVelocity: finalVelocity,
        snakes: updatedSnakes,
        key: updatedKey,
        player: updatedPlayer,
        switches: updatedSwitches,
        door: updatedDoor
      });
    }
  }))
);
