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
}

const PLAYER_SPEED = 200; // pixels per second

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

    setKeyPressed: (key: string, pressed: boolean) => {
      set((state) => {
        const newKeysPressed = new Set(state.keysPressed);
        if (pressed) {
          newKeysPressed.add(key);
        } else {
          newKeysPressed.delete(key);
        }
        return { keysPressed: newKeysPressed };
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
        levelSize: { ...level.size }
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
        levelSize: { ...level.size }
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
        levelSize: { ...level.size }
      });
    },

    returnToMenu: () => {
      set({ gameState: 'menu' });
    },

    movePlayer: (direction: Position) => {
      const state = get();
      console.log('movePlayer called with direction:', direction, 'gameState:', state.gameState);
      
      if (state.gameState !== 'playing') {
        console.log('Not playing, skipping movement');
        return;
      }

      const newPosition = {
        x: state.player.position.x + direction.x,
        y: state.player.position.y + direction.y
      };

      console.log('Current position:', state.player.position, 'New position:', newPosition);

      // Check bounds
      if (newPosition.x < 0 || newPosition.x + state.player.size.width > state.levelSize.width ||
          newPosition.y < 0 || newPosition.y + state.player.size.height > state.levelSize.height) {
        console.log('Movement blocked by bounds');
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

      if (hasWallCollision) {
        console.log('Movement blocked by wall collision');
        return;
      }

      console.log('Updating player position to:', newPosition);
      
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

      // Handle keyboard input
      const movement = { x: 0, y: 0 };
      const moveDistance = state.player.speed * deltaTime;

      console.log('Keys pressed:', Array.from(state.keysPressed), 'deltaTime:', deltaTime, 'moveDistance:', moveDistance);

      if (state.keysPressed.has('ArrowUp') || state.keysPressed.has('KeyW')) {
        movement.y -= moveDistance;
        console.log('Moving up by', moveDistance);
      }
      if (state.keysPressed.has('ArrowDown') || state.keysPressed.has('KeyS')) {
        movement.y += moveDistance;
        console.log('Moving down by', moveDistance);
      }
      if (state.keysPressed.has('ArrowLeft') || state.keysPressed.has('KeyA')) {
        movement.x -= moveDistance;
        console.log('Moving left by', moveDistance);
      }
      if (state.keysPressed.has('ArrowRight') || state.keysPressed.has('KeyD')) {
        movement.x += moveDistance;
        console.log('Moving right by', moveDistance);
      }

      if (movement.x !== 0 || movement.y !== 0) {
        console.log('Moving player by:', movement);
        get().movePlayer(movement);
      }

      // Update snakes
      const updatedSnakes = state.snakes.map(snake => 
        updateSnake(snake, state.walls, deltaTime)
      );

      // Check snake collisions
      const playerRect = {
        x: state.player.position.x,
        y: state.player.position.y,
        width: state.player.size.width,
        height: state.player.size.height
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

      // Check key collection
      let updatedKey = state.key;
      let updatedPlayer = state.player;
      
      if (!state.key.collected && checkAABBCollision(playerRect, state.key)) {
        updatedKey = { ...state.key, collected: true };
        updatedPlayer = { ...state.player, hasKey: true };
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
      
      if (state.player.hasKey && allSwitchesPressed) {
        updatedDoor = { ...state.door, isOpen: true };
      }

      // Check exit
      if (updatedDoor.isOpen && checkAABBCollision(playerRect, updatedDoor)) {
        set({ gameState: 'levelComplete' });
        return;
      }

      // Update state
      set({
        snakes: updatedSnakes,
        key: updatedKey,
        player: updatedPlayer,
        switches: updatedSwitches,
        door: updatedDoor
      });
    }
  }))
);
