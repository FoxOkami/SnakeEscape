import React, { useRef, useEffect, useCallback } from "react";
import { useSnakeGame } from "../../lib/stores/useSnakeGame";

const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const fpsRef = useRef<number>(0);
  const frameTimesRef = useRef<number[]>([]);
  const lastFpsUpdateRef = useRef<number>(0);


  
  const {
    gameState,
    player,
    snakes,
    walls,
    door,
    key,
    switches,
    throwableItems,
    patternTiles,
    carriedItem,
    levelSize,
    updateGame,
    isWalking,
    currentVelocity,
    targetVelocity,
    mirrors,
    crystal,
    lightSource,
    lightBeam
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

    // Draw switches and pressure plates
    switches.forEach(switchObj => {
      if (switchObj.id.startsWith('pressure')) {
        // Draw pressure plate as a flat circular platform
        ctx.fillStyle = switchObj.isPressed ? '#48bb78' : '#a0aec0';
        ctx.beginPath();
        ctx.arc(switchObj.x + switchObj.width / 2, switchObj.y + switchObj.height / 2, switchObj.width / 2, 0, 2 * Math.PI);
        ctx.fill();
        
        // Add inner circle for pressed state
        if (switchObj.isPressed) {
          ctx.fillStyle = '#2f855a';
          ctx.beginPath();
          ctx.arc(switchObj.x + switchObj.width / 2, switchObj.y + switchObj.height / 2, switchObj.width / 3, 0, 2 * Math.PI);
          ctx.fill();
        }
        
        // Add border
        ctx.strokeStyle = '#2d3748';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(switchObj.x + switchObj.width / 2, switchObj.y + switchObj.height / 2, switchObj.width / 2, 0, 2 * Math.PI);
        ctx.stroke();
      } else {
        // Draw regular switch as a rectangle
        ctx.fillStyle = switchObj.isPressed ? '#48bb78' : '#ed8936';
        ctx.fillRect(switchObj.x, switchObj.y, switchObj.width, switchObj.height);
        
        // Add a small border
        ctx.strokeStyle = '#2d3748';
        ctx.lineWidth = 2;
        ctx.strokeRect(switchObj.x, switchObj.y, switchObj.width, switchObj.height);
      }
    });

    // Draw pattern tiles
    patternTiles.forEach(tile => {
      // Base tile color
      if (tile.isGlowing) {
        ctx.fillStyle = '#ffd700'; // Gold when glowing
      } else if (tile.hasBeenActivated) {
        ctx.fillStyle = '#48bb78'; // Green when activated correctly
      } else {
        ctx.fillStyle = '#4a5568'; // Gray when inactive
      }
      
      ctx.fillRect(tile.x, tile.y, tile.width, tile.height);
      
      // Add border
      ctx.strokeStyle = '#2d3748';
      ctx.lineWidth = 2;
      ctx.strokeRect(tile.x, tile.y, tile.width, tile.height);
      
      // Add glow effect when tile is glowing
      if (tile.isGlowing) {
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 20;
        ctx.fillStyle = '#ffeb3b';
        ctx.fillRect(tile.x + 5, tile.y + 5, tile.width - 10, tile.height - 10);
        ctx.shadowBlur = 0;
      }
      
      // Draw custom graphics if they exist
      if (tile.customGraphics) {
        // Draw line first (so it appears behind the circle)
        if (tile.customGraphics.line) {
          const line = tile.customGraphics.line;
          ctx.strokeStyle = line.color;
          ctx.lineWidth = line.thickness;
          ctx.lineCap = 'square'; // Flat line endings
          ctx.beginPath();
          ctx.moveTo(line.startX, line.startY);
          ctx.lineTo(line.endX, line.endY);
          ctx.stroke();
        }
        
        // Draw circle
        if (tile.customGraphics.circle) {
          const circle = tile.customGraphics.circle;
          ctx.fillStyle = circle.color;
          ctx.beginPath();
          ctx.arc(circle.centerX, circle.centerY, circle.radius, 0, 2 * Math.PI);
          ctx.fill();
        }
      }
      
      // Add sequence number for debugging (optional) - only if sequenceIndex >= 0
      if (tile.sequenceIndex >= 0) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
          (tile.sequenceIndex + 1).toString(),
          tile.x + tile.width / 2,
          tile.y + tile.height / 2 + 4
        );
      }
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
      } else if (item.type === 'chubbs_hand') {
        // Draw Chubbs's hand as a flesh-colored hand shape
        ctx.fillStyle = '#f4a460';
        ctx.fillRect(item.x, item.y, item.width, item.height);
        
        // Add fingers
        ctx.fillStyle = '#d2691e';
        ctx.fillRect(item.x + 5, item.y, 3, 8);
        ctx.fillRect(item.x + 10, item.y, 3, 10);
        ctx.fillRect(item.x + 15, item.y, 3, 9);
        ctx.fillRect(item.x + 20, item.y, 3, 7);
      } else if (item.type === 'elis_hip') {
        // Draw Eli's hip as a bone-like shape
        ctx.fillStyle = '#f5f5dc';
        ctx.fillRect(item.x, item.y, item.width, item.height);
        
        // Add bone joints
        ctx.fillStyle = '#deb887';
        ctx.fillRect(item.x, item.y + 5, 6, 15);
        ctx.fillRect(item.x + 19, item.y + 5, 6, 15);
        ctx.fillRect(item.x + 6, item.y + 8, 13, 9);
      } else if (item.type === 'barbra_hat') {
        // Draw Barbra Streisand hat as a fancy hat
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(item.x, item.y + 10, item.width, 10);
        
        // Hat top
        ctx.fillStyle = '#654321';
        ctx.fillRect(item.x + 5, item.y, 15, 15);
        
        // Hat decoration
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(item.x + 8, item.y + 3, 9, 3);
      }
      
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
        case 'screensaver':
          baseColor = '#38b2ac'; // Teal/cyan
          accentColor = '#4fd1c7'; // Lighter teal
          eyeColor = '#2d3748'; // Dark eyes
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
      } else if (snake.type === 'screensaver') {
        // Grid pattern for screensaver (screensaver-like pattern)
        ctx.fillRect(snake.position.x + 3, snake.position.y + 3, 6, 6);
        ctx.fillRect(snake.position.x + 15, snake.position.y + 3, 6, 6);
        ctx.fillRect(snake.position.x + 3, snake.position.y + 15, 6, 6);
        ctx.fillRect(snake.position.x + 15, snake.position.y + 15, 6, 6);
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

    // Draw light reflection elements (mirrors, crystal, light beam)
    
    // Draw light source
    if (lightSource) {
      ctx.fillStyle = '#ffff00';
      ctx.beginPath();
      ctx.arc(lightSource.x, lightSource.y, 8, 0, 2 * Math.PI);
      ctx.fill();
      
      // Add glow effect
      ctx.fillStyle = '#ffff80';
      ctx.beginPath();
      ctx.arc(lightSource.x, lightSource.y, 12, 0, 2 * Math.PI);
      ctx.fill();
      
      // Core light
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(lightSource.x, lightSource.y, 4, 0, 2 * Math.PI);
      ctx.fill();
      
      // Draw direction indicator
      ctx.save();
      ctx.translate(lightSource.x, lightSource.y);
      ctx.rotate((lightSource.rotation * Math.PI) / 180);
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 20);
      ctx.stroke();
      
      // Arrow tip
      ctx.beginPath();
      ctx.moveTo(-3, 17);
      ctx.lineTo(0, 20);
      ctx.lineTo(3, 17);
      ctx.stroke();
      ctx.restore();
      
      // Show interaction hint if player is nearby
      const distance = Math.sqrt(
        Math.pow(player.position.x - lightSource.x, 2) + 
        Math.pow(player.position.y - lightSource.y, 2)
      );
      
      if (distance < 60) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Q/E to rotate', lightSource.x, lightSource.y - 25);
        ctx.fillText('(1° increments)', lightSource.x, lightSource.y + 35);
        ctx.textAlign = 'left';
      }
    }

    // Draw mirrors
    mirrors.forEach(mirror => {
      ctx.fillStyle = mirror.isReflecting ? '#e6f3ff' : '#c0c0c0';
      ctx.fillRect(mirror.x, mirror.y, mirror.width, mirror.height);
      
      // Add mirror frame
      ctx.strokeStyle = '#666666';
      ctx.lineWidth = 2;
      ctx.strokeRect(mirror.x, mirror.y, mirror.width, mirror.height);
      
      // Add rotation indicator
      ctx.save();
      ctx.translate(mirror.x + mirror.width / 2, mirror.y + mirror.height / 2);
      ctx.rotate((mirror.rotation * Math.PI) / 180);
      ctx.strokeStyle = '#333333';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-mirror.width / 2, 0);
      ctx.lineTo(mirror.width / 2, 0);
      ctx.stroke();
      ctx.restore();
      
      // Add reflection glow if reflecting
      if (mirror.isReflecting) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(mirror.x - 2, mirror.y - 2, mirror.width + 4, mirror.height + 4);
      }
      
      // Show interaction hint if player is nearby
      const distance = Math.sqrt(
        Math.pow(player.position.x - (mirror.x + mirror.width / 2), 2) + 
        Math.pow(player.position.y - (mirror.y + mirror.height / 2), 2)
      );
      
      if (distance < 60) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Q/E to rotate', mirror.x + mirror.width / 2, mirror.y - 10);
        ctx.fillText('(1° increments)', mirror.x + mirror.width / 2, mirror.y + mirror.height + 15);
        ctx.textAlign = 'left';
      }
      
      // On-screen debugging for mirrors
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(mirror.id, mirror.x + mirror.width / 2, mirror.y + mirror.height + 35);
      ctx.fillText(`Rot: ${mirror.rotation}°`, mirror.x + mirror.width / 2, mirror.y + mirror.height + 45);
      ctx.fillText(`Reflecting: ${mirror.isReflecting ? 'YES' : 'NO'}`, mirror.x + mirror.width / 2, mirror.y + mirror.height + 55);
      ctx.textAlign = 'left';
    });

    // Draw crystal
    if (crystal) {
      ctx.fillStyle = crystal.isActivated ? '#ff6b6b' : '#9f7aea';
      ctx.fillRect(crystal.x, crystal.y, crystal.width, crystal.height);
      
      // Add crystal facets
      ctx.fillStyle = crystal.isActivated ? '#ff9999' : '#b794f6';
      ctx.fillRect(crystal.x + 2, crystal.y + 2, crystal.width - 4, crystal.height - 4);
      
      // Add crystal glow when activated
      if (crystal.isActivated) {
        ctx.fillStyle = 'rgba(255, 107, 107, 0.4)';
        ctx.fillRect(crystal.x - 3, crystal.y - 3, crystal.width + 6, crystal.height + 6);
        
        // Add sparkle effect
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(crystal.x + crystal.width / 2 - 1, crystal.y + crystal.height / 2 - 1, 2, 2);
      }
    }

    // Draw light beam
    if (lightBeam && lightBeam.segments.length > 1) {
      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 3;
      ctx.beginPath();
      
      // Draw beam segments
      for (let i = 0; i < lightBeam.segments.length - 1; i++) {
        const start = lightBeam.segments[i];
        const end = lightBeam.segments[i + 1];
        
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
      }
      
      ctx.stroke();
      
      // Add glow effect
      ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      
      for (let i = 0; i < lightBeam.segments.length - 1; i++) {
        const start = lightBeam.segments[i];
        const end = lightBeam.segments[i + 1];
        
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
      }
      
      ctx.stroke();
    }

    // Debug Display - FPS Counter (bottom left)
    ctx.fillStyle = '#00ff00';
    ctx.font = '16px Arial';
    const fpsDisplay = fpsRef.current > 0 ? fpsRef.current : '--';
    ctx.fillText(`FPS: ${fpsDisplay}`, 10, levelSize.height - 10);
    
    // Debug Display - Light Beam Info (top left)
    if (lightBeam) {
      ctx.fillStyle = '#ffff00';
      ctx.font = '14px Arial';
      ctx.fillText(`Light Beam Segments: ${lightBeam.segments.length}`, 10, 30);
      ctx.fillText(`Reflections: ${lightBeam.segments.length - 1}`, 10, 50);
    }

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

  }, [player, snakes, walls, door, key, switches, throwableItems, carriedItem, levelSize, gameState, isWalking, currentVelocity, targetVelocity, mirrors, crystal, lightSource, lightBeam]);

  const gameLoop = useCallback((currentTime: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    
    // Calculate FPS using proper frame timing
    if (lastTimeRef.current > 0) {
      const frameDelta = currentTime - lastTimeRef.current;
      
      // Only add frame time if it's reasonable (not from window focus/blur)
      if (frameDelta > 0 && frameDelta < 100) { // Between 0ms and 100ms
        frameTimesRef.current.push(frameDelta);
        
        // Keep only last 60 frame times for rolling average
        if (frameTimesRef.current.length > 60) {
          frameTimesRef.current.shift();
        }
      }
      
      // Update FPS display every 500ms for stability
      if (currentTime - lastFpsUpdateRef.current >= 500) {
        if (frameTimesRef.current.length >= 10) { // Need at least 10 samples
          const averageFrameTime = frameTimesRef.current.reduce((sum, time) => sum + time, 0) / frameTimesRef.current.length;
          fpsRef.current = Math.round(1000 / averageFrameTime);
        }
        lastFpsUpdateRef.current = currentTime;
      }
    }
    
    if (ctx) {
      draw(ctx);
    }

    if (gameState === 'playing') {
      const deltaTime = currentTime - lastTimeRef.current; // Keep in milliseconds
      lastTimeRef.current = currentTime;

      // Fixed timestep for smooth 60fps animation
      const targetFrameTime = 1000 / 60; // 16.67ms for 60fps
      const clampedDeltaTime = Math.min(deltaTime, targetFrameTime * 2); // Cap at 2 frames max

      if (clampedDeltaTime > 0) {
        updateGame(clampedDeltaTime);
      }
    } else {
      lastTimeRef.current = currentTime;
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
    lastFpsUpdateRef.current = now;
    frameTimesRef.current = [];
    animationFrameRef.current = requestAnimationFrame(gameLoop);

    // Handle window focus/blur events to reset timing only
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Window is visible again, reset timing but keep some frame history
        const now = performance.now();
        lastTimeRef.current = now;
        lastFpsUpdateRef.current = now;
        // Don't clear frame times completely
      }
    };

    const handleFocus = () => {
      // Reset timing when window regains focus
      const now = performance.now();
      lastTimeRef.current = now;
      lastFpsUpdateRef.current = now;
      // Don't clear frame times completely
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
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
