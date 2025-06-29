import React, { useRef, useEffect, useCallback } from "react";
import { useSnakeGame } from "../../lib/stores/useSnakeGame";

const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  console.log('GameCanvas rendering');
  
  const {
    gameState,
    player,
    snakes,
    walls,
    door,
    key,
    switches,
    levelSize,
    updateGame
  } = useSnakeGame();

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    console.log('Drawing canvas - gameState:', gameState, 'levelSize:', levelSize, 'walls:', walls.length, 'snakes:', snakes.length);
    
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
      ctx.fillStyle = '#38a169';
      ctx.fillRect(snake.position.x, snake.position.y, snake.size.width, snake.size.height);
      
      // Add snake pattern
      ctx.fillStyle = '#2f855a';
      for (let i = 0; i < snake.size.width; i += 6) {
        for (let j = 0; j < snake.size.height; j += 6) {
          if ((i + j) % 12 === 0) {
            ctx.fillRect(snake.position.x + i, snake.position.y + j, 3, 3);
          }
        }
      }
      
      // Snake eyes
      ctx.fillStyle = '#fc8181';
      ctx.fillRect(snake.position.x + 5, snake.position.y + 5, 4, 4);
      ctx.fillRect(snake.position.x + 15, snake.position.y + 5, 4, 4);
    });

    // Draw player
    ctx.fillStyle = '#4299e1';
    ctx.fillRect(player.position.x, player.position.y, player.size.width, player.size.height);
    
    // Add player details
    ctx.fillStyle = '#2b6cb0';
    ctx.fillRect(player.position.x + 5, player.position.y + 5, 15, 15);
    
    // Player eyes
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(player.position.x + 7, player.position.y + 7, 3, 3);
    ctx.fillRect(player.position.x + 15, player.position.y + 7, 3, 3);
    
    // Show key indicator if player has key
    if (player.hasKey) {
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(player.position.x - 5, player.position.y - 5, 8, 8);
    }

  }, [player, snakes, walls, door, key, switches, levelSize]);

  const gameLoop = useCallback((currentTime: number) => {
    if (gameState === 'playing') {
      const deltaTime = (currentTime - lastTimeRef.current) / 1000; // Convert to seconds
      lastTimeRef.current = currentTime;

      if (deltaTime < 0.1) { // Cap delta time to prevent large jumps
        updateGame(deltaTime);
      }
    }

    // Always draw, regardless of game state
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    
    if (ctx) {
      draw(ctx);
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

  // Render static content when not playing
  useEffect(() => {
    if (gameState !== 'playing') {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      
      if (ctx) {
        draw(ctx);
      }
    }
  }, [gameState, draw]);

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
