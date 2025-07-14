import React, { useEffect } from "react";
import { useSnakeGame } from "../../lib/stores/useSnakeGame";
import GameCanvas from "./GameCanvas";
import GameUI from "./GameUI";
import { useAudio } from "../../lib/stores/useAudio";

const SnakeRoom: React.FC = () => {
  const { gameState, setKeyPressed, throwItem, pickupItem, carriedItem, dropItem, pickupNearestItem, rotateMirror } = useSnakeGame();
  const { setBackgroundMusic, setHitSound, setSuccessSound, setRockSound } = useAudio();



  // Initialize audio
  useEffect(() => {
    const backgroundMusic = new Audio('/sounds/background.mp3');
    const hitSound = new Audio('/sounds/hit.mp3');
    const successSound = new Audio('/sounds/success.mp3');
    const rockSound = new Audio('/sounds/hit.mp3'); // Using hit sound as placeholder for rock sound

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
      // Handle Q key for counterclockwise mirror rotation
      if (event.code === 'KeyQ' && gameState === 'playing') {
        event.preventDefault();
        const gameState_current = useSnakeGame.getState();
        if (gameState_current.currentLevel === 2) {
          rotateMirror('counterclockwise');
          return;
        }
      }
      
      // Handle E key for clockwise mirror rotation or item interaction
      if (event.code === 'KeyE' && gameState === 'playing') {
        event.preventDefault();
        setKeyPressed(event.code, true);
        
        // Check if we're on level 3 (mirror rotation level)
        const gameState_current = useSnakeGame.getState();
        if (gameState_current.currentLevel === 2) {
          rotateMirror('clockwise');
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
      
      // Handle arrow keys for movement
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
        event.preventDefault();
        setKeyPressed(event.code, true);
      }
      
      // Handle other movement keys (WASD and Shift)
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight'].includes(event.code)) {
        event.preventDefault();
        setKeyPressed(event.code, true);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight', 'KeyE'].includes(event.code)) {
        event.preventDefault();
        setKeyPressed(event.code, false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [setKeyPressed, gameState, pickupItem]);

  // Handle mouse events for throwing (only for throwable items)
  useEffect(() => {
    const handleMouseClick = (event: MouseEvent) => {
      if (gameState !== 'playing' || !carriedItem) return;
      
      // Only allow clicking to throw for throwable items (not chubbs_hand, elis_hip, barbra_hat)
      const nonThrowableTypes = ['chubbs_hand', 'elis_hip', 'barbra_hat'];
      if (nonThrowableTypes.includes(carriedItem.type)) {
        return; // Don't allow clicking to throw non-throwable items
      }
      
      // Get canvas element to calculate relative coordinates
      const canvas = document.querySelector('canvas');
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      
      const targetPosition = {
        x: (event.clientX - rect.left) * scaleX,
        y: (event.clientY - rect.top) * scaleY
      };
      
      throwItem(targetPosition);
    };

    document.addEventListener('click', handleMouseClick);
    
    return () => {
      document.removeEventListener('click', handleMouseClick);
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
