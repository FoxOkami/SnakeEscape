import { Level, Snake, Wall, Door, Key, Switch, ThrowableItem, PatternTile } from './types';

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
    snakes: [], // No snakes in this puzzle level
    door: { x: 750, y: 280, width: 30, height: 40, isOpen: false },
    key: { x: 640, y: 300, width: 20, height: 20, collected: false }, // Key in small chamber
    patternTiles: [
      { id: 'tile1', x: 80, y: 50, width: 40, height: 40, isGlowing: false, sequenceIndex: 0, hasBeenActivated: false },
      { id: 'tile2', x: 250, y: 80, width: 40, height: 40, isGlowing: false, sequenceIndex: 1, hasBeenActivated: false },
      { id: 'tile3', x: 450, y: 60, width: 40, height: 40, isGlowing: false, sequenceIndex: 2, hasBeenActivated: false },
      { id: 'tile4', x: 120, y: 250, width: 40, height: 40, isGlowing: false, sequenceIndex: 3, hasBeenActivated: false },
      { id: 'tile5', x: 350, y: 220, width: 40, height: 40, isGlowing: false, sequenceIndex: 4, hasBeenActivated: false },
      { id: 'tile6', x: 550, y: 250, width: 40, height: 40, isGlowing: false, sequenceIndex: 5, hasBeenActivated: false },
      { id: 'tile7', x: 60, y: 480, width: 40, height: 40, isGlowing: false, sequenceIndex: 6, hasBeenActivated: false },
      { id: 'tile8', x: 300, y: 500, width: 40, height: 40, isGlowing: false, sequenceIndex: 7, hasBeenActivated: false },
      { id: 'tile9', x: 480, y: 380, width: 40, height: 40, isGlowing: false, sequenceIndex: 8, hasBeenActivated: false },
    ],
    patternSequence: [0, 2, 4, 6, 8, 7, 5, 3, 1], // Pattern: corners first, then reverse spiral
    throwableItems: []
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
    ],
    snakes: [
      {
        id: 'stalker1',
        type: 'stalker' as const,
        position: { x: 200, y: 400 },
        size: { width: 30, height: 30 },
        speed: 75,
        direction: { x: 0, y: 1 },
        patrolPoints: [
          { x: 200, y: 400 },
          { x: 200, y: 500 },
          { x: 350, y: 500 },
          { x: 350, y: 400 }
        ],
        currentPatrolIndex: 0,
        patrolDirection: 1,
        chaseSpeed: 120,
        sightRange: 0, // Stalkers are blind
        hearingRange: 200,
        isChasing: false,
        soundCooldown: 0
      },
      {
        id: 'burster1',
        type: 'burster' as const,
        position: { x: 600, y: 200 },
        size: { width: 30, height: 30 },
        speed: 50,
        direction: { x: 1, y: 0 },
        patrolPoints: [
          { x: 600, y: 200 },
          { x: 700, y: 200 }
        ],
        currentPatrolIndex: 0,
        patrolDirection: 1,
        chaseSpeed: 90,
        sightRange: 160,
        isChasing: false,
        dashSpeed: 200,
        isDashing: false,
        dashDuration: 0.8,
        lostSightCooldown: 0
      },
      {
        id: 'screensaver1',
        type: 'screensaver' as const,
        position: { x: 300, y: 100 },
        size: { width: 25, height: 25 },
        speed: 60,
        direction: { x: 0, y: 0 }, // Will be randomly set on first update
        patrolPoints: [], // Not used for screensaver
        currentPatrolIndex: 0,
        patrolDirection: 1,
        chaseSpeed: 0, // Never chases
        sightRange: 0, // Doesn't care about player
        isChasing: false
      }
    ],
    door: { x: 750, y: 50, width: 30, height: 40, isOpen: false },
    key: { x: 650, y: 350, width: 20, height: 20, collected: false },
    switches: [
      { x: 100, y: 300, width: 30, height: 30, isPressed: false, id: 'switch1' }
    ]
  },

  // Level 3: Advanced challenge
  {
    id: 3,
    name: "Snake Maze",
    player: { x: 50, y: 50 },
    size: { width: 800, height: 600 },
    walls: [
      // Outer walls
      { x: 0, y: 0, width: 800, height: 20 },
      { x: 0, y: 580, width: 800, height: 20 },
      { x: 0, y: 0, width: 20, height: 600 },
      { x: 780, y: 0, width: 20, height: 600 },
      // Complex maze structure
      { x: 100, y: 100, width: 100, height: 20 },
      { x: 250, y: 150, width: 20, height: 150 },
      { x: 350, y: 200, width: 150, height: 20 },
      { x: 150, y: 350, width: 200, height: 20 },
      { x: 450, y: 100, width: 20, height: 200 },
      { x: 550, y: 350, width: 20, height: 200 },
      { x: 300, y: 450, width: 200, height: 20 },
    ],
    snakes: [
      {
        id: 'guard1',
        type: 'guard' as const,
        position: { x: 150, y: 200 },
        size: { width: 30, height: 30 },
        speed: 100,
        direction: { x: 1, y: 0 },
        patrolPoints: [
          { x: 150, y: 200 },
          { x: 220, y: 200 },
          { x: 220, y: 280 },
          { x: 150, y: 280 }
        ],
        currentPatrolIndex: 0,
        patrolDirection: 1,
        chaseSpeed: 150,
        sightRange: 200,
        isChasing: false,
        lostSightCooldown: 0
      },
      {
        id: 'stalker1',
        type: 'stalker' as const,
        position: { x: 400, y: 300 },
        size: { width: 30, height: 30 },
        speed: 75,
        direction: { x: 0, y: 1 },
        patrolPoints: [
          { x: 400, y: 300 },
          { x: 400, y: 400 },
          { x: 500, y: 400 },
          { x: 500, y: 300 }
        ],
        currentPatrolIndex: 0,
        patrolDirection: 1,
        chaseSpeed: 130,
        sightRange: 0, // Stalkers are blind
        hearingRange: 220,
        isChasing: false,
        soundCooldown: 0
      },
      {
        id: 'burster1',
        type: 'burster' as const,
        position: { x: 600, y: 150 },
        size: { width: 30, height: 30 },
        speed: 50,
        direction: { x: 1, y: 0 },
        patrolPoints: [
          { x: 600, y: 150 },
          { x: 700, y: 150 },
          { x: 700, y: 250 },
          { x: 600, y: 250 }
        ],
        currentPatrolIndex: 0,
        patrolDirection: 1,
        chaseSpeed: 100,
        sightRange: 160,
        isChasing: false,
        dashSpeed: 250,
        isDashing: false,
        dashDuration: 1.0,
        lostSightCooldown: 0
      }
    ],
    door: { x: 750, y: 500, width: 30, height: 40, isOpen: false },
    key: { x: 650, y: 50, width: 20, height: 20, collected: false },
    switches: [
      { x: 380, y: 380, width: 30, height: 30, isPressed: false, id: 'switch1' },
      { x: 120, y: 500, width: 30, height: 30, isPressed: false, id: 'switch2' }
    ]
  }
];
