import React, { useRef, useEffect, useCallback } from "react";
import { useSnakeGame } from "../../lib/stores/useSnakeGame";
import { checkAABBCollision } from "../../lib/game/collision";

const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const fpsRef = useRef<number>(0);
  const frameTimesRef = useRef<number[]>([]);
  const lastFpsUpdateRef = useRef<number>(0);
  const playerImageRef = useRef<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = React.useState(false);

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
    levels,
    puzzleShards,
    puzzlePedestal,
    getCurrentWalls,
    teleporters,
    snakePits,
    boulders,
    miniBoulders,
    hintState,
    updateHint,
    patternSequence,
    randomizedSymbols,
  } = useSnakeGame();

  // Load player image
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      playerImageRef.current = img;
      setImageLoaded(true);
    };
    img.onerror = (error) => {
      setImageLoaded(false);
    };
    // Add cache busting parameter to ensure fresh load
    img.src = "/player-character.png?" + Date.now();
  }, []);

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      // Clear canvas with default background
      const backgroundColor = "#1a1a2e";
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, levelSize.width, levelSize.height);

      // Helper function to check if a position is in a dark quadrant (Level 5 only)
      const isInDarkQuadrant = (x: number, y: number): boolean => {
        if (currentLevel !== 4) return false; // Only Level 5 (0-indexed as 4)

        // Define quadrant boundaries based on the cross-shaped walls
        const centerX = 390; // Vertical wall position
        const centerY = 290; // Horizontal wall position

        // Get switch states for logic evaluation
        const A =
          switches.find((s) => s.id === "light_switch")?.isPressed || false;
        const B = switches.find((s) => s.id === "switch_1")?.isPressed || false;
        const C = switches.find((s) => s.id === "switch_2")?.isPressed || false;
        const D = switches.find((s) => s.id === "switch_3")?.isPressed || false;
        const E = switches.find((s) => s.id === "switch_4")?.isPressed || false;
        const F = switches.find((s) => s.id === "switch_5")?.isPressed || false;

        // Calculate lighting conditions for each quadrant
        const topLeftLit = (A && !B) || (!A && B); // A XOR B
        const topRightLit = C && D; // C AND D
        const bottomLeftLit = !(E && F); // NOT (E AND F)
        const bottomRightLit = topLeftLit && topRightLit; // (A XOR B) AND (C AND D)

        // Check which quadrant the position is in and return if it's dark
        if (x < centerX && y < centerY) {
          // Top-left quadrant
          return !topLeftLit;
        } else if (x >= centerX + 20 && y < centerY) {
          // Top-right quadrant
          return !topRightLit;
        } else if (x < centerX && y >= centerY + 20) {
          // Bottom-left quadrant
          return !bottomLeftLit;
        } else if (x >= centerX + 20 && y >= centerY + 20) {
          // Bottom-right quadrant
          return !bottomRightLit;
        }

        // Position is in the cross area (walls), not dark
        return false;
      };

      // Level 5 quadrant lighting effect with individual logic conditions
      if (currentLevel === 4) {
        // Level 5 (0-indexed as 4)
        // Define quadrant boundaries based on the cross-shaped walls
        const centerX = 390; // Vertical wall position
        const centerY = 290; // Horizontal wall position

        // Get switch states for logic evaluation
        const A =
          switches.find((s) => s.id === "light_switch")?.isPressed || false;
        const B = switches.find((s) => s.id === "switch_1")?.isPressed || false;
        const C = switches.find((s) => s.id === "switch_2")?.isPressed || false;
        const D = switches.find((s) => s.id === "switch_3")?.isPressed || false;
        const E = switches.find((s) => s.id === "switch_4")?.isPressed || false;
        const F = switches.find((s) => s.id === "switch_5")?.isPressed || false;

        // Calculate lighting conditions for each quadrant
        const topLeftLit = (A && !B) || (!A && B); // A XOR B
        const topRightLit = C && D; // C AND D
        const bottomLeftLit = !(E && F); // NOT (E AND F)
        const bottomRightLit = topLeftLit && topRightLit; // (A XOR B) AND (C AND D)

        ctx.fillStyle = "#000000";

        // Top-left quadrant - draw overlay if NOT lit
        if (!topLeftLit) {
          ctx.fillRect(0, 0, centerX, centerY);
        }

        // Top-right quadrant - draw overlay if NOT lit
        if (!topRightLit) {
          ctx.fillRect(
            centerX + 20,
            0,
            levelSize.width - (centerX + 20),
            centerY,
          );
        }

        // Bottom-left quadrant - draw overlay if NOT lit
        if (!bottomLeftLit) {
          ctx.fillRect(
            0,
            centerY + 20,
            centerX,
            levelSize.height - (centerY + 20),
          );
        }

        // Bottom-right quadrant - draw overlay if NOT lit
        if (!bottomRightLit) {
          ctx.fillRect(
            centerX + 20,
            centerY + 20,
            levelSize.width - (centerX + 20),
            levelSize.height - (centerY + 20),
          );
        }
      }

      // Add test border to see if canvas is drawing
      ctx.strokeStyle = "#ff0000";
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

        return patternTiles.find((tile) => {
          return (
            tile.id.startsWith("grid_tile_") &&
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
      
      // Debug: Log walls for Level 1 to help identify extra walls

      
      ctx.fillStyle = "#4a5568";
      currentWalls.forEach((wall) => {
        ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
      });

      // Draw static help text for Level 1 - always visible
      if (currentLevel === 1) {
        const centerX = levelSize.width / 2;
        const topY = 50;

        // Generate the help text directly from pattern sequence
        // Use randomized symbols if available, otherwise fall back to default
        let level1Symbols;
        if (randomizedSymbols) {
          level1Symbols = randomizedSymbols.map((symbol) => `  ${symbol}  `);
        } else {
          level1Symbols = [
            "  b  ",
            "  u  ",
            "  2  ",
            "  ♥️  ",
            "  iy  ",
            "  👁️  ",
            "  im  ",
            "  🛥️  ",
            "  50/50  ",
          ];
        }
        const helpText = patternSequence
          .map((index) => level1Symbols[index] || (index + 1).toString())
          .join(" ");

        // Set font with emoji support
        ctx.font =
          "24px 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', Arial, sans-serif";
        ctx.textAlign = "center";

        // Always visible static display
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.fillText(helpText, centerX, topY);

        // Reset text alignment
        ctx.textAlign = "left";

        // Draw animated rectangle after help text
        // Calculate animation progress - use game time for consistent animation
        const barHeight = 30;
        const barY = 30;
        const animationSpeed = 1; // pixels per frame
        const currentTime = Date.now();
        const animationOffset =
          Math.floor((currentTime / 16.67) * animationSpeed) % 660; // Reset every 660 frames

        const rectX = 120 + animationOffset;
        const shrinkRectWidth = Math.max(0, 660 - animationOffset);

        if (shrinkRectWidth > 0) {
          ctx.fillStyle = backgroundColor;
          ctx.fillRect(rectX, barY, shrinkRectWidth, barHeight);
        }

        // Draw a 2nd rectangle after the 1st rectangle - grows from left
        const growRectWidth = Math.min(660, animationOffset); // Grows as other shrinks

        if (growRectWidth > 0) {
          ctx.fillStyle = backgroundColor;
          ctx.fillRect(20, barY, growRectWidth, barHeight);
        }
      }

      // Draw switches and pressure plates
      switches.forEach((switchObj) => {
        if (switchObj.id.startsWith("pressure")) {
          // Draw pressure plate as a flat circular platform
          ctx.fillStyle = switchObj.isPressed ? "#48bb78" : "#a0aec0";
          ctx.beginPath();
          ctx.arc(
            switchObj.x + switchObj.width / 2,
            switchObj.y + switchObj.height / 2,
            switchObj.width / 2,
            0,
            2 * Math.PI,
          );
          ctx.fill();

          // Add inner circle for pressed state
          if (switchObj.isPressed) {
            ctx.fillStyle = "#2f855a";
            ctx.beginPath();
            ctx.arc(
              switchObj.x + switchObj.width / 2,
              switchObj.y + switchObj.height / 2,
              switchObj.width / 3,
              0,
              2 * Math.PI,
            );
            ctx.fill();
          }

          // Add border
          ctx.strokeStyle = "#2d3748";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(
            switchObj.x + switchObj.width / 2,
            switchObj.y + switchObj.height / 2,
            switchObj.width / 2,
            0,
            2 * Math.PI,
          );
          ctx.stroke();
        } else if (switchObj.switchType === "lever") {
          // Draw lever switch
          const centerX = switchObj.x + switchObj.width / 2;
          const baseY = switchObj.y + switchObj.height - 5;

          // Draw base plate
          ctx.fillStyle = "#4a5568";
          ctx.fillRect(switchObj.x, baseY, switchObj.width, 5);

          // Draw lever (angled based on state)
          const leverLength = switchObj.height - 8;
          const leverAngle = switchObj.isPressed ? -0.3 : 0.3; // Tilt left when pressed, right when not
          const leverEndX = centerX + Math.sin(leverAngle) * leverLength;
          const leverEndY = baseY - Math.cos(leverAngle) * leverLength;

          // Draw lever arm
          ctx.strokeStyle = switchObj.isPressed ? "#68d391" : "#f6ad55";
          ctx.lineWidth = 4;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(centerX, baseY);
          ctx.lineTo(leverEndX, leverEndY);
          ctx.stroke();

          // Draw lever handle
          ctx.fillStyle = switchObj.isPressed ? "#48bb78" : "#ed8936";
          ctx.beginPath();
          ctx.arc(leverEndX, leverEndY, 3, 0, 2 * Math.PI);
          ctx.fill();

          // Draw base border
          ctx.strokeStyle = "#2d3748";
          ctx.lineWidth = 2;
          ctx.strokeRect(switchObj.x, baseY, switchObj.width, 5);
        } else {
          // Draw regular switch as a rectangle
          ctx.fillStyle = switchObj.isPressed ? "#48bb78" : "#ed8936";
          ctx.fillRect(
            switchObj.x,
            switchObj.y,
            switchObj.width,
            switchObj.height,
          );

          // Add a small border
          ctx.strokeStyle = "#2d3748";
          ctx.lineWidth = 2;
          ctx.strokeRect(
            switchObj.x,
            switchObj.y,
            switchObj.width,
            switchObj.height,
          );
        }
      });

      // Draw pattern tiles
      patternTiles.forEach((tile) => {
        // Base tile color - no highlighting for Level 1
        if (currentLevel === 0) {
          // Level 1: No yellow highlighting, just gray or green
          if (tile.hasBeenActivated) {
            ctx.fillStyle = "#48bb78"; // Green when activated correctly
          } else {
            ctx.fillStyle = "#a0a0a0"; // Lighter gray when inactive
          }
        } else {
          // Other levels: Keep the original glowing effect
          if (tile.isGlowing) {
            ctx.fillStyle = "#ffd700"; // Gold when glowing
          } else if (tile.hasBeenActivated) {
            ctx.fillStyle = "#48bb78"; // Green when activated correctly
          } else {
            ctx.fillStyle = "#4a5568"; // Gray when inactive
          }
        }

        ctx.fillRect(tile.x, tile.y, tile.width, tile.height);

        // Check if this tile is locked (has flow entered it)
        const isLockedTile =
          flowState && flowState.lockedTiles.includes(tile.id);

        // Add highlight overlay for rotatable tiles with 20% opacity
        // Only show highlight on Level 4 and exclude start/end tiles
        if (
          currentLevel === 3 &&
          currentTile &&
          currentTile.id === tile.id &&
          levels[currentLevel]
        ) {
          const currentLevelData = levels[currentLevel];
          const startTileId = currentLevelData.startTilePos
            ? `grid_tile_${currentLevelData.startTilePos.row}_${currentLevelData.startTilePos.col}`
            : "grid_tile_3_0";
          const endTileId = currentLevelData.endTilePos
            ? `grid_tile_${currentLevelData.endTilePos.row}_${currentLevelData.endTilePos.col}`
            : "grid_tile_6_7";

          // Handle different tile highlighting
          if (currentTile.id === startTileId) {
            // Highlight start tile in red when flow cannot be started
            const currentFlowState = flowState;
            const canStartFlow = !currentFlowState || (!currentFlowState.isActive && !currentFlowState.isEmptying);
            
            if (!canStartFlow) {
              // Red overlay for start tile when it cannot be interacted with
              ctx.fillStyle = "rgba(255, 99, 99, 0.3)"; // Light red with 30% opacity
              ctx.fillRect(tile.x, tile.y, tile.width, tile.height);
            }
          } else if (currentTile.id === endTileId) {
            // Always highlight end tile in red since it has no interactions
            ctx.fillStyle = "rgba(255, 99, 99, 0.3)"; // Light red with 30% opacity
            ctx.fillRect(tile.x, tile.y, tile.width, tile.height);
          } else {
            // Normal highlighting for other tiles (not start or end)
            if (isLockedTile) {
              // Red overlay for locked tiles
              ctx.fillStyle = "rgba(255, 99, 99, 0.3)"; // Light red with 30% opacity
            } else {
              // Light blue overlay for rotatable tiles
              ctx.fillStyle = "rgba(173, 216, 230, 0.2)"; // Light blue with 20% opacity
            }
            ctx.fillRect(tile.x, tile.y, tile.width, tile.height);
          }
        }

        // Add border
        ctx.strokeStyle = "#2d3748";
        ctx.lineWidth = 2;
        ctx.strokeRect(tile.x, tile.y, tile.width, tile.height);

        // Add glow effect when tile is glowing (skip for Level 1)
        if (tile.isGlowing && currentLevel !== 0) {
          ctx.shadowColor = "#ffd700";
          ctx.shadowBlur = 20;
          ctx.fillStyle = "#ffeb3b";
          ctx.fillRect(
            tile.x + 5,
            tile.y + 5,
            tile.width - 10,
            tile.height - 10,
          );
          ctx.shadowBlur = 0;
        }

        // Draw custom graphics if they exist
        if (tile.customGraphics) {
          // Draw line first (so it appears behind the circle)
          if (tile.customGraphics.line) {
            const line = tile.customGraphics.line;
            ctx.strokeStyle = line.color;
            ctx.lineWidth = line.thickness;
            ctx.lineCap = "square"; // Flat line endings
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
            ctx.arc(
              circle.centerX,
              circle.centerY,
              circle.radius,
              0,
              2 * Math.PI,
            );
            ctx.fill();
          }
        }

        // Add sequence number/symbol - only if sequenceIndex >= 0
        if (tile.sequenceIndex >= 0) {
          ctx.font =
            "12px 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', Arial, sans-serif";
          ctx.textAlign = "center";

          // Custom symbols for Level 1, numbers for other levels
          let displaySymbol;
          if (currentLevel === 1) {
            // Use randomized symbols if available, otherwise fall back to default
            let level1Symbols;
            if (randomizedSymbols) {
              level1Symbols = randomizedSymbols;
            } else {
              level1Symbols = [
                "b",
                "u",
                "2",
                "♥️",
                "iy",
                "👁️",
                "im",
                "🛥️",
                "50/50",
              ];
            }
            displaySymbol =
              level1Symbols[tile.sequenceIndex] ||
              (tile.sequenceIndex + 1).toString();
          } else {
            // Other levels use numbers
            displaySymbol = (tile.sequenceIndex + 1).toString();
          }

          // Enhanced rendering for all symbols with better emoji support
          const centerX = tile.x + tile.width / 2;
          const centerY = tile.y + tile.height / 2 + 4;

          // Check if symbol contains emojis (specific ones we use)
          const hasEmoji =
            displaySymbol.includes("🛥️") ||
            displaySymbol.includes("👁️") ||
            displaySymbol.includes("♥️");

          if (hasEmoji) {
            // For emojis: Use shadowBlur to create an outline effect
            ctx.save(); // Save current context state

            // Create a black shadow that appears as an outline
            ctx.shadowColor = "#000000";
            ctx.shadowBlur = 3;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;

            // Draw the emoji multiple times to strengthen the shadow effect
            ctx.fillStyle = "#ffffff";
            ctx.fillText(displaySymbol, centerX, centerY);
            ctx.fillText(displaySymbol, centerX, centerY);
            ctx.fillText(displaySymbol, centerX, centerY);

            ctx.restore(); // Restore context state

            // Draw the main emoji without shadow
            ctx.fillStyle = "#ffffff";
            ctx.fillText(displaySymbol, centerX, centerY);
          } else {
            // For text: use traditional stroke method
            ctx.strokeStyle = "#000000";
            ctx.lineWidth = 3;
            ctx.strokeText(displaySymbol, centerX, centerY);

            ctx.fillStyle = "#ffffff";
            ctx.fillText(displaySymbol, centerX, centerY);
          }
        }

        // Add directional markers for Level 4 grid tiles
        if (tile.id.startsWith("grid_tile_")) {
          ctx.fillStyle = "#ffffff";
          ctx.font = "10px Arial";
          ctx.textAlign = "center";

          const centerX = tile.x + tile.width / 2;
          const centerY = tile.y + tile.height / 2;

          // Get the actual tile directions from the game state
          const tileDirections = getTileDirections(tile.id);

          // Map directions to display letters and positions
          const directionMap = {
            north: { letter: "N", x: tile.x + tile.width / 2, y: tile.y + 12 },
            south: {
              letter: "S",
              x: tile.x + tile.width / 2,
              y: tile.y + tile.height - 4,
            },
            west: {
              letter: "W",
              x: tile.x + 8,
              y: tile.y + tile.height / 2 + 4,
            },
            east: {
              letter: "E",
              x: tile.x + tile.width - 8,
              y: tile.y + tile.height / 2 + 4,
            },
          };

          const visibleMarkers = tileDirections.map(
            (direction) => directionMap[direction],
          );

          // Draw white lines from center to each visible marker
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 6;
          ctx.lineCap = "square";

          visibleMarkers.forEach((marker) => {
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);

            // Draw line to near the edge but not past the tile boundary
            const edgeOffset = 2; // Keep lines 2 pixels from tile edge
            if (marker.letter === "N") {
              ctx.lineTo(centerX, tile.y + edgeOffset);
            } else if (marker.letter === "S") {
              ctx.lineTo(centerX, tile.y + tile.height - edgeOffset);
            } else if (marker.letter === "W") {
              ctx.lineTo(tile.x + edgeOffset, centerY);
            } else if (marker.letter === "E") {
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
        ctx.strokeStyle = "#00ff00";
        ctx.lineWidth = 6;
        ctx.lineCap = "round";

        // Calculate entry and exit points for a tile
        const getEdgePoint = (
          tile: any,
          direction: "north" | "south" | "east" | "west" | null,
        ) => {
          if (!direction)
            return { x: tile.x + tile.width / 2, y: tile.y + tile.height / 2 };

          const centerX = tile.x + tile.width / 2;
          const centerY = tile.y + tile.height / 2;

          switch (direction) {
            case "north":
              return { x: centerX, y: tile.y };
            case "south":
              return { x: centerX, y: tile.y + tile.height };
            case "east":
              return { x: tile.x + tile.width, y: centerY };
            case "west":
              return { x: tile.x, y: centerY };
          }
        };

        // Draw all completed paths (excluding currently emptying tile during emptying phase)
        flowState.completedPaths.forEach((path) => {
          const tile = patternTiles.find((t) => t.id === path.tileId);
          if (!tile) return;

          // Skip drawing this tile if it's currently being emptied
          if (
            flowState.currentPhase === "emptying" &&
            path.tileId === flowState.emptyingFromTile
          ) {
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
          const currentTile = patternTiles.find(
            (tile) => tile.id === flowState.currentTile,
          );
          if (currentTile) {
            const centerX = currentTile.x + currentTile.width / 2;
            const centerY = currentTile.y + currentTile.height / 2;

            const entryPoint = getEdgePoint(
              currentTile,
              flowState.entryDirection,
            );
            const exitPoint = getEdgePoint(
              currentTile,
              flowState.exitDirection,
            );

            // Use different colors for emptying vs filling
            const flowColor = flowState.isEmptying ? "#ffffff" : "#00ff00";
            ctx.strokeStyle = flowColor;
            ctx.lineWidth = 6;
            ctx.lineCap = "round";

            // Draw flow based on phase
            if (flowState.currentPhase === "entry-to-center") {
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
            } else if (flowState.currentPhase === "center-to-exit") {
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
      if (
        flowState &&
        flowState.isBlocked &&
        flowState.lastPosition &&
        (!flowState.isActive || flowState.isEmptying)
      ) {
        const { x, y } = flowState.lastPosition;

        // Draw neon green "X" to indicate blocked flow
        ctx.strokeStyle = "#00ff00";
        ctx.lineWidth = 4;
        ctx.lineCap = "round";

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

        ctx.fillStyle = "rgba(0, 255, 0, 0.3)"; // Semi-transparent neon green fill
        ctx.beginPath();
        ctx.arc(x, y, pulseRadius, 0, 2 * Math.PI);
        ctx.fill();

        // Add neon green stroke outline
        ctx.strokeStyle = "#00ff00";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, pulseRadius, 0, 2 * Math.PI);
        ctx.stroke();

        // Reset shadow
        ctx.shadowBlur = 0;
      }

      // Draw throwable items
      throwableItems.forEach((item) => {
        if (item.isPickedUp && !item.isThrown) return; // Don't draw picked up items unless being thrown

        if (item.type === "rock") {
          // Draw rock as a gray/brown circle
          ctx.fillStyle = "#8b7355";
          ctx.beginPath();
          ctx.arc(
            item.x + item.width / 2,
            item.y + item.height / 2,
            item.width / 2,
            0,
            2 * Math.PI,
          );
          ctx.fill();

          // Add darker center for texture
          ctx.fillStyle = "#6d5a47";
          ctx.beginPath();
          ctx.arc(
            item.x + item.width / 2,
            item.y + item.height / 2,
            item.width / 3,
            0,
            2 * Math.PI,
          );
          ctx.fill();
        } else if (item.type === "chubbs_hand") {
          // Draw Chubbs's hand as a flesh-colored hand shape
          ctx.fillStyle = "#f4a460";
          ctx.fillRect(item.x, item.y, item.width, item.height);

          // Add fingers
          ctx.fillStyle = "#d2691e";
          ctx.fillRect(item.x + 5, item.y, 3, 8);
          ctx.fillRect(item.x + 10, item.y, 3, 10);
          ctx.fillRect(item.x + 15, item.y, 3, 9);
          ctx.fillRect(item.x + 20, item.y, 3, 7);
        } else if (item.type === "elis_hip") {
          // Draw Eli's hip as a bone-like shape
          ctx.fillStyle = "#f5f5dc";
          ctx.fillRect(item.x, item.y, item.width, item.height);

          // Add bone joints
          ctx.fillStyle = "#deb887";
          ctx.fillRect(item.x, item.y + 5, 6, 15);
          ctx.fillRect(item.x + 19, item.y + 5, 6, 15);
          ctx.fillRect(item.x + 6, item.y + 8, 13, 9);
        } else if (item.type === "barbra_hat") {
          // Draw Barbra Streisand hat as a fancy hat
          ctx.fillStyle = "#8b4513";
          ctx.fillRect(item.x, item.y + 10, item.width, 10);

          // Hat top
          ctx.fillStyle = "#654321";
          ctx.fillRect(item.x + 5, item.y, 15, 15);

          // Hat decoration
          ctx.fillStyle = "#ffd700";
          ctx.fillRect(item.x + 8, item.y + 3, 9, 3);
        } else if (item.type === "box_of_golf_balls") {
          // Draw box of golf balls
          ctx.fillStyle = "#8b4513";
          ctx.fillRect(item.x, item.y, item.width, item.height);
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(item.x + 6, item.y + 6, 3, 0, 2 * Math.PI);
          ctx.arc(item.x + 16, item.y + 6, 3, 0, 2 * Math.PI);
          ctx.arc(item.x + 6, item.y + 16, 3, 0, 2 * Math.PI);
          ctx.fill();
        } else if (item.type === "4_iron") {
          // Draw 4 iron golf club
          ctx.fillStyle = "#c0c0c0";
          ctx.fillRect(item.x + 8, item.y, 4, item.height);
          ctx.fillStyle = "#8b4513";
          ctx.fillRect(item.x, item.y + item.height - 8, 15, 8);
        } else if (item.type === "the_prophecy") {
          // Draw ancient scroll
          ctx.fillStyle = "#f5deb3";
          ctx.fillRect(item.x, item.y + 3, item.width, item.height - 6);
          ctx.fillStyle = "#8b4513";
          ctx.fillRect(item.x, item.y, item.width, 3);
          ctx.fillRect(item.x, item.y + item.height - 3, item.width, 3);
        } else if (item.type === "hammer") {
          // Draw hammer
          ctx.fillStyle = "#8b4513";
          ctx.fillRect(item.x + 8, item.y + 5, 4, 15);
          ctx.fillStyle = "#696969";
          ctx.fillRect(item.x, item.y, item.width, 8);
        } else if (item.type === "box_of_nails") {
          // Draw box of nails
          ctx.fillStyle = "#8b4513";
          ctx.fillRect(item.x, item.y, item.width, item.height);
          ctx.fillStyle = "#c0c0c0";
          for (let i = 0; i < 3; i++) {
            ctx.fillRect(item.x + 3 + i * 6, item.y + 3, 2, 8);
          }
        } else if (item.type === "bag_of_concrete") {
          // Draw concrete bag
          ctx.fillStyle = "#a0a0a0";
          ctx.fillRect(item.x, item.y, item.width, item.height);
          ctx.fillStyle = "#696969";
          ctx.fillRect(item.x + 2, item.y + 2, item.width - 4, 3);
        } else if (item.type === "the_blue_album") {
          // Draw blue album
          ctx.fillStyle = "#4169e1";
          ctx.fillRect(item.x, item.y, item.width, item.height);
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(item.x + 5, item.y + 5, item.width - 10, 3);
          ctx.fillRect(item.x + 5, item.y + 10, item.width - 10, 2);
        } else if (item.type === "origami_book") {
          // Draw origami book
          ctx.fillStyle = "#ff6347";
          ctx.fillRect(item.x, item.y, item.width, item.height);
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(item.x + 3, item.y + 3, 8, 8);
          ctx.fillStyle = "#ff6347";
          ctx.fillRect(item.x + 5, item.y + 5, 4, 4);
        } else if (item.type === "tennis_racket") {
          // Draw tennis racket
          ctx.fillStyle = "#8b4513";
          ctx.fillRect(item.x + 8, item.y + 10, 4, 15);
          ctx.strokeStyle = "#8b4513";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(item.x + 10, item.y + 8, 8, 0, 2 * Math.PI);
          ctx.stroke();
        } else if (item.type === "yoga_block") {
          // Draw yoga block
          ctx.fillStyle = "#9370db";
          ctx.fillRect(item.x, item.y, item.width, item.height);
          ctx.fillStyle = "#8a2be2";
          ctx.fillRect(item.x + 2, item.y + 2, item.width - 4, item.height - 4);
        }

        // Add pickup indicator if player is nearby and not carrying anything
        if (!item.isPickedUp && !carriedItem) {
          // Use the exact same AABB collision detection as the pickup logic
          const playerRect = {
            x: player.position.x,
            y: player.position.y,
            width: player.size.width,
            height: player.size.height,
          };

          const itemRect = {
            x: item.x,
            y: item.y,
            width: item.width,
            height: item.height,
          };

          // Check AABB collision - exact same logic as pickupItem function
          const canPickup =
            playerRect.x < itemRect.x + itemRect.width &&
            playerRect.x + playerRect.width > itemRect.x &&
            playerRect.y < itemRect.y + itemRect.height &&
            playerRect.y + playerRect.height > itemRect.y;

          if (canPickup) {
            // Draw white text with black outline
            ctx.font = "12px Arial";
            ctx.textAlign = "center";

            // Draw black outline (stroke)
            ctx.strokeStyle = "#000000";
            ctx.lineWidth = 3;
            ctx.strokeText("E to pick up", item.x + item.width / 2, item.y - 5);

            // Draw white fill
            ctx.fillStyle = "#ffffff";
            ctx.fillText("E to pick up", item.x + item.width / 2, item.y - 5);

            ctx.textAlign = "left";
          }
        }
      });

      // Draw key (if not collected)
      if (!key.collected) {
        ctx.fillStyle = "#ffd700";
        ctx.fillRect(key.x, key.y, key.width, key.height);

        // Add sparkle effect
        ctx.fillStyle = "#ffeb3b";
        ctx.fillRect(key.x + 5, key.y + 5, 10, 10);
      }

      // Draw door
      ctx.fillStyle = door.isOpen ? "#48bb78" : "#e53e3e";
      ctx.fillRect(door.x, door.y, door.width, door.height);

      // Add door details
      ctx.strokeStyle = "#2d3748";
      ctx.lineWidth = 3;
      ctx.strokeRect(door.x, door.y, door.width, door.height);

      if (door.isOpen) {
        ctx.fillStyle = "#2d3748";
        ctx.fillRect(door.x + 5, door.y + 15, 5, 10);
      }

      // Draw teleporters (Level 5 only - before snakes so they appear under snakes)
      if (currentLevel === 4) {
        // Level 5 (0-indexed as 4)
        teleporters.forEach((teleporter) => {
          if (teleporter.type === "sender") {
            // Draw teleporter pad with faster pulsing effect
            const pulseTime = Date.now() / 400; // Increased speed from 800 to 400
            const pulseAlpha = teleporter.isActive
              ? 1.0
              : 0.6 + 0.4 * Math.sin(pulseTime);

            // Outer ring
            ctx.fillStyle = teleporter.isActive
              ? `rgba(0, 255, 255, ${pulseAlpha})`
              : `rgba(0, 150, 255, ${pulseAlpha})`;
            ctx.fillRect(
              teleporter.x,
              teleporter.y,
              teleporter.width,
              teleporter.height,
            );

            // Inner circle
            ctx.fillStyle = teleporter.isActive
              ? `rgba(255, 255, 255, ${pulseAlpha})`
              : `rgba(100, 200, 255, ${pulseAlpha})`;
            const innerSize = teleporter.width * 0.6;
            const innerOffset = (teleporter.width - innerSize) / 2;
            ctx.fillRect(
              teleporter.x + innerOffset,
              teleporter.y + innerOffset,
              innerSize,
              innerSize,
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

              ctx.strokeStyle = "rgba(0, 255, 255, 0.8)";
              ctx.lineWidth = 4;
              ctx.beginPath();
              ctx.arc(
                centerX,
                centerY,
                radius,
                -Math.PI / 2,
                -Math.PI / 2 + progress * 2 * Math.PI,
              );
              ctx.stroke();

              // Extra glow when near completion
              if (progress > 0.8) {
                ctx.shadowColor = "#00ffff";
                ctx.shadowBlur = 15;
                ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(
                  centerX,
                  centerY,
                  radius,
                  -Math.PI / 2,
                  -Math.PI / 2 + progress * 2 * Math.PI,
                );
                ctx.stroke();
                ctx.shadowBlur = 0;
              }
            }

            // Activation glow effect (static when active)
            if (teleporter.isActive) {
              ctx.shadowColor = "#00ffff";
              ctx.shadowBlur = 20;
              ctx.fillStyle = "rgba(0, 255, 255, 0.8)";
              ctx.fillRect(
                teleporter.x,
                teleporter.y,
                teleporter.width,
                teleporter.height,
              );
              ctx.shadowBlur = 0;
            }
          } else if (teleporter.type === "receiver") {
            // Draw receiver pad with static color (no animation)
            const staticAlpha = 0.7; // No pulsing animation

            // Outer ring
            ctx.fillStyle = `rgba(255, 100, 0, ${staticAlpha})`;
            ctx.fillRect(
              teleporter.x,
              teleporter.y,
              teleporter.width,
              teleporter.height,
            );

            // Inner circle
            ctx.fillStyle = `rgba(255, 200, 100, ${staticAlpha})`;
            const innerSize = teleporter.width * 0.6;
            const innerOffset = (teleporter.width - innerSize) / 2;
            ctx.fillRect(
              teleporter.x + innerOffset,
              teleporter.y + innerOffset,
              innerSize,
              innerSize,
            );
          }
        });
      }

      // Draw snake pits (holes in the ground)
      snakePits.forEach((pit) => {
        // Check if pit is being hit by light (change color to dark yellow)
        const isLightHit = pit.isLightHit || false;

        // Draw the pit as a dark circular hole
        ctx.fillStyle = isLightHit ? "#1a1a00" : "#0a0a0a"; // Dark yellow if hit, black otherwise
        ctx.beginPath();
        ctx.arc(pit.x, pit.y, pit.radius, 0, 2 * Math.PI);
        ctx.fill();

        // Add a gradient effect for depth
        const gradient = ctx.createRadialGradient(
          pit.x,
          pit.y,
          0,
          pit.x,
          pit.y,
          pit.radius,
        );
        if (isLightHit) {
          // Dark yellow gradient when light hits
          gradient.addColorStop(0, "#2a2a00"); // Darker yellow center
          gradient.addColorStop(0.7, "#1a1a00"); // Dark yellow
          gradient.addColorStop(1, "#333300"); // Yellowish edge
        } else {
          // Normal black gradient
          gradient.addColorStop(0, "#000000"); // Black center
          gradient.addColorStop(0.7, "#1a1a1a"); // Dark gray
          gradient.addColorStop(1, "#333333"); // Lighter edge
        }
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(pit.x, pit.y, pit.radius, 0, 2 * Math.PI);
        ctx.fill();

        // Add subtle border to make it more visible
        ctx.strokeStyle = isLightHit ? "#555500" : "#444444"; // Yellowish border if hit
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pit.x, pit.y, pit.radius, 0, 2 * Math.PI);
        ctx.stroke();
      });

      // Draw boulders (Level 6 only)
      if (currentLevel === 5) {
        // Level 6 (0-indexed as 5)
        boulders.forEach((boulder) => {
          if (boulder.isDestroyed) return; // Don't draw destroyed boulders

          // Base boulder color - darker brown/gray
          const baseColor = "#4a4a4a"; // Gray boulder color
          ctx.fillStyle = baseColor;
          ctx.fillRect(boulder.x, boulder.y, boulder.width, boulder.height);

          // Add rock texture with lighter spots
          ctx.fillStyle = "#666666";
          ctx.fillRect(boulder.x + 10, boulder.y + 10, 20, 15);
          ctx.fillRect(boulder.x + 40, boulder.y + 20, 25, 20);
          ctx.fillRect(boulder.x + 15, boulder.y + 45, 30, 20);
          ctx.fillRect(boulder.x + 50, boulder.y + 50, 20, 20);

          // Add darker shadows for depth
          ctx.fillStyle = "#2a2a2a";
          ctx.fillRect(boulder.x + 60, boulder.y + 60, 15, 15);
          ctx.fillRect(boulder.x + 5, boulder.y + 65, 20, 10);

          // Add border to make it stand out
          ctx.strokeStyle = "#333333";
          ctx.lineWidth = 2;
          ctx.strokeRect(boulder.x, boulder.y, boulder.width, boulder.height);
          // Add damage indicator if damaged
          if (boulder.hitCount > 0 && boulder.hitCount < boulder.maxHits) {
            // Add crack effect
            ctx.strokeStyle = "#000000";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(boulder.x + 20, boulder.y + 10);
            ctx.lineTo(boulder.x + 60, boulder.y + 70);
            ctx.moveTo(boulder.x + 40, boulder.y + 5);
            ctx.lineTo(boulder.x + 30, boulder.y + 75);
            ctx.stroke();
          }
        });
      }

      // Draw mini boulders (falling environmental effects)
      miniBoulders.forEach((miniBoulder) => {
        // Base mini boulder color - similar to regular boulders but smaller
        const baseColor = "#4a4a4a";
        ctx.fillStyle = baseColor;
        ctx.fillRect(miniBoulder.position.x, miniBoulder.position.y, miniBoulder.size.width, miniBoulder.size.height);

        // Add simple texture for mini boulders
        ctx.fillStyle = "#666666";
        ctx.fillRect(miniBoulder.position.x + 3, miniBoulder.position.y + 3, 6, 6);
        ctx.fillRect(miniBoulder.position.x + 12, miniBoulder.position.y + 8, 5, 7);

        // Add darker shadow
        ctx.fillStyle = "#2a2a2a";
        ctx.fillRect(miniBoulder.position.x + 15, miniBoulder.position.y + 15, 3, 3);

        // Add border
        ctx.strokeStyle = "#333333";
        ctx.lineWidth = 1;
        ctx.strokeRect(miniBoulder.position.x, miniBoulder.position.y, miniBoulder.size.width, miniBoulder.size.height);
      });

      // Draw snakes with different visuals for each type
      // On Level 3, skip snakes here so they render on top of mirrors
      snakes.forEach((snake) => {
        // Skip drawing rattlesnakes that are in the pit
        if (snake.type === "rattlesnake" && snake.isInPit) {
          return;
        }
        // Skip drawing snakes on Level 3 - they'll be drawn after mirrors
        if (currentLevel === 2) {
          return;
        }
        // Skip rendering phase-restricted snakes that aren't in their active phase
        // For now, render all snakes (phase system can be enhanced later)
        // if (snake.activePhase && currentLevel === 4 && snake.activePhase !== currentPhase) {
        //   return; // Don't render this snake
        // }
        let baseColor = "#2d3748";
        let accentColor = "#ff6b6b";
        let eyeColor = "#ff6b6b";

        // Different colors and indicators for each snake type
        switch (snake.type) {
          case "stalker":
            baseColor = snake.isChasing ? "#805ad5" : "#553c9a"; // Purple
            accentColor = "#d69e2e"; // Gold accents
            eyeColor = "#2d3748"; // No visible eyes (blind)
            break;
          case "guard":
            baseColor = snake.isChasing ? "#e53e3e" : "#c53030"; // Red
            accentColor = "#f56565";
            eyeColor = "#ff6b6b"; // Red eyes (good sight)
            break;
          case "burster":
            baseColor = snake.isDashing ? "#f6ad55" : "#dd6b20"; // Orange
            accentColor = snake.isDashing ? "#fbb6ce" : "#e53e3e";
            eyeColor = "#f6ad55"; // Orange eyes
            break;
          case "screensaver":
            baseColor = "#38b2ac"; // Teal/cyan
            accentColor = "#4fd1c7"; // Lighter teal
            eyeColor = "#2d3748"; // Dark eyes
            break;
          case "plumber":
            baseColor = "#8b4513"; // Brown/copper color for plumber
            accentColor = "#ffd700"; // Gold accent for pipe-like appearance
            eyeColor = "#4682b4"; // Steel blue eyes
            break;
          case "spitter":
            baseColor = "#2d7d32"; // Dark green for spitter
            accentColor = "#00ff41"; // Neon green accent
            eyeColor = "#00ff41"; // Neon green eyes
            break;
          case "photophobic":
            // Change colors based on state
            if (snake.isInDarkness) {
              baseColor = "#4a5568"; // Dark gray when in darkness
              accentColor = "#718096"; // Lighter gray
              eyeColor = "#a0aec0"; // Light gray eyes
            } else if (snake.isBerserk) {
              baseColor = snake.isCharging ? "#ff0000" : "#cc0000"; // Bright red when berserk
              accentColor = snake.isCharging ? "#ff6b6b" : "#e53e3e";
              eyeColor = "#ffff00"; // Yellow eyes when aggressive
            } else {
              baseColor = "#805ad5"; // Purple default
              accentColor = "#b794f6";
              eyeColor = "#d69e2e";
            }
            break;
          case "rattlesnake":
            baseColor = snake.isChasing ? "#8b4513" : "#a0522d"; // Brown/tan
            accentColor = "#daa520"; // Golden accents
            eyeColor = snake.isChasing ? "#ff4500" : "#ffd700"; // Orange/gold eyes
            break;
          case "boss":
            // Boss "Valerie" - changes color based on charging state
            if (snake.bossColor === 'charging') {
              baseColor = "#ff1493"; // Deep pink when charging
              accentColor = "#ff69b4"; // Hot pink accents
              eyeColor = "#ffffff"; // White eyes when charging
            } else {
              baseColor = "#4b0082"; // Indigo/purple (regal boss color)
              accentColor = "#8a2be2"; // Blue violet accents
              eyeColor = "#ffd700"; // Gold eyes (intimidating)
            }
            break;
          case "phantom":
            // Phantom - Semi-transparent version of Valerie (Phase 2 phantom)
            baseColor = "#4b0082"; // Same indigo as Valerie
            accentColor = "#8a2be2"; // Same blue violet accents  
            eyeColor = "#ffd700"; // Same golden eyes
            break;
          case "rainsnake":
            baseColor = "#4f46e5"; // Deep blue like rain
            accentColor = "#a5b4fc"; // Light blue like water droplets
            eyeColor = "#3b82f6"; // Bright blue eyes
            break;
          case "friendly":
            baseColor = "#FFB74D"; // Warm orange/gold for Game Master
            accentColor = "#FFA726"; // Lighter orange
            eyeColor = "#4CAF50"; // Green eyes to show friendliness
            break;
        }

        // Set transparency for phantoms
        if (snake.type === "phantom") {
          ctx.globalAlpha = 0.5; // 50% transparency for phantoms
        }

        // Main body
        ctx.fillStyle = baseColor;
        ctx.fillRect(
          snake.position.x,
          snake.position.y,
          snake.size.width,
          snake.size.height,
        );

        // Body pattern based on type
        ctx.fillStyle = accentColor;
        if (snake.type === "stalker") {
          // Stripes for stalkers (sound-following pattern)
          for (let i = 0; i < 3; i++) {
            ctx.fillRect(
              snake.position.x + i * 8,
              snake.position.y + 2,
              4,
              snake.size.height - 4,
            );
          }
        } else if (snake.type === "guard") {
          // Crosshatch for guards (patrol pattern)
          ctx.fillRect(
            snake.position.x + 2,
            snake.position.y + 2,
            snake.size.width - 4,
            4,
          );
          ctx.fillRect(
            snake.position.x + 2,
            snake.position.y + snake.size.height - 6,
            snake.size.width - 4,
            4,
          );
        } else if (snake.type === "burster") {
          // Diamond shape for bursters (dash pattern)
          ctx.fillRect(
            snake.position.x + snake.size.width / 2 - 4,
            snake.position.y + 2,
            8,
            8,
          );
          ctx.fillRect(
            snake.position.x + snake.size.width / 2 - 4,
            snake.position.y + snake.size.height - 10,
            8,
            8,
          );
        } else if (snake.type === "screensaver") {
          // Grid pattern for screensaver (screensaver-like pattern)
          ctx.fillRect(snake.position.x + 3, snake.position.y + 3, 6, 6);
          ctx.fillRect(snake.position.x + 15, snake.position.y + 3, 6, 6);
          ctx.fillRect(snake.position.x + 3, snake.position.y + 15, 6, 6);
          ctx.fillRect(snake.position.x + 15, snake.position.y + 15, 6, 6);
        } else if (snake.type === "plumber") {
          // Pipe junction pattern for plumber (cross shape like pipe fittings)
          const centerX = snake.position.x + snake.size.width / 2;
          const centerY = snake.position.y + snake.size.height / 2;
          // Horizontal pipe
          ctx.fillRect(
            snake.position.x + 2,
            centerY - 2,
            snake.size.width - 4,
            4,
          );
          // Vertical pipe
          ctx.fillRect(
            centerX - 2,
            snake.position.y + 2,
            4,
            snake.size.height - 4,
          );
        } else if (snake.type === "spitter") {
          // Star/explosion pattern for spitter (represents projectile firing)
          const centerX = snake.position.x + snake.size.width / 2;
          const centerY = snake.position.y + snake.size.height / 2;
          // 8-pointed star pattern
          ctx.fillRect(
            centerX - 1,
            snake.position.y + 2,
            2,
            snake.size.height - 4,
          ); // Vertical
          ctx.fillRect(
            snake.position.x + 2,
            centerY - 1,
            snake.size.width - 4,
            2,
          ); // Horizontal
          // Diagonal lines
          ctx.fillRect(centerX - 5, centerY - 1, 10, 2); // Diagonal 1
          ctx.fillRect(centerX - 1, centerY - 5, 2, 10); // Diagonal 2
        } else if (snake.type === "photophobic") {
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
            ctx.fillRect(
              snake.position.x + 3,
              snake.position.y + 3,
              snake.size.width - 6,
              3,
            );
            ctx.fillRect(
              snake.position.x + 8,
              snake.position.y + 8,
              snake.size.width - 16,
              2,
            );
            ctx.fillRect(
              snake.position.x + 5,
              snake.position.y + 13,
              snake.size.width - 10,
              3,
            );
            ctx.fillRect(
              snake.position.x + 10,
              snake.position.y + 18,
              snake.size.width - 20,
              2,
            );
          }
        } else if (snake.type === "rattlesnake") {
          // Diamond/rattle pattern for rattlesnake
          const centerX = snake.position.x + snake.size.width / 2;
          const centerY = snake.position.y + snake.size.height / 2;

          // Diamond pattern to represent rattle segments
          ctx.fillRect(centerX - 3, snake.position.y + 3, 6, 4);
          ctx.fillRect(centerX - 4, snake.position.y + 8, 8, 4);
          ctx.fillRect(centerX - 3, snake.position.y + 13, 6, 4);
          ctx.fillRect(centerX - 2, snake.position.y + 18, 4, 4);

          // Add rattle sound indicator when chasing
          if (snake.isChasing) {
            ctx.strokeStyle = "#ffd700";
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 2]);
            ctx.beginPath();
            ctx.arc(centerX, centerY, snake.size.width / 2 + 8, 0, 2 * Math.PI);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        } else if (snake.type === "rainsnake") {
          // Water droplet pattern for rain snakes (falling rain effect)
          const centerX = snake.position.x + snake.size.width / 2;
          
          // Vertical droplet pattern to represent falling rain
          ctx.fillRect(centerX - 2, snake.position.y + 2, 4, 6);
          ctx.fillRect(centerX - 1, snake.position.y + 10, 2, 8);
          ctx.fillRect(centerX - 3, snake.position.y + 20, 6, 4);
          
          // Small droplet at top
          ctx.fillRect(centerX - 1, snake.position.y + 30, 2, 4);
        } else if (snake.type === "friendly") {
          // Crown pattern for Game Master (friendly NPC)
          const centerX = snake.position.x + snake.size.width / 2;
          
          // Crown points
          ctx.fillRect(centerX - 8, snake.position.y + 2, 4, 8);
          ctx.fillRect(centerX - 4, snake.position.y + 2, 4, 12);
          ctx.fillRect(centerX, snake.position.y + 2, 4, 8);
          ctx.fillRect(centerX + 4, snake.position.y + 2, 4, 12);
          
          // Crown base
          ctx.fillRect(centerX - 10, snake.position.y + 10, 20, 4);
        }

        // Add snake eyes (stalkers have no visible eyes)
        if (snake.type !== "stalker") {
          // Check if snake is in dark quadrant on level 5 for yellow eyes
          let finalEyeColor = eyeColor;
          if (currentLevel === 4) {
            // Level 5 (0-indexed as 4)
            const snakeCenterX = snake.position.x + snake.size.width / 2;
            const snakeCenterY = snake.position.y + snake.size.height / 2;

            // Use the same dark quadrant logic as for silhouettes
            const centerX = 390; // Vertical wall position
            const centerY = 290; // Horizontal wall position

            // Get switch states for lighting logic
            const A =
              switches.find((s) => s.id === "light_switch")?.isPressed || false;
            const B =
              switches.find((s) => s.id === "switch_1")?.isPressed || false;
            const C =
              switches.find((s) => s.id === "switch_2")?.isPressed || false;
            const D =
              switches.find((s) => s.id === "switch_3")?.isPressed || false;
            const E =
              switches.find((s) => s.id === "switch_4")?.isPressed || false;
            const F =
              switches.find((s) => s.id === "switch_5")?.isPressed || false;

            // Calculate lighting conditions for each quadrant
            const topLeftLit = (A && !B) || (!A && B); // A XOR B
            const topRightLit = C && D; // C AND D
            const bottomLeftLit = !(E && F); // NOT (E AND F)
            const bottomRightLit = topLeftLit && topRightLit; // (A XOR B) AND (C AND D)

            // Check if snake is in a dark quadrant
            let isInDark = false;
            if (snakeCenterX < centerX && snakeCenterY < centerY)
              isInDark = !topLeftLit;
            else if (snakeCenterX > centerX + 20 && snakeCenterY < centerY)
              isInDark = !topRightLit;
            else if (snakeCenterX < centerX && snakeCenterY > centerY + 20)
              isInDark = !bottomLeftLit;
            else if (snakeCenterX > centerX + 20 && snakeCenterY > centerY + 20)
              isInDark = !bottomRightLit;

            if (isInDark) {
              finalEyeColor = "#ffff00"; // Yellow eyes in dark areas
            }
          }

          ctx.fillStyle = finalEyeColor;
          ctx.fillRect(snake.position.x + 5, snake.position.y + 5, 4, 4);
          ctx.fillRect(snake.position.x + 15, snake.position.y + 5, 4, 4);
        }

        // Special dash indicator for bursters
        if (snake.type === "burster" && snake.isDashing) {
          ctx.fillStyle = "#fff5b4";
          ctx.strokeStyle = "#f6ad55";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(
            snake.position.x + snake.size.width / 2,
            snake.position.y + snake.size.height / 2,
            snake.size.width / 2 + 5,
            0,
            2 * Math.PI,
          );
          ctx.stroke();
        }

        // Draw sight range when chasing (for visual feedback) - not for stalkers
        if (snake.isChasing && snake.type !== "stalker") {
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
        
        // Display phase number above boss snake (Valerie)
        if (snake.type === "boss" && snake.bossPhase) {
          ctx.font = "bold 18px Arial";
          ctx.textAlign = "center";
          
          // Draw text outline (black)
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 3;
          ctx.strokeText(
            `Phase ${snake.bossPhase}`,
            snake.position.x + snake.size.width / 2,
            snake.position.y - 10
          );
          
          // Draw text fill (white)
          ctx.fillStyle = "#ffffff";
          ctx.fillText(
            `Phase ${snake.bossPhase}`,
            snake.position.x + snake.size.width / 2,
            snake.position.y - 10
          );
          
          ctx.textAlign = "left"; // Reset text alignment
        }

        // Display Game Master interaction prompt (only on Level 0)
        if (snake.type === "friendly" && currentLevel === 0) {
          const distance = Math.sqrt(
            Math.pow(player.position.x - snake.position.x, 2) +
            Math.pow(player.position.y - snake.position.y, 2)
          );
          
          if (distance < 80) {
            ctx.font = "16px Arial";
            ctx.textAlign = "center";
            
            // Draw "Game Master" name
            ctx.strokeStyle = "#000000";
            ctx.lineWidth = 3;
            ctx.strokeText(
              "Game Master",
              snake.position.x + snake.size.width / 2,
              snake.position.y - 10
            );
            ctx.fillStyle = "#ffffff";
            ctx.fillText(
              "Game Master",
              snake.position.x + snake.size.width / 2,
              snake.position.y - 10
            );
            
            // Draw interaction prompt
            ctx.strokeText(
              "Press E to start adventure",
              snake.position.x + snake.size.width / 2,
              snake.position.y + snake.size.height + 25
            );
            ctx.fillStyle = "#4CAF50";
            ctx.fillText(
              "Press E to start adventure",
              snake.position.x + snake.size.width / 2,
              snake.position.y + snake.size.height + 25
            );
            
            ctx.textAlign = "left"; // Reset text alignment
          }
        }

        // Reset transparency for phantom snakes
        if (snake.type === "phantom") {
          ctx.globalAlpha = 1.0; // Reset transparency
        }
      });

      // Draw light reflection elements (mirrors, crystal, light beam)

      // Note: For Level 5, the lighting effect is now handled by the background quadrant system above
      // No physical light source object is rendered - the lighting is environmental

      // Draw player (different color when walking) - except on level 3 where it's drawn after light beam
      if (currentLevel !== 2) {
        // Not level 3
        // Implement flashing effect when invincible
        const shouldFlash =
          player.isInvincible && Math.floor(Date.now() / 100) % 2 === 0;
        if (!shouldFlash) {
          if (imageLoaded && playerImageRef.current) {
            // Draw custom player image
            ctx.drawImage(
              playerImageRef.current,
              player.position.x,
              player.position.y,
              player.size.width,
              player.size.height,
            );

            // Apply color tint for walking state if needed
            if (isWalking) {
              ctx.globalCompositeOperation = "multiply";
              ctx.fillStyle = "rgba(56, 161, 105, 0.3)"; // Green tint when walking
              ctx.fillRect(
                player.position.x,
                player.position.y,
                player.size.width,
                player.size.height,
              );
              ctx.globalCompositeOperation = "source-over";
            }
          } else {
            // Fallback to original rectangle drawing
            ctx.fillStyle = isWalking ? "#38a169" : "#4299e1"; // Green when walking, blue when running
            ctx.fillRect(
              player.position.x,
              player.position.y,
              player.size.width,
              player.size.height,
            );

            // Add player details
            ctx.fillStyle = isWalking ? "#2f855a" : "#2b6cb0"; // Darker green/blue for details
            ctx.fillRect(player.position.x + 5, player.position.y + 5, 15, 15);

            // Player eyes
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(player.position.x + 7, player.position.y + 7, 3, 3);
            ctx.fillRect(player.position.x + 15, player.position.y + 7, 3, 3);
          }

          // Walking indicator - small stealth icon
          if (isWalking) {
            ctx.fillStyle = "#68d391";
            ctx.fillRect(player.position.x - 3, player.position.y - 3, 6, 6);
            ctx.fillStyle = "#38a169";
            ctx.fillRect(player.position.x - 2, player.position.y - 2, 4, 4);
          }

          // Show key indicator if player has key
          if (player.hasKey) {
            ctx.fillStyle = "#ffd700";
            ctx.fillRect(player.position.x - 5, player.position.y - 5, 8, 8);
          }
        }
      }

      // Helper function to draw text with white fill and black outline
      const drawTooltipText = (text: string, x: number, y: number) => {
        ctx.font = "12px Arial";
        ctx.textAlign = "center";

        // Draw black outline (stroke)
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 3;
        ctx.strokeText(text, x, y);

        // Draw white fill
        ctx.fillStyle = "#ffffff";
        ctx.fillText(text, x, y);

        ctx.textAlign = "left";
      };

      // Show tooltips for Level 4 tiles
      if (currentLevel === 3 && currentTile && levels[currentLevel]) {
        const currentLevelData = levels[currentLevel];
        const startTileId = currentLevelData.startTilePos
          ? `grid_tile_${currentLevelData.startTilePos.row}_${currentLevelData.startTilePos.col}`
          : "grid_tile_3_0";
        const endTileId = currentLevelData.endTilePos
          ? `grid_tile_${currentLevelData.endTilePos.row}_${currentLevelData.endTilePos.col}`
          : "grid_tile_6_7";

        if (currentTile.id === startTileId) {
          // Only show "E to start" if flow can actually be started
          const currentFlowState = flowState;
          const canStartFlow = !currentFlowState || (!currentFlowState.isActive && !currentFlowState.isEmptying);
          
          if (canStartFlow) {
            drawTooltipText(
              "E to start",
              player.position.x + player.size.width / 2,
              player.position.y - 10,
            );
          }
        } else if (currentTile.id !== endTileId) {
          // Show "Q/E to rotate" on rotatable tiles (not start or end)
          drawTooltipText(
            "Q/E to rotate",
            player.position.x + player.size.width / 2,
            player.position.y - 10,
          );
        }
      }

      // Draw projectiles
      projectiles.forEach((projectile) => {
        ctx.fillStyle = projectile.color;
        ctx.fillRect(
          projectile.position.x,
          projectile.position.y,
          projectile.size.width,
          projectile.size.height,
        );

        // Add a small glow effect for neon green projectiles
        if (projectile.color === "#00ff41") {
          ctx.shadowBlur = 5;
          ctx.shadowColor = projectile.color;
          ctx.fillRect(
            projectile.position.x,
            projectile.position.y,
            projectile.size.width,
            projectile.size.height,
          );
          ctx.shadowBlur = 0; // Reset shadow
        }
      });

      // Draw mirrors
      mirrors.forEach((mirror) => {
        ctx.fillStyle = mirror.isReflecting ? "#e6f3ff" : "#c0c0c0";
        ctx.fillRect(mirror.x, mirror.y, mirror.width, mirror.height);

        // Add mirror frame
        ctx.strokeStyle = "#666666";
        ctx.lineWidth = 2;
        ctx.strokeRect(mirror.x, mirror.y, mirror.width, mirror.height);

        // Add rotation indicator
        ctx.save();
        ctx.translate(
          mirror.x + mirror.width / 2,
          mirror.y + mirror.height / 2,
        );
        ctx.rotate((mirror.rotation * Math.PI) / 180);
        ctx.strokeStyle = "#333333";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-mirror.width / 2, 0);
        ctx.lineTo(mirror.width / 2, 0);
        ctx.stroke();
        ctx.restore();

        // Add reflection glow if reflecting
        if (mirror.isReflecting) {
          ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
          ctx.fillRect(
            mirror.x - 2,
            mirror.y - 2,
            mirror.width + 4,
            mirror.height + 4,
          );
        }

        // Show interaction hint if player is nearby
        const distance = Math.sqrt(
          Math.pow(player.position.x + player.size.width / 2 - (mirror.x + mirror.width / 2), 2) +
            Math.pow(player.position.y + player.size.height / 2 - (mirror.y + mirror.height / 2), 2),
        );

        if (distance < 60) {
          drawTooltipText(
            "Q/E to rotate",
            mirror.x + mirror.width / 2,
            mirror.y - 10,
          );
        }
      });

      // Draw snakes on Level 3 after mirrors (so they appear on top)
      if (currentLevel === 2) {
        snakes.forEach((snake) => {
          // Skip drawing rattlesnakes that are in the pit
          if (snake.type === "rattlesnake" && snake.isInPit) {
            return;
          }

          let baseColor = "#2d3748";
          let accentColor = "#ff6b6b";
          let eyeColor = "#ff6b6b";

          // Different colors and indicators for each snake type
          switch (snake.type) {
            case "stalker":
              baseColor = snake.isChasing ? "#805ad5" : "#553c9a"; // Purple
              accentColor = "#d69e2e"; // Gold accents
              eyeColor = "#2d3748"; // No visible eyes (blind)
              break;
            case "guard":
              baseColor = snake.isChasing ? "#e53e3e" : "#c53030"; // Red
              accentColor = "#f56565";
              eyeColor = "#ff6b6b"; // Red eyes (good sight)
              break;
            case "burster":
              baseColor = snake.isDashing ? "#f6ad55" : "#dd6b20"; // Orange
              accentColor = snake.isDashing ? "#fbb6ce" : "#e53e3e";
              eyeColor = "#f6ad55"; // Orange eyes
              break;
            case "screensaver":
              baseColor = "#38b2ac"; // Teal/cyan
              accentColor = "#4fd1c7"; // Lighter teal
              eyeColor = "#2d3748"; // Dark eyes
              break;
            case "plumber":
              baseColor = "#8b4513"; // Brown/copper color for plumber
              accentColor = "#ffd700"; // Gold accent for pipe-like appearance
              eyeColor = "#4682b4"; // Steel blue eyes
              break;
            case "spitter":
              baseColor = "#2d7d32"; // Dark green for spitter
              accentColor = "#00ff41"; // Neon green accent
              eyeColor = "#00ff41"; // Neon green eyes
              break;
            case "photophobic":
              // Change colors based on state
              if (snake.isInDarkness) {
                baseColor = "#4a5568"; // Dark gray when in darkness
                accentColor = "#718096"; // Lighter gray
                eyeColor = "#a0aec0"; // Light gray eyes
              } else if (snake.isBerserk) {
                baseColor = snake.isCharging ? "#ff0000" : "#cc0000"; // Bright red when berserk
                accentColor = snake.isCharging ? "#ff6b6b" : "#e53e3e";
                eyeColor = "#ffff00"; // Yellow eyes when aggressive
              } else {
                baseColor = "#805ad5"; // Purple default
                accentColor = "#b794f6";
                eyeColor = "#d69e2e";
              }
              break;
            case "rattlesnake":
              baseColor = "#8b4513"; // Brown color
              accentColor = "#daa520"; // Golden rod accent
              eyeColor = "#ff4500"; // Orange red eyes
              break;
            case "rainsnake":
              baseColor = "#4f46e5"; // Deep blue like rain
              accentColor = "#a5b4fc"; // Light blue like water droplets
              eyeColor = "#3b82f6"; // Bright blue eyes
              break;
          }

          // Base snake body
          ctx.fillStyle = baseColor;
          ctx.fillRect(
            snake.position.x,
            snake.position.y,
            snake.size.width,
            snake.size.height,
          );

          // Add snake pattern/details based on type
          ctx.fillStyle = accentColor;
          if (snake.type === "stalker") {
            // Chevron pattern for stalkers (stealth pattern)
            ctx.fillRect(
              snake.position.x + 4,
              snake.position.y + 4,
              snake.size.width - 8,
              3,
            );
            ctx.fillRect(
              snake.position.x + 8,
              snake.position.y + 9,
              snake.size.width - 16,
              3,
            );
            ctx.fillRect(
              snake.position.x + 4,
              snake.position.y + 14,
              snake.size.width - 8,
              3,
            );
          } else if (snake.type === "guard") {
            // Stripe pattern for guards (uniform-like pattern)
            ctx.fillRect(
              snake.position.x + 2,
              snake.position.y + 2,
              snake.size.width - 4,
              4,
            );
            ctx.fillRect(
              snake.position.x + 2,
              snake.position.y + snake.size.height - 6,
              snake.size.width - 4,
              4,
            );
          } else if (snake.type === "burster") {
            // Diamond shape for bursters (dash pattern)
            ctx.fillRect(
              snake.position.x + snake.size.width / 2 - 4,
              snake.position.y + 2,
              8,
              8,
            );
            ctx.fillRect(
              snake.position.x + snake.size.width / 2 - 4,
              snake.position.y + snake.size.height - 10,
              8,
              8,
            );
          } else if (snake.type === "screensaver") {
            // Grid pattern for screensaver (screensaver-like pattern)
            ctx.fillRect(snake.position.x + 3, snake.position.y + 3, 6, 6);
            ctx.fillRect(snake.position.x + 15, snake.position.y + 3, 6, 6);
            ctx.fillRect(snake.position.x + 3, snake.position.y + 15, 6, 6);
            ctx.fillRect(snake.position.x + 15, snake.position.y + 15, 6, 6);
          } else if (snake.type === "plumber") {
            // Pipe junction pattern for plumber (cross shape like pipe fittings)
            const centerX = snake.position.x + snake.size.width / 2;
            const centerY = snake.position.y + snake.size.height / 2;
            // Horizontal pipe
            ctx.fillRect(
              snake.position.x + 2,
              centerY - 2,
              snake.size.width - 4,
              4,
            );
            // Vertical pipe
            ctx.fillRect(
              centerX - 2,
              snake.position.y + 2,
              4,
              snake.size.height - 4,
            );
          } else if (snake.type === "spitter") {
            // Star/explosion pattern for spitter (represents projectile firing)
            const centerX = snake.position.x + snake.size.width / 2;
            const centerY = snake.position.y + snake.size.height / 2;
            // 8-pointed star pattern
            ctx.fillRect(
              centerX - 1,
              snake.position.y + 2,
              2,
              snake.size.height - 4,
            ); // Vertical
            ctx.fillRect(
              snake.position.x + 2,
              centerY - 1,
              snake.size.width - 4,
              2,
            ); // Horizontal
            // Diagonal lines
            ctx.fillRect(centerX - 5, centerY - 1, 10, 2); // Diagonal 1
            ctx.fillRect(centerX - 1, centerY - 5, 2, 10); // Diagonal 2
          } else if (snake.type === "photophobic") {
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
              ctx.fillRect(
                snake.position.x + 3,
                snake.position.y + 3,
                snake.size.width - 6,
                3,
              );
              ctx.fillRect(
                snake.position.x + 8,
                snake.position.y + 8,
                snake.size.width - 16,
                2,
              );
              ctx.fillRect(
                snake.position.x + 5,
                snake.position.y + 13,
                snake.size.width - 10,
                3,
              );
              ctx.fillRect(
                snake.position.x + 10,
                snake.position.y + 18,
                snake.size.width - 20,
                2,
              );
            }
          } else if (snake.type === "rattlesnake") {
            // Diamond/rattle pattern for rattlesnake
            const centerX = snake.position.x + snake.size.width / 2;
            const centerY = snake.position.y + snake.size.height / 2;

            // Diamond pattern to represent rattle segments
            ctx.fillRect(centerX - 3, snake.position.y + 3, 6, 4);
            ctx.fillRect(centerX - 4, snake.position.y + 8, 8, 4);
            ctx.fillRect(centerX - 3, snake.position.y + 13, 6, 4);
            ctx.fillRect(centerX - 2, snake.position.y + 18, 4, 4);

            // Add rattle sound indicator when chasing
            if (snake.isChasing) {
              ctx.strokeStyle = "#ffd700";
              ctx.lineWidth = 1;
              ctx.setLineDash([2, 2]);
              ctx.beginPath();
              ctx.arc(
                centerX,
                centerY,
                snake.size.width / 2 + 8,
                0,
                2 * Math.PI,
              );
              ctx.stroke();
              ctx.setLineDash([]);
            }
          } else if (snake.type === "rainsnake") {
            // Water droplet pattern for rain snakes (falling rain effect)
            const centerX = snake.position.x + snake.size.width / 2;
            
            // Vertical droplet pattern to represent falling rain
            ctx.fillRect(centerX - 2, snake.position.y + 2, 4, 6);
            ctx.fillRect(centerX - 1, snake.position.y + 10, 2, 8);
            ctx.fillRect(centerX - 3, snake.position.y + 20, 6, 4);
            
            // Small droplet at top
            ctx.fillRect(centerX - 1, snake.position.y + 30, 2, 4);
          }

          // Add snake eyes (stalkers have no visible eyes)
          if (snake.type !== "stalker") {
            ctx.fillStyle = eyeColor;
            ctx.fillRect(snake.position.x + 5, snake.position.y + 5, 4, 4);
            ctx.fillRect(snake.position.x + 15, snake.position.y + 5, 4, 4);
          }

          // Special dash indicator for bursters
          if (snake.type === "burster" && snake.isDashing) {
            ctx.fillStyle = "#fff5b4";
            ctx.strokeStyle = "#f6ad55";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(
              snake.position.x + snake.size.width / 2,
              snake.position.y + snake.size.height / 2,
              snake.size.width / 2 + 5,
              0,
              2 * Math.PI,
            );
            ctx.stroke();
          }

          // Draw sight range when chasing (for visual feedback) - not for stalkers
          if (snake.isChasing && snake.type !== "stalker") {
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
      }

      // Draw crystal
      if (crystal) {
        // On level 3, draw crystal as diamond shape like light source
        if (currentLevel === 2) {
          // Level 3 (0-indexed as 2)
          const centerX = crystal.x + crystal.width / 2;
          const centerY = crystal.y + crystal.height / 2;
          const size = 10; // Half the diamond size

          // Draw main diamond
          ctx.fillStyle = crystal.isActivated ? "#ff6b6b" : "#9f7aea";
          ctx.beginPath();
          ctx.moveTo(centerX, centerY - size); // Top point
          ctx.lineTo(centerX + size, centerY); // Right point
          ctx.lineTo(centerX, centerY + size); // Bottom point
          ctx.lineTo(centerX - size, centerY); // Left point
          ctx.closePath();
          ctx.fill();

          // Add inner diamond (facets)
          const innerSize = size * 0.6;
          ctx.fillStyle = crystal.isActivated ? "#ff9999" : "#b794f6";
          ctx.beginPath();
          ctx.moveTo(centerX, centerY - innerSize); // Top point
          ctx.lineTo(centerX + innerSize, centerY); // Right point
          ctx.lineTo(centerX, centerY + innerSize); // Bottom point
          ctx.lineTo(centerX - innerSize, centerY); // Left point
          ctx.closePath();
          ctx.fill();

          // Add crystal glow when activated
          if (crystal.isActivated) {
            const glowSize = size + 3;
            ctx.fillStyle = "rgba(255, 107, 107, 0.4)";
            ctx.beginPath();
            ctx.moveTo(centerX, centerY - glowSize); // Top point
            ctx.lineTo(centerX + glowSize, centerY); // Right point
            ctx.lineTo(centerX, centerY + glowSize); // Bottom point
            ctx.lineTo(centerX - glowSize, centerY); // Left point
            ctx.closePath();
            ctx.fill();

            // Add sparkle effect
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(centerX - 1, centerY - 1, 2, 2);
          }

          // Add border
          ctx.strokeStyle = crystal.isActivated ? "#cc5555" : "#7a6bb3";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(centerX, centerY - size); // Top point
          ctx.lineTo(centerX + size, centerY); // Right point
          ctx.lineTo(centerX, centerY + size); // Bottom point
          ctx.lineTo(centerX - size, centerY); // Left point
          ctx.closePath();
          ctx.stroke();
        } else {
          // For other levels, keep the original square shape
          ctx.fillStyle = crystal.isActivated ? "#ff6b6b" : "#9f7aea";
          ctx.fillRect(crystal.x, crystal.y, crystal.width, crystal.height);

          // Add crystal facets
          ctx.fillStyle = crystal.isActivated ? "#ff9999" : "#b794f6";
          ctx.fillRect(
            crystal.x + 2,
            crystal.y + 2,
            crystal.width - 4,
            crystal.height - 4,
          );

          // Add crystal glow when activated
          if (crystal.isActivated) {
            ctx.fillStyle = "rgba(255, 107, 107, 0.4)";
            ctx.fillRect(
              crystal.x - 3,
              crystal.y - 3,
              crystal.width + 6,
              crystal.height + 6,
            );

            // Add sparkle effect
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(
              crystal.x + crystal.width / 2 - 1,
              crystal.y + crystal.height / 2 - 1,
              2,
              2,
            );
          }
        }
      }

      // Draw light beam
      if (lightBeam && lightBeam.segments.length > 1) {
        ctx.strokeStyle = "#ffff00";
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
        ctx.strokeStyle = "rgba(255, 255, 0, 0.3)";
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

      // Draw light source rhombus (Level 3 only)
      if (currentLevel === 2 && lightSource) {
        // Level 3 (0-indexed as 2)
        const centerX = lightSource.x;
        const centerY = lightSource.y;
        const size = 8; // Half the rhombus size

        ctx.fillStyle = "#ffff00"; // Yellow color
        ctx.beginPath();

        // Draw rhombus (diamond) shape centered at light source
        ctx.moveTo(centerX, centerY - size); // Top point
        ctx.lineTo(centerX + size, centerY); // Right point
        ctx.lineTo(centerX, centerY + size); // Bottom point
        ctx.lineTo(centerX - size, centerY); // Left point
        ctx.closePath();

        ctx.fill();

        // Add a subtle border
        ctx.strokeStyle = "#ffcc00";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Show helper text when player is nearby
        const distance = Math.sqrt(
          Math.pow(player.position.x + player.size.width / 2 - centerX, 2) +
            Math.pow(player.position.y + player.size.height / 2 - centerY, 2),
        );

        if (distance < 60) {
          drawTooltipText("Q/E to rotate light", centerX, centerY - 20);
        }
      }

      // Draw player on top of light beam and mirrors (Level 3 only)
      if (currentLevel === 2) {
        // Level 3 (0-indexed as 2)
        // Implement flashing effect when invincible
        const shouldFlash =
          player.isInvincible && Math.floor(Date.now() / 100) % 2 === 0;
        if (!shouldFlash) {
          if (imageLoaded && playerImageRef.current) {
            // Draw custom player image on top of light beam
            ctx.drawImage(
              playerImageRef.current,
              player.position.x,
              player.position.y,
              player.size.width,
              player.size.height,
            );

            // Apply color tint for walking state if needed
            if (isWalking) {
              ctx.globalCompositeOperation = "multiply";
              ctx.fillStyle = "rgba(56, 161, 105, 0.3)"; // Green tint when walking
              ctx.fillRect(
                player.position.x,
                player.position.y,
                player.size.width,
                player.size.height,
              );
              ctx.globalCompositeOperation = "source-over";
            }
          } else {
            // Fallback to original rectangle drawing
            ctx.fillStyle = isWalking ? "#38a169" : "#4299e1"; // Green when walking, blue when running
            ctx.fillRect(
              player.position.x,
              player.position.y,
              player.size.width,
              player.size.height,
            );

            // Add player details
            ctx.fillStyle = isWalking ? "#2f855a" : "#2b6cb0"; // Darker green/blue for details
            ctx.fillRect(player.position.x + 5, player.position.y + 5, 15, 15);

            // Player eyes
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(player.position.x + 7, player.position.y + 7, 3, 3);
            ctx.fillRect(player.position.x + 15, player.position.y + 7, 3, 3);
          }

          // Walking indicator - small stealth icon
          if (isWalking) {
            ctx.fillStyle = "#68d391";
            ctx.fillRect(player.position.x - 3, player.position.y - 3, 6, 6);
            ctx.fillStyle = "#38a169";
            ctx.fillRect(player.position.x - 2, player.position.y - 2, 4, 4);
          }

          // Show key indicator if player has key
          if (player.hasKey) {
            ctx.fillStyle = "#ffd700";
            ctx.fillRect(player.position.x - 5, player.position.y - 5, 8, 8);
          }
        }
      }

      // Draw puzzle shards (Level 5)
      if (currentLevel === 4) {
        // Level 5 (0-indexed as 4)
        puzzleShards.forEach((shard) => {
          if (!shard.collected) {
            // Draw pulsing shard based on phase
            const pulseTime = Date.now() / 500;
            const pulseAlpha = 0.8 + 0.2 * Math.sin(pulseTime);

            let shardColor = `rgba(255, 255, 255, ${pulseAlpha})`; // Default white

            ctx.fillStyle = shardColor;
            ctx.fillRect(shard.x, shard.y, shard.width, shard.height);

            // Add sparkle effect
            ctx.fillStyle = `rgba(255, 255, 255, ${pulseAlpha})`;
            ctx.fillRect(
              shard.x + shard.width / 4,
              shard.y + shard.height / 4,
              shard.width / 2,
              shard.height / 2,
            );
          }
        });

        // Draw puzzle pedestal
        if (puzzlePedestal) {
          ctx.fillStyle = puzzlePedestal.isActivated ? "#ffd700" : "#8B4513";
          ctx.fillRect(
            puzzlePedestal.x,
            puzzlePedestal.y,
            puzzlePedestal.width,
            puzzlePedestal.height,
          );

          // Add pedestal details
          ctx.fillStyle = puzzlePedestal.isActivated ? "#ffeb3b" : "#654321";
          ctx.fillRect(
            puzzlePedestal.x + 5,
            puzzlePedestal.y + 5,
            puzzlePedestal.width - 10,
            puzzlePedestal.height - 10,
          );

          // Show collected shards count
          ctx.font = "12px Arial";
          ctx.textAlign = "center";

          // Draw black outline (stroke)
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 3;
          ctx.strokeText(
            `${puzzlePedestal.collectedShards}/${puzzlePedestal.requiredShards}`,
            puzzlePedestal.x + puzzlePedestal.width / 2,
            puzzlePedestal.y + puzzlePedestal.height / 2 + 4,
          );

          // Draw white fill
          ctx.fillStyle = "#ffffff";
          ctx.fillText(
            `${puzzlePedestal.collectedShards}/${puzzlePedestal.requiredShards}`,
            puzzlePedestal.x + puzzlePedestal.width / 2,
            puzzlePedestal.y + puzzlePedestal.height / 2 + 4,
          );
          ctx.textAlign = "left";
        }
      }

      // Level 5 darkness overlay - makes dark quadrants 90% darker (applied on top of everything)
      if (currentLevel === 4) {
        // Level 5 (0-indexed as 4)
        // Define quadrant boundaries based on the cross-shaped walls
        const centerX = 390; // Vertical wall position
        const centerY = 290; // Horizontal wall position

        // Get switch states for logic evaluation
        const A =
          switches.find((s) => s.id === "light_switch")?.isPressed || false;
        const B = switches.find((s) => s.id === "switch_1")?.isPressed || false;
        const C = switches.find((s) => s.id === "switch_2")?.isPressed || false;
        const D = switches.find((s) => s.id === "switch_3")?.isPressed || false;
        const E = switches.find((s) => s.id === "switch_4")?.isPressed || false;
        const F = switches.find((s) => s.id === "switch_5")?.isPressed || false;

        // Calculate lighting conditions for each quadrant
        const topLeftLit = (A && !B) || (!A && B); // A XOR B
        const topRightLit = C && D; // C AND D
        const bottomLeftLit = !(E && F); // NOT (E AND F)
        const bottomRightLit = topLeftLit && topRightLit; // (A XOR B) AND (C AND D)

        // Apply 90% darkness overlay with rgba(0,0,0,0.9) for dark quadrants
        ctx.fillStyle = "rgba(0, 0, 0, 0.9)";

        // Top-left quadrant - apply darkness overlay if NOT lit
        if (!topLeftLit) {
          ctx.fillRect(0, 0, centerX, centerY);
        }

        // Top-right quadrant - apply darkness overlay if NOT lit
        if (!topRightLit) {
          ctx.fillRect(
            centerX + 20,
            0,
            levelSize.width - (centerX + 20),
            centerY,
          );
        }

        // Bottom-left quadrant - apply darkness overlay if NOT lit
        if (!bottomLeftLit) {
          ctx.fillRect(
            0,
            centerY + 20,
            centerX,
            levelSize.height - (centerY + 20),
          );
        }

        // Bottom-right quadrant - apply darkness overlay if NOT lit
        if (!bottomRightLit) {
          ctx.fillRect(
            centerX + 20,
            centerY + 20,
            levelSize.width - (centerX + 20),
            levelSize.height - (centerY + 20),
          );
        }

        // Glow effects have been removed for cleaner darkness overlay rendering

        // Helper function to check if a position is in a dark quadrant
        const isInDarkQuadrant = (x: number, y: number) => {
          // Top-left quadrant
          if (x < centerX && y < centerY) return !topLeftLit;
          // Top-right quadrant
          if (x > centerX + 20 && y < centerY) return !topRightLit;
          // Bottom-left quadrant
          if (x < centerX && y > centerY + 20) return !bottomLeftLit;
          // Bottom-right quadrant
          if (x > centerX + 20 && y > centerY + 20) return !bottomRightLit;
          return false; // In the cross/wall area
        };

        // Draw lever silhouettes in dark areas
        switches.forEach((switchObj) => {
          if (switchObj.switchType === "lever") {
            const switchCenterX = switchObj.x + switchObj.width / 2;
            const switchCenterY = switchObj.y + switchObj.height / 2;

            if (isInDarkQuadrant(switchCenterX, switchCenterY)) {
              // Draw lever silhouette with subtle visibility
              const centerX = switchObj.x + switchObj.width / 2;
              const baseY = switchObj.y + switchObj.height - 5;

              // Draw base plate silhouette
              ctx.fillStyle = "rgba(120, 120, 120, 0.45)";
              ctx.fillRect(switchObj.x, baseY, switchObj.width, 5);

              // Draw lever arm silhouette
              const leverLength = switchObj.height - 8;
              const leverAngle = switchObj.isPressed ? -0.3 : 0.3;
              const leverEndX = centerX + Math.sin(leverAngle) * leverLength;
              const leverEndY = baseY - Math.cos(leverAngle) * leverLength;

              ctx.strokeStyle = "rgba(140, 140, 140, 0.525)";
              ctx.lineWidth = 4;
              ctx.lineCap = "round";
              ctx.beginPath();
              ctx.moveTo(centerX, baseY);
              ctx.lineTo(leverEndX, leverEndY);
              ctx.stroke();

              // Draw lever handle silhouette
              ctx.fillStyle = "rgba(160, 160, 160, 0.6)";
              ctx.beginPath();
              ctx.arc(leverEndX, leverEndY, 3, 0, 2 * Math.PI);
              ctx.fill();
            }
          }
        });

        // Draw teleporter receiver silhouettes in dark areas
        teleporters.forEach((teleporter) => {
          if (teleporter.type === "receiver") {
            const teleporterCenterX = teleporter.x + teleporter.width / 2;
            const teleporterCenterY = teleporter.y + teleporter.height / 2;

            if (isInDarkQuadrant(teleporterCenterX, teleporterCenterY)) {
              // Draw receiver silhouette with subtle visibility
              const staticAlpha = 0.375; // Reduced by 25% from 0.5

              // Outer ring silhouette
              ctx.fillStyle = `rgba(180, 180, 180, ${staticAlpha})`;
              ctx.fillRect(
                teleporter.x,
                teleporter.y,
                teleporter.width,
                teleporter.height,
              );

              // Inner circle silhouette
              ctx.fillStyle = `rgba(200, 200, 200, ${staticAlpha + 0.15})`;
              const innerSize = teleporter.width * 0.6;
              const innerOffset = (teleporter.width - innerSize) / 2;
              ctx.fillRect(
                teleporter.x + innerOffset,
                teleporter.y + innerOffset,
                innerSize,
                innerSize,
              );
            }
          }
        });

        // Redraw snake eyes on top of darkness overlay (Level 5 only)
        snakes.forEach((snake) => {
          const snakeCenterX = snake.position.x + snake.size.width / 2;
          const snakeCenterY = snake.position.y + snake.size.height / 2;

          if (isInDarkQuadrant(snakeCenterX, snakeCenterY)) {
            // Draw bright yellow eyes for all snakes in dark areas (including stalkers)
            ctx.fillStyle = "#ffff00";
            ctx.fillRect(snake.position.x + 5, snake.position.y + 5, 4, 4);
            ctx.fillRect(snake.position.x + 15, snake.position.y + 5, 4, 4);
          }
        });

        // Redraw key with faint glow on top of darkness overlay (Level 5 only)
        if (key && !key.collected) {
          const keyCenterX = key.x + key.width / 2;
          const keyCenterY = key.y + key.height / 2;

          if (isInDarkQuadrant(keyCenterX, keyCenterY)) {
            // Add faint glow effect for key in dark areas
            ctx.shadowColor = "#ffd700";
            ctx.shadowBlur = 15;

            // Draw key with glow
            ctx.fillStyle = "#ffd700";
            ctx.fillRect(key.x, key.y, key.width, key.height);

            // Add sparkle effect with glow
            ctx.fillStyle = "#ffeb3b";
            ctx.fillRect(key.x + 5, key.y + 5, 10, 10);

            // Reset shadow
            ctx.shadowBlur = 0;
          }
        }

        // Redraw player on top of darkness overlay (Level 5 only)
        // Implement flashing effect when invincible
        const shouldFlash =
          player.isInvincible && Math.floor(Date.now() / 100) % 2 === 0;
        if (!shouldFlash) {
          if (imageLoaded && playerImageRef.current) {
            // Draw custom player image on top
            ctx.drawImage(
              playerImageRef.current,
              player.position.x,
              player.position.y,
              player.size.width,
              player.size.height,
            );

            // Apply color tint for walking state if needed
            if (isWalking) {
              ctx.globalCompositeOperation = "multiply";
              ctx.fillStyle = "rgba(56, 161, 105, 0.3)"; // Green tint when walking
              ctx.fillRect(
                player.position.x,
                player.position.y,
                player.size.width,
                player.size.height,
              );
              ctx.globalCompositeOperation = "source-over";
            }
          } else {
            // Fallback to original rectangle drawing
            ctx.fillStyle = isWalking ? "#38a169" : "#4299e1"; // Green when walking, blue when running
            ctx.fillRect(
              player.position.x,
              player.position.y,
              player.size.width,
              player.size.height,
            );

            // Add player details on top
            ctx.fillStyle = isWalking ? "#2f855a" : "#2b6cb0"; // Darker green/blue for details
            ctx.fillRect(player.position.x + 5, player.position.y + 5, 15, 15);

            // Player eyes on top
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(player.position.x + 7, player.position.y + 7, 3, 3);
            ctx.fillRect(player.position.x + 15, player.position.y + 7, 3, 3);
          }

          // Walking indicator - small stealth icon on top
          if (isWalking) {
            ctx.fillStyle = "#68d391";
            ctx.fillRect(player.position.x - 3, player.position.y - 3, 6, 6);
            ctx.fillStyle = "#38a169";
            ctx.fillRect(player.position.x - 2, player.position.y - 2, 4, 4);
          }

          // Show key indicator if player has key on top
          if (player.hasKey) {
            ctx.fillStyle = "#ffd700";
            ctx.fillRect(player.position.x - 5, player.position.y - 5, 8, 8);
          }
        }

        // Redraw teleporter sender pads on top of darkness overlay
        teleporters.forEach((teleporter) => {
          if (teleporter.type === "sender") {
            // Draw teleporter pad with faster pulsing effect
            const pulseTime = Date.now() / 400; // Increased speed from 800 to 400
            const pulseAlpha = teleporter.isActive
              ? 1.0
              : 0.6 + 0.4 * Math.sin(pulseTime);

            // Outer ring
            ctx.fillStyle = teleporter.isActive
              ? `rgba(0, 255, 255, ${pulseAlpha})`
              : `rgba(0, 150, 255, ${pulseAlpha})`;
            ctx.fillRect(
              teleporter.x,
              teleporter.y,
              teleporter.width,
              teleporter.height,
            );

            // Inner circle
            ctx.fillStyle = teleporter.isActive
              ? `rgba(255, 255, 255, ${pulseAlpha})`
              : `rgba(100, 200, 255, ${pulseAlpha})`;
            const innerSize = teleporter.width * 0.6;
            const innerOffset = (teleporter.width - innerSize) / 2;
            ctx.fillRect(
              teleporter.x + innerOffset,
              teleporter.y + innerOffset,
              innerSize,
              innerSize,
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

              ctx.strokeStyle = "rgba(0, 255, 255, 0.8)";
              ctx.lineWidth = 4;
              ctx.beginPath();
              ctx.arc(
                centerX,
                centerY,
                radius,
                -Math.PI / 2,
                -Math.PI / 2 + progress * 2 * Math.PI,
              );
              ctx.stroke();

              // Extra glow when near completion
              if (progress > 0.8) {
                ctx.shadowColor = "#00ffff";
                ctx.shadowBlur = 15;
                ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(
                  centerX,
                  centerY,
                  radius,
                  -Math.PI / 2,
                  -Math.PI / 2 + progress * 2 * Math.PI,
                );
                ctx.stroke();
                ctx.shadowBlur = 0;
              }
            }

            // Activation glow effect (static when active)
            if (teleporter.isActive) {
              ctx.shadowColor = "#00ffff";
              ctx.shadowBlur = 20;
              ctx.fillStyle = "rgba(0, 255, 255, 0.8)";
              ctx.fillRect(
                teleporter.x,
                teleporter.y,
                teleporter.width,
                teleporter.height,
              );
              ctx.shadowBlur = 0;
            }
          }
        });

        // Draw interaction hints for lever switches (on top of darkness overlay)
        switches.forEach((switchObj) => {
          if (switchObj.switchType === "lever") {
            // Show interaction hint only if player can actually interact with the lever
            const playerRect = {
              x: player.position.x,
              y: player.position.y,
              width: player.size.width,
              height: player.size.height,
            };

            // Use the same collision check as the actual interaction logic
            const canInteract = checkAABBCollision(playerRect, switchObj);

            if (canInteract) {
              // Check if switch is in dark quadrant for enhanced visibility
              const switchCenterX = switchObj.x + switchObj.width / 2;
              const switchCenterY = switchObj.y + switchObj.height / 2;
              const switchInDark = isInDarkQuadrant(
                switchCenterX,
                switchCenterY,
              );

              drawTooltipText(
                "E to toggle",
                switchObj.x + switchObj.width / 2,
                switchObj.y - 10,
              );
            }
          }
        });
      }

      // Level 6 full-map lighting effect based on boulder destruction count
      if (currentLevel === 5) {
        // Level 6 (0-indexed as 5)
        const destroyedBoulders = boulders.filter(boulder => boulder.isDestroyed);
        const destroyedCount = destroyedBoulders.length;
        
        // ON → OFF (1st) → ON (2nd) → OFF (3rd) → ON (4th)
        const shouldBeDark = destroyedCount === 1 || destroyedCount === 3;
        
        if (shouldBeDark) {
          // Draw darkness overlay over entire map
          ctx.fillStyle = "rgba(0, 0, 0, 0.8)"; // Semi-transparent black overlay
          ctx.fillRect(0, 0, levelSize.width, levelSize.height);
          
          // Redraw snake eyes on top of darkness overlay (Level 6 only)
          snakes.forEach((snake) => {
            // Draw bright yellow eyes for all snakes in dark areas (except stalkers)
            if (snake.type !== "stalker") {
              ctx.fillStyle = "#ffff00";
              ctx.fillRect(snake.position.x + 5, snake.position.y + 5, 4, 4);
              ctx.fillRect(snake.position.x + 15, snake.position.y + 5, 4, 4);
            }
          });

          // Redraw player character image on top of darkness overlay (Level 6 only)
          // Apply the same invincibility flashing logic as main player rendering
          const shouldFlash = player.isInvincible && Math.floor(Date.now() / 100) % 2 === 0;
          if (!shouldFlash) {
            if (playerImageRef.current && imageLoaded) {
              ctx.drawImage(
                playerImageRef.current,
                player.position.x,
                player.position.y,
                player.size.width,
                player.size.height,
              );

              // Apply color tint for walking state if needed
              if (isWalking) {
                ctx.globalCompositeOperation = "multiply";
                ctx.fillStyle = "rgba(56, 161, 105, 0.3)"; // Green tint when walking
                ctx.fillRect(
                  player.position.x,
                  player.position.y,
                  player.size.width,
                  player.size.height,
                );
                ctx.globalCompositeOperation = "source-over";
              }
            }
          }

          // Walking indicator - small stealth icon on top
          if (isWalking) {
            ctx.fillStyle = "#68d391";
            ctx.fillRect(player.position.x - 3, player.position.y - 3, 6, 6);
            ctx.fillStyle = "#38a169";
            ctx.fillRect(player.position.x - 2, player.position.y - 2, 4, 4);
          }

          // Show key indicator if player has key on top
          if (player.hasKey) {
            ctx.fillStyle = "#ffd700";
            ctx.fillRect(player.position.x - 5, player.position.y - 5, 8, 8);
          }

          // Redraw projectiles on top of darkness overlay (Level 6 only)
          projectiles.forEach((projectile) => {
            ctx.fillStyle = projectile.color;
            ctx.fillRect(
              projectile.position.x,
              projectile.position.y,
              projectile.size.width,
              projectile.size.height,
            );

            // Add a small glow effect for neon green projectiles
            if (projectile.color === "#00ff41") {
              ctx.shadowBlur = 5;
              ctx.shadowColor = projectile.color;
              ctx.fillRect(
                projectile.position.x,
                projectile.position.y,
                projectile.size.width,
                projectile.size.height,
              );
              ctx.shadowBlur = 0; // Reset shadow
            }
          });
        }
      }
    },
    [
      player,
      snakes,
      walls,
      door,
      key,
      switches,
      throwableItems,
      carriedItem,
      levelSize,
      gameState,
      isWalking,
      currentVelocity,
      targetVelocity,
      mirrors,
      crystal,
      lightSource,
      lightBeam,
      currentLevel,
      patternTiles,
      puzzleShards,
      puzzlePedestal,
      getCurrentWalls,
      teleporters,
      hintState,
      updateHint,
    ],
  );

  const gameLoop = useCallback(
    (currentTime: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");

      // Calculate FPS using proper frame timing
      if (lastTimeRef.current > 0) {
        const frameDelta = currentTime - lastTimeRef.current;

        // Only add frame time if it's reasonable (not from window focus/blur)
        if (frameDelta > 0 && frameDelta < 100) {
          // Between 0ms and 100ms
          frameTimesRef.current.push(frameDelta);

          // Keep only last 60 frame times for rolling average
          if (frameTimesRef.current.length > 60) {
            frameTimesRef.current.shift();
          }
        }

        // Update FPS display every 500ms for stability
        if (currentTime - lastFpsUpdateRef.current >= 500) {
          if (frameTimesRef.current.length >= 10) {
            // Need at least 10 samples
            const averageFrameTime =
              frameTimesRef.current.reduce((sum, time) => sum + time, 0) /
              frameTimesRef.current.length;
            fpsRef.current = Math.round(1000 / averageFrameTime);
          }
          lastFpsUpdateRef.current = currentTime;
        }
      }

      if (ctx) {
        draw(ctx);
      }

      if (gameState === "playing") {
        const deltaTime = currentTime - lastTimeRef.current; // Keep in milliseconds
        lastTimeRef.current = currentTime;

        // Fixed timestep for smooth 60fps animation
        const targetFrameTime = 1000 / 60; // 16.67ms for 60fps
        const clampedDeltaTime = Math.min(deltaTime, targetFrameTime * 2); // Cap at 2 frames max

        if (clampedDeltaTime > 0) {
          updateGame(clampedDeltaTime);
          updateFlow(clampedDeltaTime);
          updateHint(clampedDeltaTime);
        }
      } else {
        lastTimeRef.current = currentTime;
      }

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    },
    [gameState, updateGame, updateHint, draw],
  );

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

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [levelSize, gameLoop]);

  // Force initial render
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");

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
          imageRendering: "pixelated",
          backgroundColor: "#1a1a2e",
        }}
      />
    </div>
  );
};

export default GameCanvas;
