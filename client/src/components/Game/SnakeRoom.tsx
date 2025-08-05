import React, { useEffect } from "react";
import { useSnakeGame } from "../../lib/stores/useSnakeGame";
import GameCanvas from "./GameCanvas";
import GameUI from "./GameUI";
import { useAudio } from "../../lib/stores/useAudio";

const SnakeRoom: React.FC = () => {
  const {
    gameState,
    setKeyPressed,
    throwItem,
    pickupItem,
    carriedItem,
    dropItem,
    pickupNearestItem,
    rotateMirror,
    rotateLightSource,
    rotateTile,
    checkPathConnection,
    removeKeyWalls,
    toggleLightSwitch,
  } = useSnakeGame();
  const { setBackgroundMusic, setHitSound, setSuccessSound, setRockSound } =
    useAudio();

  // Initialize audio
  useEffect(() => {
    const backgroundMusic = new Audio("/sounds/background.mp3");
    const hitSound = new Audio("/sounds/hit.mp3");
    const successSound = new Audio("/sounds/success.mp3");
    const rockSound = new Audio("/sounds/hit.mp3"); // Using hit sound as placeholder for rock sound

    backgroundMusic.loop = true;
    backgroundMusic.volume = 0.3;

    setBackgroundMusic(backgroundMusic);
    setHitSound(hitSound);
    setSuccessSound(successSound);
    setRockSound(rockSound);

    return () => {
      backgroundMusic.pause();
    };
  }, [setBackgroundMusic, setHitSound, setSuccessSound, setRockSound]);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Handle Q key for counterclockwise rotation (mirrors, light source, and tiles)
      if (event.code === "KeyQ" && gameState === "playing") {
        event.preventDefault();
        const gameState_current = useSnakeGame.getState();
        if (gameState_current.currentLevel === 2) {
          // Try to rotate mirror first, then light source
          rotateMirror("counterclockwise");
          rotateLightSource("counterclockwise");
          return;
        }
        if (gameState_current.currentLevel === 3) {
          // Rotate tile left on level 4
          rotateTile("left");
          return;
        }
      }

      // Handle E key for clockwise rotation (mirrors and light source) or item interaction
      if (event.code === "KeyE" && gameState === "playing") {
        event.preventDefault();
        setKeyPressed(event.code, true);

        // Check if we're on level 3 (mirror/light source rotation level)
        const gameState_current = useSnakeGame.getState();
        if (gameState_current.currentLevel === 2) {
          // Try to rotate mirror first, then light source
          rotateMirror("clockwise");
          rotateLightSource("clockwise");
          return;
        }
        if (gameState_current.currentLevel === 3) {
          // Check if we're on the start tile for connection checking
          const playerRect = {
            x: gameState_current.player.position.x,
            y: gameState_current.player.position.y,
            width: gameState_current.player.size.width,
            height: gameState_current.player.size.height,
          };

          const currentTile = gameState_current.patternTiles.find((tile) => {
            return (
              playerRect.x < tile.x + tile.width &&
              playerRect.x + playerRect.width > tile.x &&
              playerRect.y < tile.y + tile.height &&
              playerRect.y + playerRect.height > tile.y
            );
          });

          // If on start tile, check connection instead of rotating
          const currentLevel =
            useSnakeGame.getState().levels[
              useSnakeGame.getState().currentLevel
            ];
          const startTilePos = currentLevel.startTilePos;
          const startTileId = startTilePos
            ? `grid_tile_${startTilePos.row}_${startTilePos.col}`
            : "grid_tile_3_0";

          if (currentTile && currentTile.id === startTileId) {
            // Check if flow is already active (filling or emptying)
            const currentFlowState = gameState_current.flowState;
            if (
              currentFlowState &&
              (currentFlowState.isActive || currentFlowState.isEmptying)
            ) {
              return; // Don't start new flow while current one is active or emptying
            }

            checkPathConnection();
            return; // Don't rotate the start tile
          }

          // Rotate tile right on level 4
          rotateTile("right");
          return;
        }

        // Check if we're on level 5 (light switch level)
        if (gameState_current.currentLevel === 4) {
          // Try to toggle light switch first
          toggleLightSwitch();
          return;
        }

        // On other levels, E key does item pickup/drop
        if (gameState_current.carriedItem) {
          // If carrying something, drop it
          dropItem();
        } else {
          // If not carrying anything, try to pick up the nearest item
          pickupNearestItem();
        }
      }

      // Handle movement keys
      if (
        [
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
          "KeyW",
          "KeyA",
          "KeyS",
          "KeyD",
          "ShiftLeft",
          "ShiftRight",
          "KeyE",
        ].includes(event.code)
      ) {
        event.preventDefault();
        setKeyPressed(event.code, true);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (
        [
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
          "KeyW",
          "KeyA",
          "KeyS",
          "KeyD",
          "ShiftLeft",
          "ShiftRight",
          "KeyE",
        ].includes(event.code)
      ) {
        event.preventDefault();
        setKeyPressed(event.code, false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, [setKeyPressed, gameState, pickupItem, rotateTile]);

  // Handle mouse events for throwing (only for throwable items)
  useEffect(() => {
    const handleMouseClick = (event: MouseEvent) => {
      if (gameState !== "playing" || !carriedItem) return;

      // Only allow clicking to throw for throwable items (not chubbs_hand, elis_hip, barbra_hat)
      const nonThrowableTypes = ["chubbs_hand", "elis_hip", "barbra_hat"];
      if (nonThrowableTypes.includes(carriedItem.type)) {
        return; // Don't allow clicking to throw non-throwable items
      }

      // Get canvas element to calculate relative coordinates
      const canvas = document.querySelector("canvas");
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      const targetPosition = {
        x: (event.clientX - rect.left) * scaleX,
        y: (event.clientY - rect.top) * scaleY,
      };

      throwItem(targetPosition);
    };

    document.addEventListener("click", handleMouseClick);

    return () => {
      document.removeEventListener("click", handleMouseClick);
    };
  }, [gameState, carriedItem, throwItem]);

  return (
    <div
      className="relative w-full h-screen bg-gray-900 overflow-hidden focus:outline-none"
      tabIndex={0}
      autoFocus
    >
      <div className="absolute inset-0 flex items-center justify-center z-0">
        <GameCanvas />
      </div>
      <div className="relative z-10">
        <GameUI />
      </div>
    </div>
  );
};

export default SnakeRoom;
