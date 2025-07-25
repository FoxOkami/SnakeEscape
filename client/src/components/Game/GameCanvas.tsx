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
    lightBeam,
    currentLevel,
    getTileDirections,
    flowState,
    updateFlow,
    projectiles,
    updateProjectiles,

    puzzleShards,
    puzzlePedestal,
    getCurrentWalls,
    teleporters
  } = useSnakeGame();

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    // Clear canvas with default background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, levelSize.width, levelSize.height);
    
    // Level 5 quadrant lighting effect with individual logic conditions
    if (currentLevel === 4) { // Level 5 (0-indexed as 4)
      // Define quadrant boundaries based on the cross-shaped walls
      const centerX = 390; // Vertical wall position
      const centerY = 290; // Horizontal wall position
      
      // Get switch states for logic evaluation
      const A = switches.find(s => s.id === 'light_switch')?.isPressed || false;
      const B = switches.find(s => s.id === 'switch_1')?.isPressed || false;  
      const C = switches.find(s => s.id === 'switch_2')?.isPressed || false;
      const D = switches.find(s => s.id === 'switch_3')?.isPressed || false;
      const E = switches.find(s => s.id === 'switch_4')?.isPressed || false;
      const F = switches.find(s => s.id === 'switch_5')?.isPressed || false;

      // Calculate lighting conditions for each quadrant
      const topLeftLit = (A && !B) || (!A && B); // A XOR B
      const topRightLit = C && D; // C AND D
      const bottomLeftLit = !(E && F); // NOT (E AND F)
      const bottomRightLit = topLeftLit && topRightLit; // (A XOR B) AND (C AND D)
      
      ctx.fillStyle = '#000000';
      
      // Top-left quadrant - draw overlay if NOT lit
      if (!topLeftLit) {
        ctx.fillRect(0, 0, centerX, centerY);
      }
      
      // Top-right quadrant - draw overlay if NOT lit  
      if (!topRightLit) {
        ctx.fillRect(centerX + 20, 0, levelSize.width - (centerX + 20), centerY);
      }
      
      // Bottom-left quadrant - draw overlay if NOT lit
      if (!bottomLeftLit) {
        ctx.fillRect(0, centerY + 20, centerX, levelSize.height - (centerY + 20));
      }
      
      // Bottom-right quadrant - draw overlay if NOT lit
      if (!bottomRightLit) {
        ctx.fillRect(centerX + 20, centerY + 20, levelSize.width - (centerX + 20), levelSize.height - (centerY + 20));
      }
    }
    
    // Add test border to see if canvas is drawing
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 5;
    ctx.strokeRect(5, 5, levelSize.width - 10, levelSize.height - 10);

    // Helper function to check if player is on a tile
    const getPlayerCurrentTile = () => {
      if (currentLevel !== 3) return null; // Only on Level 4
      
      const playerRect = {
        x: player.position.x,
        y: player.position.y,
        width: player.size.width,
        height: player.size.height,
      };
      
      return patternTiles.find(tile => {
        return (
          tile.id.startsWith('grid_tile_') &&
          playerRect.x < tile.x + tile.width &&
          playerRect.x + playerRect.width > tile.x &&
          playerRect.y < tile.y + tile.height &&
          playerRect.y + playerRect.height > tile.y
        );
      });
    };

    const currentTile = getPlayerCurrentTile();

    // Draw walls (use dynamic walls for Level 5)
    const currentWalls = getCurrentWalls();
    ctx.fillStyle = '#4a5568';
    currentWalls.forEach(wall => {
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
      } else if (switchObj.switchType === 'lever') {
        // Draw lever switch
        const centerX = switchObj.x + switchObj.width / 2;
        const baseY = switchObj.y + switchObj.height - 5;
        
        // Draw base plate
        ctx.fillStyle = '#4a5568';
        ctx.fillRect(switchObj.x, baseY, switchObj.width, 5);
        
        // Draw lever (angled based on state)
        const leverLength = switchObj.height - 8;
        const leverAngle = switchObj.isPressed ? -0.3 : 0.3; // Tilt left when pressed, right when not
        const leverEndX = centerX + Math.sin(leverAngle) * leverLength;
        const leverEndY = baseY - Math.cos(leverAngle) * leverLength;
        
        // Draw lever arm
        ctx.strokeStyle = switchObj.isPressed ? '#68d391' : '#f6ad55';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(centerX, baseY);
        ctx.lineTo(leverEndX, leverEndY);
        ctx.stroke();
        
        // Draw lever handle
        ctx.fillStyle = switchObj.isPressed ? '#48bb78' : '#ed8936';
        ctx.beginPath();
        ctx.arc(leverEndX, leverEndY, 3, 0, 2 * Math.PI);
        ctx.fill();
        
        // Draw base border
        ctx.strokeStyle = '#2d3748';
        ctx.lineWidth = 2;
        ctx.strokeRect(switchObj.x, baseY, switchObj.width, 5);
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
      
      // Check if this tile is locked (has flow entered it)
      const isLockedTile = flowState && flowState.lockedTiles.includes(tile.id);
      
      // Add highlight overlay for rotatable tiles with 20% opacity
      if (currentTile && currentTile.id === tile.id && currentTile.id !== 'grid_tile_3_0' && currentTile.id !== 'grid_tile_6_7') {
        if (isLockedTile) {
          // Red overlay for locked tiles
          ctx.fillStyle = 'rgba(255, 99, 99, 0.3)'; // Light red with 30% opacity
        } else {
          // Light blue overlay for rotatable tiles
          ctx.fillStyle = 'rgba(173, 216, 230, 0.2)'; // Light blue with 20% opacity
        }
        ctx.fillRect(tile.x, tile.y, tile.width, tile.height);
      }
      
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
      
      // Add directional markers for Level 4 grid tiles
      if (tile.id.startsWith('grid_tile_')) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        
        const centerX = tile.x + tile.width / 2;
        const centerY = tile.y + tile.height / 2;
        
        // Get the actual tile directions from the game state
        const tileDirections = getTileDirections(tile.id);
        
        // Map directions to display letters and positions
        const directionMap = {
          north: { letter: 'N', x: tile.x + tile.width / 2, y: tile.y + 12 },
          south: { letter: 'S', x: tile.x + tile.width / 2, y: tile.y + tile.height - 4 },
          west: { letter: 'W', x: tile.x + 8, y: tile.y + tile.height / 2 + 4 },
          east: { letter: 'E', x: tile.x + tile.width - 8, y: tile.y + tile.height / 2 + 4 }
        };
        
        const visibleMarkers = tileDirections.map(direction => directionMap[direction]);
        
        // Draw white lines from center to each visible marker
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 6;
        ctx.lineCap = 'square';
        
        visibleMarkers.forEach(marker => {
          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          
          // Draw line to near the edge but not past the tile boundary
          const edgeOffset = 2; // Keep lines 2 pixels from tile edge
          if (marker.letter === 'N') {
            ctx.lineTo(centerX, tile.y + edgeOffset);
          } else if (marker.letter === 'S') {
            ctx.lineTo(centerX, tile.y + tile.height - edgeOffset);
          } else if (marker.letter === 'W') {
            ctx.lineTo(tile.x + edgeOffset, centerY);
          } else if (marker.letter === 'E') {
            ctx.lineTo(tile.x + tile.width - edgeOffset, centerY);
          }
          
          ctx.stroke();
        });
        
        // Letters and lock icons removed
      }

    });

    // Draw flow visualization for Level 4
    if (flowState && currentLevel === 3) {
      // Set up neon green flow line
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      
      // Calculate entry and exit points for a tile
      const getEdgePoint = (tile: any, direction: 'north' | 'south' | 'east' | 'west' | null) => {
        if (!direction) return { x: tile.x + tile.width / 2, y: tile.y + tile.height / 2 };
        
        const centerX = tile.x + tile.width / 2;
        const centerY = tile.y + tile.height / 2;
        
        switch (direction) {
          case 'north': return { x: centerX, y: tile.y };
          case 'south': return { x: centerX, y: tile.y + tile.height };
          case 'east': return { x: tile.x + tile.width, y: centerY };
          case 'west': return { x: tile.x, y: centerY };
        }
      };
      
      // Draw all completed paths (excluding currently emptying tile during emptying phase)
      flowState.completedPaths.forEach(path => {
        const tile = patternTiles.find(t => t.id === path.tileId);
        if (!tile) return;
        
        // Skip drawing this tile if it's currently being emptied
        if (flowState.currentPhase === 'emptying' && path.tileId === flowState.emptyingFromTile) {
          return; // The emptying animation will handle this tile
        }
        
        const centerX = tile.x + tile.width / 2;
        const centerY = tile.y + tile.height / 2;
        const entryPoint = getEdgePoint(tile, path.entryDirection);
        const exitPoint = getEdgePoint(tile, path.exitDirection);
        
        // Draw entry to center
        ctx.beginPath();
        ctx.moveTo(entryPoint.x, entryPoint.y);
        ctx.lineTo(centerX, centerY);
        ctx.stroke();
        
        // Draw center to exit
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(exitPoint.x, exitPoint.y);
        ctx.stroke();
      });
      
      // Draw current active flow if still flowing
      if (flowState.isActive) {
        const currentTile = patternTiles.find(tile => tile.id === flowState.currentTile);
        if (currentTile) {
          const centerX = currentTile.x + currentTile.width / 2;
          const centerY = currentTile.y + currentTile.height / 2;
          
          const entryPoint = getEdgePoint(currentTile, flowState.entryDirection);
          const exitPoint = getEdgePoint(currentTile, flowState.exitDirection);
          
              // Use different colors for emptying vs filling
          const flowColor = flowState.isEmptying ? '#ffffff' : '#00ff00';
          ctx.strokeStyle = flowColor;
          ctx.lineWidth = 6;
          ctx.lineCap = 'round';

          // Draw flow based on phase
          if (flowState.currentPhase === 'entry-to-center') {
            // Flow from entry to center
            const startX = entryPoint.x;
            const startY = entryPoint.y;
            const endX = centerX;
            const endY = centerY;
            
            // Interpolate position based on progress
            const currentX = startX + (endX - startX) * flowState.progress;
            const currentY = startY + (endY - startY) * flowState.progress;
            
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(currentX, currentY);
            ctx.stroke();
            
            // Draw dot at current position
            ctx.fillStyle = flowColor;
            ctx.beginPath();
            ctx.arc(currentX, currentY, 6, 0, 2 * Math.PI);
            ctx.fill();
            
          } else if (flowState.currentPhase === 'center-to-exit') {
            // Flow from center to exit
            const startX = centerX;
            const startY = centerY;
            const endX = exitPoint.x;
            const endY = exitPoint.y;
            
            // Draw entry line (already completed)
            ctx.beginPath();
            ctx.moveTo(entryPoint.x, entryPoint.y);
            ctx.lineTo(centerX, centerY);
            ctx.stroke();
            
            // Interpolate position based on progress
            const currentX = startX + (endX - startX) * flowState.progress;
            const currentY = startY + (endY - startY) * flowState.progress;
            
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(currentX, currentY);
            ctx.stroke();
            
            // Draw dot at current position
            ctx.fillStyle = flowColor;
            ctx.beginPath();
            ctx.arc(currentX, currentY, 6, 0, 2 * Math.PI);
            ctx.fill();
          }
        }
      }
      
      // Reset shadow
      ctx.shadowBlur = 0;
    }
    
    // Draw blocked flow indicator if flow stopped due to incompatible connection
    // Show during both inactive blocked state and emptying phase
    if (flowState && flowState.isBlocked && flowState.lastPosition && 
        (!flowState.isActive || flowState.isEmptying)) {
      const { x, y } = flowState.lastPosition;
      
      // Draw neon green "X" to indicate blocked flow
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      
      // Draw X
      ctx.beginPath();
      ctx.moveTo(x - 8, y - 8);
      ctx.lineTo(x + 8, y + 8);
      ctx.moveTo(x + 8, y - 8);
      ctx.lineTo(x - 8, y + 8);
      ctx.stroke();
      
      // Draw pulsing filled circle around blocked position
      const pulseTime = (Date.now() % 1000) / 1000; // 1-second pulse cycle
      const pulseRadius = 15 + Math.sin(pulseTime * Math.PI * 2) * 5;
      
      ctx.fillStyle = 'rgba(0, 255, 0, 0.3)'; // Semi-transparent neon green fill
      ctx.beginPath();
      ctx.arc(x, y, pulseRadius, 0, 2 * Math.PI);
      ctx.fill();
      
      // Add neon green stroke outline
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, pulseRadius, 0, 2 * Math.PI);
      ctx.stroke();
      
      // Reset shadow
      ctx.shadowBlur = 0;
    }

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
      // Skip rendering phase-restricted snakes that aren't in their active phase
      // For now, render all snakes (phase system can be enhanced later)
      // if (snake.activePhase && currentLevel === 4 && snake.activePhase !== currentPhase) {
      //   return; // Don't render this snake
      // }
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
        case 'plumber':
          baseColor = '#8b4513'; // Brown/copper color for plumber
          accentColor = '#ffd700'; // Gold accent for pipe-like appearance
          eyeColor = '#4682b4'; // Steel blue eyes
          break;
        case 'spitter':
          baseColor = '#2d7d32'; // Dark green for spitter
          accentColor = '#00ff41'; // Neon green accent
          eyeColor = '#00ff41'; // Neon green eyes
          break;
        case 'photophobic':
          // Change colors based on state
          if (snake.isInDarkness) {
            baseColor = '#4a5568'; // Dark gray when in darkness
            accentColor = '#718096'; // Lighter gray
            eyeColor = '#a0aec0'; // Light gray eyes
          } else if (snake.isBerserk) {
            baseColor = snake.isCharging ? '#ff0000' : '#cc0000'; // Bright red when berserk
            accentColor = snake.isCharging ? '#ff6b6b' : '#e53e3e';
            eyeColor = '#ffff00'; // Yellow eyes when aggressive
          } else {
            baseColor = '#805ad5'; // Purple default
            accentColor = '#b794f6';
            eyeColor = '#d69e2e';
          }
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
      } else if (snake.type === 'plumber') {
        // Pipe junction pattern for plumber (cross shape like pipe fittings)
        const centerX = snake.position.x + snake.size.width / 2;
        const centerY = snake.position.y + snake.size.height / 2;
        // Horizontal pipe
        ctx.fillRect(snake.position.x + 2, centerY - 2, snake.size.width - 4, 4);
        // Vertical pipe
        ctx.fillRect(centerX - 2, snake.position.y + 2, 4, snake.size.height - 4);
      } else if (snake.type === 'spitter') {
        // Star/explosion pattern for spitter (represents projectile firing)
        const centerX = snake.position.x + snake.size.width / 2;
        const centerY = snake.position.y + snake.size.height / 2;
        // 8-pointed star pattern
        ctx.fillRect(centerX - 1, snake.position.y + 2, 2, snake.size.height - 4); // Vertical
        ctx.fillRect(snake.position.x + 2, centerY - 1, snake.size.width - 4, 2); // Horizontal
        // Diagonal lines
        ctx.fillRect(centerX - 5, centerY - 1, 10, 2); // Diagonal 1
        ctx.fillRect(centerX - 1, centerY - 5, 2, 10); // Diagonal 2
      } else if (snake.type === 'photophobic') {
        // Lightning/energy pattern for photophobic (represents light sensitivity)
        const centerX = snake.position.x + snake.size.width / 2;
        const centerY = snake.position.y + snake.size.height / 2;
        
        if (snake.isInDarkness) {
          // Subtle dots pattern when in darkness
          ctx.fillRect(snake.position.x + 4, snake.position.y + 4, 2, 2);
          ctx.fillRect(snake.position.x + 12, snake.position.y + 8, 2, 2);
          ctx.fillRect(snake.position.x + 8, snake.position.y + 16, 2, 2);
          ctx.fillRect(snake.position.x + 20, snake.position.y + 20, 2, 2);
        } else {
          // Jagged lightning pattern when berserk
          ctx.fillRect(snake.position.x + 3, snake.position.y + 3, snake.size.width - 6, 3);
          ctx.fillRect(snake.position.x + 8, snake.position.y + 8, snake.size.width - 16, 2);
          ctx.fillRect(snake.position.x + 5, snake.position.y + 13, snake.size.width - 10, 3);
          ctx.fillRect(snake.position.x + 10, snake.position.y + 18, snake.size.width - 20, 2);
        }
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

    // Draw interaction hints for lever switches
    switches.forEach(switchObj => {
      if (switchObj.switchType === 'lever') {
        // Show interaction hint if player is nearby
        const distance = Math.sqrt(
          Math.pow(player.position.x - (switchObj.x + switchObj.width / 2), 2) + 
          Math.pow(player.position.y - (switchObj.y + switchObj.height / 2), 2)
        );
        
        if (distance < 60) {
          ctx.fillStyle = '#ffffff';
          ctx.font = '12px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('E to toggle', switchObj.x + switchObj.width / 2, switchObj.y - 10);
          ctx.textAlign = 'left';
        }
      }
    });

    // Draw teleporters (Level 5 only - before player so they appear under player)
    if (currentLevel === 4) { // Level 5 (0-indexed as 4)
      teleporters.forEach(teleporter => {
        if (teleporter.type === 'sender') {
          // Draw teleporter pad with faster pulsing effect
          const pulseTime = Date.now() / 400; // Increased speed from 800 to 400
          const pulseAlpha = teleporter.isActive ? 1.0 : 0.6 + 0.4 * Math.sin(pulseTime);
          
          // Outer ring
          ctx.fillStyle = teleporter.isActive ? 
            `rgba(0, 255, 255, ${pulseAlpha})` : 
            `rgba(0, 150, 255, ${pulseAlpha})`;
          ctx.fillRect(teleporter.x, teleporter.y, teleporter.width, teleporter.height);
          
          // Inner circle
          ctx.fillStyle = teleporter.isActive ? 
            `rgba(255, 255, 255, ${pulseAlpha})` : 
            `rgba(100, 200, 255, ${pulseAlpha})`;
          const innerSize = teleporter.width * 0.6;
          const innerOffset = (teleporter.width - innerSize) / 2;
          ctx.fillRect(
            teleporter.x + innerOffset, 
            teleporter.y + innerOffset, 
            innerSize, 
            innerSize
          );
          
          // Activation progress indicator
          if (teleporter.isActive && teleporter.activationStartTime) {
            const currentTime = Date.now();
            const timeElapsed = currentTime - teleporter.activationStartTime;
            const progress = Math.min(timeElapsed / 1000, 1.0); // 1000ms = 1 second
            
            // Draw progress ring around teleporter
            const centerX = teleporter.x + teleporter.width / 2;
            const centerY = teleporter.y + teleporter.height / 2;
            const radius = teleporter.width / 2 + 5;
            
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + (progress * 2 * Math.PI));
            ctx.stroke();
            
            // Extra glow when near completion
            if (progress > 0.8) {
              ctx.shadowColor = '#00ffff';
              ctx.shadowBlur = 15;
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + (progress * 2 * Math.PI));
              ctx.stroke();
              ctx.shadowBlur = 0;
            }
          }
          
          // Activation glow effect (static when active)
          if (teleporter.isActive) {
            ctx.shadowColor = '#00ffff';
            ctx.shadowBlur = 20;
            ctx.fillStyle = 'rgba(0, 255, 255, 0.8)';
            ctx.fillRect(teleporter.x, teleporter.y, teleporter.width, teleporter.height);
            ctx.shadowBlur = 0;
          }
        } else if (teleporter.type === 'receiver') {
          // Draw receiver pad with static color (no animation)
          const staticAlpha = 0.7; // No pulsing animation
          
          // Outer ring
          ctx.fillStyle = `rgba(255, 100, 0, ${staticAlpha})`;
          ctx.fillRect(teleporter.x, teleporter.y, teleporter.width, teleporter.height);
          
          // Inner circle
          ctx.fillStyle = `rgba(255, 200, 100, ${staticAlpha})`;
          const innerSize = teleporter.width * 0.6;
          const innerOffset = (teleporter.width - innerSize) / 2;
          ctx.fillRect(
            teleporter.x + innerOffset, 
            teleporter.y + innerOffset, 
            innerSize, 
            innerSize
          );
        }
      });
    }

    // Draw light reflection elements (mirrors, crystal, light beam)
    
    // Note: For Level 5, the lighting effect is now handled by the background quadrant system above
    // No physical light source object is rendered - the lighting is environmental

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

    // Show "E to start" message if player is on the start tile in Level 4
    if (currentLevel === 3 && currentTile && currentTile.id === 'grid_tile_3_0') {
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('E to start', player.position.x + player.size.width / 2, player.position.y - 10);
      ctx.textAlign = 'left';
    }

    // Draw projectiles
    projectiles.forEach(projectile => {
      ctx.fillStyle = projectile.color;
      ctx.fillRect(projectile.position.x, projectile.position.y, projectile.size.width, projectile.size.height);
      
      // Add a small glow effect for neon green projectiles
      if (projectile.color === '#00ff41') {
        ctx.shadowBlur = 5;
        ctx.shadowColor = projectile.color;
        ctx.fillRect(projectile.position.x, projectile.position.y, projectile.size.width, projectile.size.height);
        ctx.shadowBlur = 0; // Reset shadow
      }
    });

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

    // Draw puzzle shards (Level 5)
    if (currentLevel === 4) { // Level 5 (0-indexed as 4)
      puzzleShards.forEach(shard => {
        if (!shard.collected) {
          // Draw pulsing shard based on phase
          const pulseTime = Date.now() / 500;
          const pulseAlpha = 0.8 + 0.2 * Math.sin(pulseTime);
          
          let shardColor = `rgba(255, 255, 255, ${pulseAlpha})`; // Default white
          
          ctx.fillStyle = shardColor;
          ctx.fillRect(shard.x, shard.y, shard.width, shard.height);
          
          // Add sparkle effect
          ctx.fillStyle = `rgba(255, 255, 255, ${pulseAlpha})`;
          ctx.fillRect(shard.x + shard.width/4, shard.y + shard.height/4, shard.width/2, shard.height/2);
        }
      });
      
      // Draw puzzle pedestal
      if (puzzlePedestal) {
        ctx.fillStyle = puzzlePedestal.isActivated ? '#ffd700' : '#8B4513';
        ctx.fillRect(puzzlePedestal.x, puzzlePedestal.y, puzzlePedestal.width, puzzlePedestal.height);
        
        // Add pedestal details
        ctx.fillStyle = puzzlePedestal.isActivated ? '#ffeb3b' : '#654321';
        ctx.fillRect(puzzlePedestal.x + 5, puzzlePedestal.y + 5, puzzlePedestal.width - 10, puzzlePedestal.height - 10);
        
        // Show collected shards count
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
          `${puzzlePedestal.collectedShards}/${puzzlePedestal.requiredShards}`,
          puzzlePedestal.x + puzzlePedestal.width / 2,
          puzzlePedestal.y + puzzlePedestal.height / 2 + 4
        );
        ctx.textAlign = 'left';
      }



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

  }, [player, snakes, walls, door, key, switches, throwableItems, carriedItem, levelSize, gameState, isWalking, currentVelocity, targetVelocity, mirrors, crystal, lightSource, lightBeam, currentLevel, patternTiles, puzzleShards, puzzlePedestal, getCurrentWalls, teleporters]);

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
        updateFlow(clampedDeltaTime);
        updateProjectiles(clampedDeltaTime);
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
