import React, { useRef, useEffect, useCallback } from "react";
import { useSnakeGame } from "../../lib/stores/useSnakeGame";

const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);


  
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
    isWalking
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

    // Draw snakes
    snakes.forEach(snake => {
      // Different colors for chasing vs patrolling snakes
      if (snake.isChasing) {
        ctx.fillStyle = '#e53e3e'; // Red when chasing
      } else {
        ctx.fillStyle = '#38a169'; // Green when patrolling
      }
      ctx.fillRect(snake.position.x, snake.position.y, snake.size.width, snake.size.height);
      
      // Add snake pattern
      if (snake.isChasing) {
        ctx.fillStyle = '#c53030'; // Darker red pattern
      } else {
        ctx.fillStyle = '#2f855a'; // Green pattern
      }
      for (let i = 0; i < snake.size.width; i += 6) {
        for (let j = 0; j < snake.size.height; j += 6) {
          if ((i + j) % 12 === 0) {
            ctx.fillRect(snake.position.x + i, snake.position.y + j, 3, 3);
          }
        }
      }
      
      // Snake eyes - glowing when chasing
      if (snake.isChasing) {
        ctx.fillStyle = '#ff6b6b'; // Bright red eyes when chasing
      } else {
        ctx.fillStyle = '#fc8181'; // Normal red eyes
      }
      ctx.fillRect(snake.position.x + 5, snake.position.y + 5, 4, 4);
      ctx.fillRect(snake.position.x + 15, snake.position.y + 5, 4, 4);
      
      // Draw sight range when chasing (for visual feedback)
      if (snake.isChasing) {
        ctx.strokeStyle = '#e53e3e';
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

  }, [player, snakes, walls, door, key, switches, throwableItems, carriedItem, levelSize, gameState, isWalking]);

  const gameLoop = useCallback((currentTime: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    
    if (ctx) {
      draw(ctx);
    }

    if (gameState === 'playing') {
      const deltaTime = (currentTime - lastTimeRef.current) / 1000; // Convert to seconds
      lastTimeRef.current = currentTime;

      if (deltaTime < 0.1 && deltaTime > 0) { // Cap delta time to prevent large jumps
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
    lastTimeRef.current = performance.now();
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
