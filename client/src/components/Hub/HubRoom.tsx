import React, { useEffect, useRef, useState } from 'react';
import { useHubStore } from '../../lib/stores/useHubStore';
import { useSnakeGame } from '../../lib/stores/useSnakeGame';

const HubRoom: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const playerImageRef = useRef<HTMLImageElement | null>(null);
  
  const {
    player,
    npcs,
    gameState,
    interactionState,
    selectedOption,
    initializeHub,
    updateHub,
    movePlayer,
    interactWithNPC,
    selectOption,
    confirmSelection,
    endInteraction
  } = useHubStore();

  const { startLevel } = useSnakeGame();
  
  const [keys, setKeys] = useState<Set<string>>(new Set());
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // Load player character image
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      playerImageRef.current = img;
      setImageLoaded(true);
    };
    img.onerror = (error) => {
      console.error('Failed to load player image:', error);
      setImageLoaded(false);
    };
    // Add cache busting parameter to ensure fresh load
    img.src = "/player-character.png?" + Date.now();
  }, []);
  
  useEffect(() => {
    initializeHub();
    
    const handleKeyDown = (e: KeyboardEvent) => {
      setKeys(prev => new Set(prev).add(e.code));
      
      if (interactionState === 'conversation') {
        if (e.code === 'ArrowUp' || e.code === 'KeyW') {
          selectOption('yes');
        } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
          selectOption('no');
        } else if (e.code === 'KeyE' || e.code === 'Enter') {
          confirmSelection();
        }
      } else if (interactionState === 'idle') {
        if (e.code === 'KeyE') {
          interactWithNPC();
        }
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      setKeys(prev => {
        const newKeys = new Set(prev);
        newKeys.delete(e.code);
        return newKeys;
      });
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [interactionState, initializeHub, selectOption, confirmSelection, interactWithNPC]);
  
  // Handle game start
  useEffect(() => {
    if (interactionState === 'startGame') {
      // Start level 1 (index 0)
      startLevel(0);
    }
  }, [interactionState, startLevel]);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let lastTime = 0;
    
    const gameLoop = (currentTime: number) => {
      const deltaTime = Math.min(currentTime - lastTime, 100);
      lastTime = currentTime;
      
      // Update game state
      if (interactionState === 'idle') {
        updateHub(deltaTime, keys);
      }
      
      // Clear canvas
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw room boundaries (match main game wall color)
      ctx.fillStyle = '#4a5568';
      ctx.fillRect(20, 20, 760, 20); // Top wall
      ctx.fillRect(20, 20, 20, 560); // Left wall
      ctx.fillRect(760, 20, 20, 560); // Right wall
      ctx.fillRect(20, 560, 760, 20); // Bottom wall
      
      // Draw player (use player-character.png like main game)
      if (imageLoaded && playerImageRef.current) {
        // Draw custom player image
        ctx.drawImage(
          playerImageRef.current,
          player.position.x,
          player.position.y,
          player.size.width,
          player.size.height,
        );
      } else {
        // Fallback to rectangle (same as main game fallback)
        ctx.fillStyle = '#4299e1'; // Blue like main game
        ctx.fillRect(
          player.position.x,
          player.position.y,
          player.size.width,
          player.size.height,
        );
        
        // Add player details (match main game style)
        ctx.fillStyle = '#2b6cb0'; // Darker blue for details
        ctx.fillRect(player.position.x + 5, player.position.y + 5, 15, 15);
        
        // Player eyes
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(player.position.x + 7, player.position.y + 7, 3, 3);
        ctx.fillRect(player.position.x + 15, player.position.y + 7, 3, 3);
      }
      
      // Draw NPCs
      npcs.forEach(npc => {
        ctx.fillStyle = '#FFB74D';
        ctx.fillRect(npc.position.x, npc.position.y, npc.size.width, npc.size.height);
        
        // Draw NPC name
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
          npc.name,
          npc.position.x + npc.size.width / 2,
          npc.position.y - 10
        );
        
        // Draw interaction prompt if player is near
        const distance = Math.sqrt(
          Math.pow(player.position.x - npc.position.x, 2) +
          Math.pow(player.position.y - npc.position.y, 2)
        );
        
        if (distance < 80 && interactionState === 'idle') {
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '14px Arial';
          ctx.fillText(
            'Press E to interact',
            npc.position.x + npc.size.width / 2,
            npc.position.y + npc.size.height + 25
          );
        }
      });
      
      // Draw conversation UI
      if (interactionState === 'conversation') {
        // Semi-transparent overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Dialog box
        const dialogWidth = 600;
        const dialogHeight = 200;
        const dialogX = (canvas.width - dialogWidth) / 2;
        const dialogY = (canvas.height - dialogHeight) / 2;
        
        ctx.fillStyle = '#2C3E50';
        ctx.fillRect(dialogX, dialogY, dialogWidth, dialogHeight);
        ctx.strokeStyle = '#34495E';
        ctx.lineWidth = 3;
        ctx.strokeRect(dialogX, dialogY, dialogWidth, dialogHeight);
        
        // NPC question
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
          'Would you like to play?',
          canvas.width / 2,
          dialogY + 60
        );
        
        // Options
        const optionY = dialogY + 120;
        const yesSelected = selectedOption === 'yes';
        const noSelected = selectedOption === 'no';
        
        // Yes option
        ctx.fillStyle = yesSelected ? '#27AE60' : '#7F8C8D';
        ctx.font = '18px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(
          yesSelected ? '> Yes - LGLG' : '  Yes - LGLG',
          dialogX + 50,
          optionY
        );
        
        // No option
        ctx.fillStyle = noSelected ? '#E74C3C' : '#7F8C8D';
        ctx.fillText(
          noSelected ? '> No, I\'m not ready yet' : '  No, I\'m not ready yet',
          dialogX + 50,
          optionY + 30
        );
        
        // Instructions
        ctx.fillStyle = '#BDC3C7';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
          'Use W/S or ↑/↓ to select, E or Enter to confirm',
          canvas.width / 2,
          dialogY + dialogHeight - 20
        );
      }
      
      animationRef.current = requestAnimationFrame(gameLoop);
    };
    
    animationRef.current = requestAnimationFrame(gameLoop);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [player, npcs, interactionState, selectedOption, keys, updateHub]);
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900">
      <h1 className="text-3xl font-bold text-white mb-4">Snake Room</h1>
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="border border-gray-600 bg-gray-800"
        style={{ imageRendering: 'pixelated' }}
      />
      <div className="mt-4 text-white text-center">
        <p>Use WASD or arrow keys to move</p>
        <p>Press E near NPCs to interact</p>
      </div>
    </div>
  );
};

export default HubRoom;