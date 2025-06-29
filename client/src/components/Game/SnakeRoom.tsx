import React, { useEffect } from "react";
import { useSnakeGame } from "../../lib/stores/useSnakeGame";
import GameCanvas from "./GameCanvas";
import GameUI from "./GameUI";
import { useAudio } from "../../lib/stores/useAudio";

const SnakeRoom: React.FC = () => {
  const { gameState, setKeyPressed } = useSnakeGame();
  const { setBackgroundMusic, setHitSound, setSuccessSound } = useAudio();

  console.log('SnakeRoom rendering, gameState:', gameState);

  // Initialize audio
  useEffect(() => {
    const backgroundMusic = new Audio('/sounds/background.mp3');
    const hitSound = new Audio('/sounds/hit.mp3');
    const successSound = new Audio('/sounds/success.mp3');

    backgroundMusic.loop = true;
    backgroundMusic.volume = 0.3;

    setBackgroundMusic(backgroundMusic);
    setHitSound(hitSound);
    setSuccessSound(successSound);

    return () => {
      backgroundMusic.pause();
    };
  }, [setBackgroundMusic, setHitSound, setSuccessSound]);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      console.log('Key down:', event.code);
      event.preventDefault();
      setKeyPressed(event.code, true);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      console.log('Key up:', event.code);
      event.preventDefault();
      setKeyPressed(event.code, false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [setKeyPressed]);

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
