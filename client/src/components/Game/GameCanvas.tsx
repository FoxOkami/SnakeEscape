import React, { useRef, useEffect, useCallback } from "react";
import { useSnakeGame } from "../../lib/stores/useSnakeGame";

const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const fpsRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const lastFpsTimeRef = useRef<number>(0);


  
  const {
    gameState,
    player,
    snakes,
    walls,
    door,
    key,
    switches,
    throwableItems,
    carriedItem,
    levelSize,
    updateGame,
    isWalking,
    currentVelocity,
    targetVelocity
  } = useSnakeGame();

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, levelSize.width, levelSize.height);
    
    // Add test border to see if canvas is drawing
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 5;
    ctx.strokeRect(5, 5, levelSize.width - 10, levelSize.height - 10);

    // Draw walls
    ctx.fillStyle = '#4a5568';
    walls.forEach(wall => {
      ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
    });

    // Draw switches
    switches.forEach(switchObj => {
      ctx.fillStyle = switchObj.isPressed ? '#48bb78' : '#ed8936';
      ctx.fillRect(switchObj.x, switchObj.y, switchObj.width, switchObj.height);
      
      // Add a small border
      ctx.strokeStyle = '#2d3748';
      ctx.lineWidth = 2;
      ctx.strokeRect(switchObj.x, switchObj.y, switchObj.width, switchObj.height);
    });

    // Draw throwable items
    throwableItems.forEach(item => {
      if (item.isPickedUp && !item.isThrown) return; // Don't draw picked up items unless being thrown
      
      if (item.type === 'rock') {
        // Draw rock as a gray/brown circle
        ctx.fillStyle = '#8b7355';
        ctx.beginPath();
        ctx.arc(item.x + item.width / 2, item.y + item.height / 2, item.width / 2, 0, 2 * Math.PI);
        ctx.fill();
        
        // Add darker center for texture
        ctx.fillStyle = '#6d5a47';
        ctx.beginPath();
        ctx.arc(item.x + item.width / 2, item.y + item.height / 2, item.width / 3, 0, 2 * Math.PI);
        ctx.fill();
        
        // Add pickup indicator if player is nearby and not carrying anything
        if (!item.isPickedUp && !carriedItem) {
          const distance = Math.sqrt(
            Math.pow(player.position.x - item.x, 2) + 
            Math.pow(player.position.y - item.y, 2)
          );
          if (distance < 50) {
            ctx.fillStyle = '#ffffff';
            ctx.font = '12px Arial';
            ctx.fillText('E', item.x + item.width / 2 - 4, item.y - 5);
          }
        }
      }
    });

    // Draw key (if not collected)
    if (!key.collected) {
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(key.x, key.y, key.width, key.height);
      
      // Add sparkle effect
      ctx.fillStyle = '#ffeb3b';
      ctx.fillRect(key.x + 5, key.y + 5, 10, 10);
    }

    // Draw door
    ctx.fillStyle = door.isOpen ? '#48bb78' : '#e53e3e';
    ctx.fillRect(door.x, door.y, door.width, door.height);
    
    // Add door details
    ctx.strokeStyle = '#2d3748';
    ctx.lineWidth = 3;
    ctx.strokeRect(door.x, door.y, door.width, door.height);
    
    if (door.isOpen) {
      ctx.fillStyle = '#2d3748';
      ctx.fillRect(door.x + 5, door.y + 15, 5, 10);
    }

    // Draw snakes with different visuals for each type
    snakes.forEach(snake => {
      let baseColor = '#2d3748';
      let accentColor = '#ff6b6b';
      let eyeColor = '#ff6b6b';
      
      // Different colors and indicators for each snake type
      switch (snake.type) {
        case 'stalker':
          baseColor = snake.isChasing ? '#805ad5' : '#553c9a'; // Purple
          accentColor = '#d69e2e'; // Gold accents
          eyeColor = '#2d3748'; // No visible eyes (blind)
          break;
        case 'guard':
          baseColor = snake.isChasing ? '#e53e3e' : '#c53030'; // Red
          accentColor = '#f56565';
          eyeColor = '#ff6b6b'; // Red eyes (good sight)
          break;
        case 'burster':
          baseColor = snake.isDashing ? '#f6ad55' : '#dd6b20'; // Orange
          accentColor = snake.isDashing ? '#fbb6ce' : '#e53e3e';
          eyeColor = '#f6ad55'; // Orange eyes
          break;
      }
      
      // Main body
      ctx.fillStyle = baseColor;
      ctx.fillRect(snake.position.x, snake.position.y, snake.size.width, snake.size.height);
      
      // Body pattern based on type
      ctx.fillStyle = accentColor;
      if (snake.type === 'stalker') {
        // Stripes for stalkers (sound-following pattern)
        for (let i = 0; i < 3; i++) {
          ctx.fillRect(snake.position.x + i * 8, snake.position.y + 2, 4, snake.size.height - 4);
        }
      } else if (snake.type === 'guard') {
        // Crosshatch for guards (patrol pattern)
        ctx.fillRect(snake.position.x + 2, snake.position.y + 2, snake.size.width - 4, 4);
        ctx.fillRect(snake.position.x + 2, snake.position.y + snake.size.height - 6, snake.size.width - 4, 4);
      } else if (snake.type === 'burster') {
        // Diamond shape for bursters (dash pattern)
        ctx.fillRect(snake.position.x + snake.size.width/2 - 4, snake.position.y + 2, 8, 8);
        ctx.fillRect(snake.position.x + snake.size.width/2 - 4, snake.position.y + snake.size.height - 10, 8, 8);
      }
      
      // Add snake eyes (stalkers have no visible eyes)
      if (snake.type !== 'stalker') {
        ctx.fillStyle = eyeColor;
        ctx.fillRect(snake.position.x + 5, snake.position.y + 5, 4, 4);
        ctx.fillRect(snake.position.x + 15, snake.position.y + 5, 4, 4);
      }
      
      // Special dash indicator for bursters
      if (snake.type === 'burster' && snake.isDashing) {
        ctx.fillStyle = '#fff5b4';
        ctx.strokeStyle = '#f6ad55';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(snake.position.x + snake.size.width/2, snake.position.y + snake.size.height/2, snake.size.width/2 + 5, 0, 2 * Math.PI);
        ctx.stroke();
      }
      
      // Draw sight range when chasing (for visual feedback) - not for stalkers
      if (snake.isChasing && snake.type !== 'stalker') {
        ctx.strokeStyle = baseColor;
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        const centerX = snake.position.x + snake.size.width / 2;
        const centerY = snake.position.y + snake.size.height / 2;
        ctx.arc(centerX, centerY, snake.sightRange, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.setLineDash([]); // Reset line dash
      }
    });

    // Draw player (different color when walking)
    ctx.fillStyle = isWalking ? '#38a169' : '#4299e1'; // Green when walking, blue when running
    ctx.fillRect(player.position.x, player.position.y, player.size.width, player.size.height);
    
    // Add player details
    ctx.fillStyle = isWalking ? '#2f855a' : '#2b6cb0'; // Darker green/blue for details
    ctx.fillRect(player.position.x + 5, player.position.y + 5, 15, 15);
    
    // Player eyes
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(player.position.x + 7, player.position.y + 7, 3, 3);
    ctx.fillRect(player.position.x + 15, player.position.y + 7, 3, 3);
    
    // Walking indicator - small stealth icon
    if (isWalking) {
      ctx.fillStyle = '#68d391';
      ctx.fillRect(player.position.x - 3, player.position.y - 3, 6, 6);
      ctx.fillStyle = '#38a169';
      ctx.fillRect(player.position.x - 2, player.position.y - 2, 4, 4);
    }
    
    // Show key indicator if player has key
    if (player.hasKey) {
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(player.position.x - 5, player.position.y - 5, 8, 8);
    }

    // Debug Display - FPS Counter (bottom left)
    ctx.fillStyle = '#00ff00';
    ctx.font = '16px Arial';
    ctx.fillText(`FPS: ${fpsRef.current}`, 10, levelSize.height - 10);

    // Debug Display - Player Info (bottom right)
    ctx.fillStyle = '#0088ff';
    ctx.font = '14px Arial';
    const playerX = Math.round(player.position.x);
    const playerY = Math.round(player.position.y);
    const velX = Math.round(currentVelocity.x);
    const velY = Math.round(currentVelocity.y);
    const targetX = Math.round(targetVelocity.x);
    const targetY = Math.round(targetVelocity.y);
    
    const debugText1 = `Pos: (${playerX}, ${playerY})`;
    const debugText2 = `Vel: (${velX}, ${velY})`;
    const debugText3 = `Target: (${targetX}, ${targetY})`;
    
    ctx.fillText(debugText1, levelSize.width - 150, levelSize.height - 50);
    ctx.fillText(debugText2, levelSize.width - 150, levelSize.height - 30);
    ctx.fillText(debugText3, levelSize.width - 150, levelSize.height - 10);

  }, [player, snakes, walls, door, key, switches, throwableItems, carriedItem, levelSize, gameState, isWalking, currentVelocity, targetVelocity]);

  const gameLoop = useCallback((currentTime: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    
    // Calculate FPS
    frameCountRef.current++;
    if (currentTime - lastFpsTimeRef.current >= 1000) {
      fpsRef.current = Math.round((frameCountRef.current * 1000) / (currentTime - lastFpsTimeRef.current));
      frameCountRef.current = 0;
      lastFpsTimeRef.current = currentTime;
    }
    
    if (ctx) {
      draw(ctx);
    }

    if (gameState === 'playing') {
      const deltaTime = currentTime - lastTimeRef.current; // Keep in milliseconds
      lastTimeRef.current = currentTime;

      if (deltaTime < 100 && deltaTime > 0) { // Cap delta time to prevent large jumps (100ms)
        updateGame(deltaTime);
      }
    }

    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, updateGame, draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size
    canvas.width = levelSize.width;
    canvas.height = levelSize.height;

    // Start game loop
    const now = performance.now();
    lastTimeRef.current = now;
    lastFpsTimeRef.current = now;
    frameCountRef.current = 0;
    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [levelSize, gameLoop]);

  // Force initial render
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    
    if (ctx) {
      draw(ctx);
    }
  }, [draw]);

  return (
    <div className="flex items-center justify-center w-full h-full">
      <canvas
        ref={canvasRef}
        className="border-4 border-red-500"
        width={levelSize.width}
        height={levelSize.height}
        style={{
          width: `${levelSize.width}px`,
          height: `${levelSize.height}px`,
          maxWidth: '90vw',
          maxHeight: '90vh',
          imageRendering: 'pixelated',
          backgroundColor: '#1a1a2e'
        }}
      />
    </div>
  );
};

export default GameCanvas;
