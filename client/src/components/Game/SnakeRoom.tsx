import React, { useEffect } from "react";
import { useSnakeGame } from "../../lib/stores/useSnakeGame";
import GameCanvas from "./GameCanvas";
import GameUI from "./GameUI";
import { useAudio } from "../../lib/stores/useAudio";

const SnakeRoom: React.FC = () => {
  const { gameState, setKeyPressed, throwItem, pickupItem, carriedItem } = useSnakeGame();
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
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight'].includes(event.code)) {
        event.preventDefault();
        setKeyPressed(event.code, true);
      }
      
      // Handle pickup with E key
      if (event.code === 'KeyE' && gameState === 'playing') {
        event.preventDefault();
        // Try to pickup nearby items (this will be handled in the game logic)
        // For now, we'll trigger pickup for the first available item
        const gameState_current = useSnakeGame.getState();
        const nearbyItem = gameState_current.throwableItems.find(item => !item.isPickedUp);
        if (nearbyItem && !gameState_current.carriedItem) {
          pickupItem(nearbyItem.id);
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight'].includes(event.code)) {
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

  // Handle mouse events for throwing
  useEffect(() => {
    const handleMouseClick = (event: MouseEvent) => {
      if (gameState !== 'playing' || !carriedItem) return;
      
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
