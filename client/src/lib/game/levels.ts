import {
  Level,
  Snake,
  Wall,
  Door,
  Key,
  Switch,
  ThrowableItem,
  PatternTile,
} from "./types";

export const LEVELS: Level[] = [
  // Level 1: Pattern-matching puzzle
  {
    id: 1,
    name: "Pattern Memory",
    player: { x: 50, y: 350 },
    size: { width: 800, height: 600 },
    walls: [
      // Outer walls
      { x: 0, y: 0, width: 800, height: 20 },
      { x: 0, y: 580, width: 800, height: 20 },
      { x: 0, y: 0, width: 20, height: 600 },
      { x: 780, y: 0, width: 20, height: 600 },
      // Key room walls (small chamber on the right, closer to key)
      { x: 600, y: 270, width: 100, height: 20 }, // top wall
      { x: 600, y: 330, width: 100, height: 20 }, // bottom wall
      { x: 600, y: 290, width: 20, height: 40 }, // left wall
      { x: 680, y: 290, width: 20, height: 40 }, // right wall
      // Some obstacle walls scattered around
      { x: 150, y: 100, width: 20, height: 80 },
      { x: 300, y: 150, width: 80, height: 20 },
      { x: 500, y: 100, width: 20, height: 100 },
      { x: 100, y: 400, width: 100, height: 20 },
      { x: 400, y: 450, width: 20, height: 100 },
    ],
    snakes: [
      {
        id: "screensaver1",
        type: "screensaver" as const,
        position: { x: 650, y: 80 }, // Top right area
        size: { width: 30, height: 30 },
        speed: 125,
        direction: { x: 0, y: 0 }, // Will be randomly set on first update
        patrolPoints: [],
        currentPatrolIndex: 0,
        patrolDirection: 1,
        chaseSpeed: 0,
        sightRange: 0,
        isChasing: false,
      },
      {
        id: "screensaver2",
        type: "screensaver" as const,
        position: { x: 350, y: 450 }, // Bottom middle area
        size: { width: 30, height: 30 },
        speed: 125,
        direction: { x: 0, y: 0 }, // Will be randomly set on first update
        patrolPoints: [],
        currentPatrolIndex: 0,
        patrolDirection: 1,
        chaseSpeed: 0,
        sightRange: 0,
        isChasing: false,
      },
      {
        id: "stalker1",
        type: "stalker" as const,
        position: { x: 450, y: 360 }, // Near the 9th pattern tile (tile9 is at x: 480, y: 380)
        size: { width: 28, height: 28 },
        speed: 45,
        direction: { x: 1, y: 0 },
        patrolPoints: [
          { x: 450, y: 360 },
          { x: 520, y: 360 },
          { x: 520, y: 420 },
          { x: 450, y: 420 },
        ],
        currentPatrolIndex: 0,
        patrolDirection: 1,
        chaseSpeed: 85,
        sightRange: 0, // Stalkers are blind
        hearingRange: 150,
        isChasing: false,
        soundCooldown: 0,
      },
    ],
    door: { x: 750, y: 280, width: 30, height: 40, isOpen: false },
    key: { x: 640, y: 300, width: 20, height: 20, collected: false }, // Key in small chamber
    patternTiles: [
      {
        id: "tile1",
        x: 80,
        y: 50,
        width: 40,
        height: 40,
        isGlowing: false,
        sequenceIndex: 0,
        hasBeenActivated: false,
      },
      {
        id: "tile2",
        x: 250,
        y: 80,
        width: 40,
        height: 40,
        isGlowing: false,
        sequenceIndex: 1,
        hasBeenActivated: false,
      },
      {
        id: "tile3",
        x: 450,
        y: 60,
        width: 40,
        height: 40,
        isGlowing: false,
        sequenceIndex: 2,
        hasBeenActivated: false,
      },
      {
        id: "tile4",
        x: 120,
        y: 250,
        width: 40,
        height: 40,
        isGlowing: false,
        sequenceIndex: 3,
        hasBeenActivated: false,
      },
      {
        id: "tile5",
        x: 350,
        y: 220,
        width: 40,
        height: 40,
        isGlowing: false,
        sequenceIndex: 4,
        hasBeenActivated: false,
      },
      {
        id: "tile6",
        x: 550,
        y: 250,
        width: 40,
        height: 40,
        isGlowing: false,
        sequenceIndex: 5,
        hasBeenActivated: false,
      },
      {
        id: "tile7",
        x: 60,
        y: 480,
        width: 40,
        height: 40,
        isGlowing: false,
        sequenceIndex: 6,
        hasBeenActivated: false,
      },
      {
        id: "tile8",
        x: 300,
        y: 500,
        width: 40,
        height: 40,
        isGlowing: false,
        sequenceIndex: 7,
        hasBeenActivated: false,
      },
      {
        id: "tile9",
        x: 480,
        y: 380,
        width: 40,
        height: 40,
        isGlowing: false,
        sequenceIndex: 8,
        hasBeenActivated: false,
      },
    ],
    patternSequence: [0, 2, 4, 6, 8, 7, 5, 3, 1], // Pattern: corners first, then reverse spiral
    throwableItems: [],
  },

  // Level 2: More complex with switches
  {
    id: 2,
    name: "The Switch",
    player: { x: 50, y: 550 },
    size: { width: 800, height: 600 },
    walls: [
      // Outer walls
      { x: 0, y: 0, width: 800, height: 20 },
      { x: 0, y: 580, width: 800, height: 20 },
      { x: 0, y: 0, width: 20, height: 600 },
      { x: 780, y: 0, width: 20, height: 600 },
      // Complex maze
      { x: 150, y: 150, width: 20, height: 300 },
      { x: 300, y: 300, width: 200, height: 20 },
      { x: 550, y: 150, width: 20, height: 200 },
      { x: 400, y: 450, width: 20, height: 130 },
      // Key room walls (enclose the key)
      { x: 620, y: 320, width: 80, height: 20 }, // Top wall
      { x: 620, y: 380, width: 80, height: 20 }, // Bottom wall
      { x: 620, y: 320, width: 20, height: 80 }, // Left wall (removable)
      { x: 680, y: 320, width: 20, height: 80 }, // Right wall
    ],
    snakes: [
      {
        id: "stalker1",
        type: "stalker" as const,
        position: { x: 200, y: 400 },
        size: { width: 30, height: 30 },
        speed: 75,
        direction: { x: 0, y: 1 },
        patrolPoints: [
          { x: 200, y: 400 },
          { x: 200, y: 500 },
          { x: 350, y: 500 },
          { x: 350, y: 400 },
        ],
        currentPatrolIndex: 0,
        patrolDirection: 1,
        chaseSpeed: 120,
        sightRange: 0, // Stalkers are blind
        hearingRange: 200,
        isChasing: false,
        soundCooldown: 0,
      },
      {
        id: "stalker2",
        type: "stalker" as const,
        position: { x: 500, y: 100 },
        size: { width: 30, height: 30 },
        speed: 75,
        direction: { x: 0, y: 1 },
        patrolPoints: [
          { x: 500, y: 100 },
          { x: 400, y: 200 },
          { x: 500, y: 200 },
          { x: 400, y: 100 },
        ],
        currentPatrolIndex: 0,
        patrolDirection: 1,
        chaseSpeed: 120,
        sightRange: 0, // Stalkers are blind
        hearingRange: 200,
        isChasing: false,
        soundCooldown: 0,
      },
      {
        id: "burster1",
        type: "burster" as const,
        position: { x: 600, y: 200 },
        size: { width: 30, height: 30 },
        speed: 50,
        direction: { x: 1, y: 0 },
        patrolPoints: [
          { x: 600, y: 200 },
          { x: 700, y: 200 },
        ],
        currentPatrolIndex: 0,
        patrolDirection: 1,
        chaseSpeed: 90,
        sightRange: 160,
        isChasing: false,
        dashSpeed: 200,
        isDashing: false,
        dashDuration: 0.8,
        lostSightCooldown: 0,
      },
      {
        id: "screensaver1",
        type: "screensaver" as const,
        position: { x: 300, y: 100 },
        size: { width: 30, height: 30 },
        speed: 135,
        direction: { x: 0, y: 0 }, // Will be randomly set on first update
        patrolPoints: [], // Not used for screensaver
        currentPatrolIndex: 0,
        patrolDirection: 1,
        chaseSpeed: 0, // Never chases
        sightRange: 0, // Doesn't care about player
        isChasing: false,
      },
    ],
    door: { x: 750, y: 50, width: 30, height: 40, isOpen: false },
    key: { x: 650, y: 350, width: 20, height: 20, collected: false },
    switches: [
      {
        x: 200,
        y: 500,
        width: 30,
        height: 30,
        isPressed: false,
        id: "pressure1",
      },
      {
        x: 500,
        y: 100,
        width: 30,
        height: 30,
        isPressed: false,
        id: "pressure2",
      },
      {
        x: 680,
        y: 450,
        width: 30,
        height: 30,
        isPressed: false,
        id: "pressure3",
      },
    ],
    throwableItems: [
      {
        id: "chubbshand1",
        type: "chubbs_hand" as const,
        x: 250,
        y: 100,
        width: 25,
        height: 25,
        isPickedUp: false,
        isThrown: false,
      },
      {
        id: "eliship1",
        type: "elis_hip" as const,
        x: 450,
        y: 250,
        width: 25,
        height: 25,
        isPickedUp: false,
        isThrown: false,
      },
      {
        id: "barbrahat1",
        type: "barbra_hat" as const,
        x: 550,
        y: 450,
        width: 25,
        height: 25,
        isPickedUp: false,
        isThrown: false,
      },
    ],
  },

  // Level 3: Light Reflection Puzzle
  {
    id: 3,
    name: "Light Reflection",
    player: { x: 50, y: 550 },
    size: { width: 800, height: 600 },
    walls: [
      // Outer walls
      { x: 0, y: 0, width: 800, height: 20 },
      { x: 0, y: 580, width: 800, height: 20 },
      { x: 0, y: 0, width: 20, height: 600 },
      { x: 780, y: 0, width: 20, height: 600 },
      // Key room walls (enclose the key)
      { x: 650, y: 250, width: 100, height: 20 }, // Top wall
      { x: 650, y: 350, width: 100, height: 20 }, // Bottom wall
      { x: 650, y: 250, width: 20, height: 120 }, // Left wall (removable)
      { x: 730, y: 250, width: 20, height: 120 }, // Right wall
      // Some internal walls for layout
      { x: 200, y: 300, width: 300, height: 20 },
      { x: 400, y: 150, width: 20, height: 150 },
    ],
    snakes: [
      {
        id: "guard1",
        type: "guard" as const,
        position: { x: 300, y: 450 },
        size: { width: 30, height: 30 },
        speed: 80,
        direction: { x: 1, y: 0 },
        patrolPoints: [
          { x: 300, y: 450 },
          { x: 450, y: 450 },
          { x: 450, y: 520 },
          { x: 300, y: 520 },
        ],
        currentPatrolIndex: 0,
        patrolDirection: 1,
        chaseSpeed: 120,
        sightRange: 150,
        isChasing: false,
        lostSightCooldown: 0,
      },
    ],
    door: { x: 750, y: 50, width: 30, height: 40, isOpen: false },
    key: { x: 690, y: 300, width: 20, height: 20, collected: false },
    lightSource: { x: 100, y: 50, rotation: 180 }, // Initially pointing south
    crystal: {
      x: 620,
      y: 300,
      width: 20,
      height: 20,
      id: "crystal1",
      isActivated: false,
    },
    mirrors: [
      {
        id: "mirror1",
        x: 150,
        y: 100,
        width: 20,
        height: 20,
        rotation: 45,
        isReflecting: false,
      },
      {
        id: "mirror2",
        x: 300,
        y: 180,
        width: 20,
        height: 20,
        rotation: 135,
        isReflecting: false,
      },
      {
        id: "mirror3",
        x: 500,
        y: 120,
        width: 20,
        height: 20,
        rotation: 225,
        isReflecting: false,
      },
      {
        id: "mirror4",
        x: 580,
        y: 250,
        width: 20,
        height: 20,
        rotation: 315,
        isReflecting: false,
      },
    ],
  },

  // Level 4: Simple level - just player, key, and exit door with 16x16 tile grid
  {
    id: 4,
    name: "Simple Escape",
    player: { x: 50, y: 300 },
    size: { width: 800, height: 600 },
    walls: [
      // Outer walls
      { x: 0, y: 0, width: 800, height: 20 },
      { x: 0, y: 580, width: 800, height: 20 },
      { x: 0, y: 0, width: 20, height: 600 },
      { x: 780, y: 0, width: 20, height: 600 },
      // Key chamber walls (similar to level 1)
      { x: 660, y: 40, width: 100, height: 20 }, // top wall
      { x: 660, y: 120, width: 100, height: 20 }, // bottom wall
      { x: 660, y: 50, width: 20, height: 70 }, // left wall
      { x: 740, y: 50, width: 20, height: 70 }, // right wall
    ],
    snakes: [], // No snakes
    door: { x: 750, y: 280, width: 30, height: 40, isOpen: false },
    key: { x: 700, y: 80, width: 20, height: 20, collected: false },
    // 8x8 centered tile grid for visual appeal (non-interactive)
    patternTiles: (() => {
      const tiles: PatternTile[] = [];
      const tileSize = 60; // Each tile is 60x60 pixels
      const gridSize = 8; // 8x8 grid
      const totalGridWidth = gridSize * tileSize;
      const totalGridHeight = gridSize * tileSize;

      // Center the grid in the playable area
      const playableWidth = 760; // 800 - 40 (walls)
      const playableHeight = 560; // 600 - 40 (walls)
      const startX = 20 + (playableWidth - totalGridWidth) / 2;
      const startY = 20 + (playableHeight - totalGridHeight) / 2;

      for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
          const x = startX + col * tileSize;
          const y = startY + row * tileSize;

          const tile: PatternTile = {
            id: `grid_tile_${row}_${col}`,
            x,
            y,
            width: tileSize,
            height: tileSize,
            isGlowing: false,
            sequenceIndex: -1, // Not part of any sequence
            hasBeenActivated: false,
            rotation: 0, // Initial rotation
          };

          // Add custom graphics to row 3, column 0
          if (row === 3 && col === 0) {
            const originalRadius = tileSize / 8; // Original radius for line thickness
            const circleRadius = (tileSize / 8) * 2; // Double the radius of the circle
            const centerX = x + tileSize / 2;
            const centerY = y + tileSize / 2;

            tile.customGraphics = {
              circle: {
                radius: circleRadius,
                color: "#00FF00", // Neon green
                centerX: centerX,
                centerY: centerY,
              },
              line: {
                startX: centerX,
                startY: centerY,
                endX: x + tileSize, // Extend to the right edge of the grid square
                endY: centerY,
                thickness: originalRadius * 2, // Keep original line thickness
                color: "#00FF00", // Neon green
              },
            };
          }

          // Add custom graphics to row 6, column 7 (flipped Y axis and inverted colors)
          if (row === 6 && col === 7) {
            const originalRadius = tileSize / 8; // Original radius for line thickness
            const circleRadius = (tileSize / 8) * 2; // Double the radius of the circle
            const centerX = x + tileSize / 2;
            const centerY = y + tileSize / 2;

            tile.customGraphics = {
              circle: {
                radius: circleRadius,
                color: "#FF00FF", // Inverted color (magenta)
                centerX: centerX,
                centerY: centerY,
              },
              line: {
                startX: centerX,
                startY: centerY,
                endX: x + originalRadius, // Extend to left edge accounting for half the line thickness
                endY: centerY,
                thickness: originalRadius * 2, // Keep original line thickness
                color: "#FF00FF", // Inverted color (magenta)
              },
            };
          }

          tiles.push(tile);
        }
      }

      return tiles;
    })(),
    patternSequence: [], // No pattern sequence needed
    switches: [],
    throwableItems: [],
    mirrors: [],
    crystal: null,
    lightSource: null,
  },
];
