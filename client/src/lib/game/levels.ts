import {
  Level,
  Snake,
  Wall,
  Door,
  Key,
  Switch,
  ThrowableItem,
  PatternTile,
  Teleporter,
} from "./types";

// Helper function to get randomized spawn positions for level 2 items
function getRandomizedLevel2ItemPositions(): Array<{ x: number; y: number }> {
  // All 9 potential spawn locations (3 original + 6 new)
  const allSpawnLocations = [
    // Original locations
    { x: 250, y: 100 },
    { x: 450, y: 250 },
    { x: 550, y: 450 },
    // New locations
    { x: 65, y: 57 },
    { x: 53, y: 395 },
    { x: 224, y: 378 },
    { x: 330, y: 520 },
    { x: 45, y: 360 },
    { x: 650, y: 70 },
  ];

  // Shuffle array and take first 3 positions
  const shuffled = [...allSpawnLocations].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}

// Helper function to get randomized item names for level 2
function getRandomizedLevel2ItemNames(): Array<ThrowableItem["type"]> {
  // All possible item names (3 original + 10 new)
  const allItemNames: ThrowableItem["type"][] = [
    // Original names
    "chubbs_hand",
    "elis_hip",
    "barbra_hat",
    // New names
    "box_of_golf_balls",
    "4_iron",
    "the_prophecy",
    "hammer",
    "box_of_nails",
    "bag_of_concrete",
    "the_blue_album",
    "origami_book",
    "tennis_racket",
    "yoga_block",
  ];

  // Shuffle array and take first 3 names
  const shuffled = [...allItemNames].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}

// Helper function to randomize Level 2 data
export function randomizeLevel2() {
  // Get randomized item positions
  const itemPositions = getRandomizedLevel2ItemPositions();

  // Get randomized item names
  const itemNames = getRandomizedLevel2ItemNames();

  // Get randomized pressure plate positions
  const platePositions = getRandomizedLevel2PressurePlatePositions();

  // Create randomized switches
  const randomizedSwitches = platePositions.map((plate) => ({
    x: plate.x,
    y: plate.y,
    width: 30,
    height: 30,
    isPressed: false,
    id: plate.id,
  }));

  // Create randomized throwable items
  const randomizedThrowableItems = [
    {
      id: "item1",
      type: itemNames[0],
      x: itemPositions[0].x,
      y: itemPositions[0].y,
      width: 25,
      height: 25,
      isPickedUp: false,
      isThrown: false,
      throwable: false,
    },
    {
      id: "item2",
      type: itemNames[1],
      x: itemPositions[1].x,
      y: itemPositions[1].y,
      width: 25,
      height: 25,
      isPickedUp: false,
      isThrown: false,
      throwable: false,
    },
    {
      id: "item3",
      type: itemNames[2],
      x: itemPositions[2].x,
      y: itemPositions[2].y,
      width: 25,
      height: 25,
      isPickedUp: false,
      isThrown: false,
      throwable: false,
    },
  ];

  return {
    randomizedSwitches,
    randomizedThrowableItems,
  };
}

// Helper function to get randomized pressure plate positions for level 2
function getRandomizedLevel2PressurePlatePositions(): Array<{
  x: number;
  y: number;
  id: string;
}> {
  // All 6 potential pressure plate locations (3 original + 3 new)
  const allPlateLocations = [
    // Original locations
    { x: 200, y: 500, id: "pressure1" },
    { x: 500, y: 100, id: "pressure2" },
    { x: 680, y: 450, id: "pressure3" },
    // New locations
    { x: 211, y: 236, id: "pressure4" },
    { x: 635, y: 243, id: "pressure5" },
    { x: 446, y: 525, id: "pressure6" },
  ];

  // Shuffle array and take first 3 positions
  const shuffled = [...allPlateLocations].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}

export const LEVELS: Level[] = [
  // Level 1: Pattern-matching puzzle
  {
    id: 1,
    name: "Shallow Peaks and Low Valleys",
    player: { x: 35, y: 135 },
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
    door: { x: 770, y: 280, width: 30, height: 40, isOpen: false },
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
    name: "MacGruber",
    player: { x: 30, y: 300 },
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
        position: { x: 257, y: 502 },
        size: { width: 30, height: 30 },
        speed: 75,
        direction: { x: 0, y: 1 },
        patrolPoints: [
          { x: 257, y: 502 },
          { x: 264, y: 364 },
          { x: 440, y: 364 },
          { x: 500, y: 500 },
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
        position: { x: 241, y: 96 },
        size: { width: 30, height: 30 },
        speed: 75,
        direction: { x: 0, y: 1 },
        patrolPoints: [
          { x: 241, y: 96 },
          { x: 211, y: 239 },
          { x: 496, y: 103 },
          { x: 445, y: 248 },
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
        position: { x: 651, y: 74 },
        size: { width: 30, height: 30 },
        speed: 50,
        direction: { x: 1, y: 0 },
        patrolPoints: [
          { x: 651, y: 74 },
          { x: 632, y: 244 },
          { x: 719, y: 264 },
          { x: 724, y: 435 },
        ],
        currentPatrolIndex: 0,
        patrolDirection: 1,
        chaseSpeed: 90,
        sightRange: 200,
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
        speed: 165,
        direction: { x: 0, y: 0 }, // Will be randomly set on first update
        patrolPoints: [], // Not used for screensaver
        currentPatrolIndex: 0,
        patrolDirection: 1,
        chaseSpeed: 0, // Never chases
        sightRange: 0, // Doesn't care about player
        isChasing: false,
      },
    ],
    door: { x: 770, y: 50, width: 30, height: 40, isOpen: false },
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
        id: "item1",
        type: "chubbs_hand" as const,
        x: 250,
        y: 100,
        width: 25,
        height: 25,
        isPickedUp: false,
        isThrown: false,
      },
      {
        id: "item2",
        type: "elis_hip" as const,
        x: 450,
        y: 250,
        width: 25,
        height: 25,
        isPickedUp: false,
        isThrown: false,
      },
      {
        id: "item3",
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
    name: "Desert Slasher",
    player: { x: 25, y: 25 },
    size: { width: 800, height: 600 },
    walls: [
      // Outer walls
      { x: 0, y: 0, width: 800, height: 20 },
      { x: 0, y: 580, width: 800, height: 20 },
      { x: 0, y: 0, width: 20, height: 600 },
      { x: 780, y: 0, width: 20, height: 600 },
      // Key room walls (enclose the key)
      { x: 650, y: 260, width: 100, height: 20 }, // Top wall
      { x: 650, y: 340, width: 100, height: 20 }, // Bottom wall
      { x: 650, y: 260, width: 20, height: 100 }, // Left wall
      { x: 730, y: 260, width: 20, height: 100 }, // Right wall
      // Some internal walls for layout
      // { x: 125, y: 20, width: 20, height: 80 },
      // { x: 145, y: 150, width: 80, height: 20 },
      // { x: 125, y: 220, width: 20, height: 80 },
      // { x: 125, y: 300, width: 80, height: 20 },
      // { x: 205, y: 300, width: 20, height: 100 },
      // { x: 660, y: 450, width: 60, height: 20 },
      // { x: 390, y: 260, width: 20, height: 40 },
    ],
    snakes: [
      {
        id: "screensaver1",
        type: "screensaver" as const,
        position: { x: 605, y: 285 },
        size: { width: 30, height: 30 },
        speed: 200,
        direction: { x: -1, y: 0 }, // Start moving west
        patrolPoints: [],
        currentPatrolIndex: 0,
        patrolDirection: 1,
        chaseSpeed: 0,
        sightRange: 0,
        isChasing: false,
      },
      // {
      //   id: "guard1",
      //   type: "guard" as const,
      //   position: { x: 700, y: 500 },
      //   size: { width: 30, height: 30 },
      //   speed: 80,
      //   direction: { x: 1, y: 0 },
      //   patrolPoints: [
      //     { x: 50, y: 500 },
      //     { x: 50, y: 400 },
      //     { x: 700, y: 400 },
      //     { x: 700, y: 500 },
      //     { x: 50, y: 500 },
      //   ],
      //   currentPatrolIndex: 0,
      //   patrolDirection: 1,
      //   chaseSpeed: 120,
      //   sightRange: 150,
      //   isChasing: false,
      //   lostSightCooldown: 0,
      // },
      // {
      //   id: "guard2",
      //   type: "guard" as const,
      //   position: { x: 200, y: 80 },
      //   size: { width: 30, height: 30 },
      //   speed: 80,
      //   direction: { x: 1, y: 0 },
      //   patrolPoints: [
      //     { x: 200, y: 80 },
      //     { x: 500, y: 80 },
      //     { x: 350, y: 330 },
      //     { x: 200, y: 80 },
      //   ],
      //   currentPatrolIndex: 0,
      //   patrolDirection: 1,
      //   chaseSpeed: 120,
      //   sightRange: 150,
      //   isChasing: false,
      //   lostSightCooldown: 0,
      // },
      {
        id: "guard3",
        type: "guard" as const,
        position: { x: 700, y: 500 },
        size: { width: 30, height: 30 },
        speed: 80,
        direction: { x: 1, y: 0 },
        patrolPoints: [
          { x: 700, y: 500 },
          { x: 50, y: 50 },
          { x: 700, y: 50 },
          { x: 50, y: 500 },
          { x: 700, y: 500 },
        ],
        currentPatrolIndex: 0,
        patrolDirection: 1,
        chaseSpeed: 120,
        sightRange: 150,
        isChasing: false,
        lostSightCooldown: 0,
      },
      // Rattlesnakes that emerge from snake pit
      {
        id: "rattlesnake1",
        type: "rattlesnake" as const,
        position: { x: 550, y: 450 }, // Snake pit location
        size: { width: 28, height: 28 },
        speed: 60,
        direction: { x: 0, y: 0 },
        patrolPoints: [
          { x: 520, y: 420 },
          { x: 580, y: 420 },
          { x: 580, y: 480 },
          { x: 520, y: 480 },
        ],
        currentPatrolIndex: 0,
        patrolDirection: 1,
        chaseSpeed: 110,
        sightRange: 120,
        hearingRange: 180,
        isChasing: false,
        pitId: "pit1",
        isInPit: true,
        patrolDuration: 4000, // 4 seconds patrol
        lostSightCooldown: 0,
      },
      {
        id: "rattlesnake2",
        type: "rattlesnake" as const,
        position: { x: 550, y: 450 }, // Same pit location
        size: { width: 28, height: 28 },
        speed: 65,
        direction: { x: 0, y: 0 },
        patrolPoints: [
          { x: 520, y: 420 },
          { x: 580, y: 420 },
          { x: 580, y: 480 },
          { x: 520, y: 480 },
        ],
        currentPatrolIndex: 0,
        patrolDirection: 1,
        chaseSpeed: 115,
        sightRange: 130,
        hearingRange: 170,
        isChasing: false,
        pitId: "pit1",
        isInPit: true,
        patrolDuration: 3500, // 3.5 seconds patrol
        lostSightCooldown: 0,
      },
      {
        id: "rattlesnake3",
        type: "rattlesnake" as const,
        position: { x: 550, y: 450 }, // Same pit location
        size: { width: 28, height: 28 },
        speed: 55,
        direction: { x: 0, y: 0 },
        patrolPoints: [
          { x: 520, y: 420 },
          { x: 580, y: 420 },
          { x: 580, y: 480 },
          { x: 520, y: 480 },
        ],
        currentPatrolIndex: 0,
        patrolDirection: 1,
        chaseSpeed: 105,
        sightRange: 110,
        hearingRange: 160,
        isChasing: false,
        pitId: "pit1",
        isInPit: true,
        patrolDuration: 4500, // 4.5 seconds patrol
        lostSightCooldown: 0,
      },
      {
        id: "rattlesnake4",
        type: "rattlesnake" as const,
        position: { x: 390, y: 150 }, // Second pit location
        size: { width: 28, height: 28 },
        speed: 55,
        direction: { x: 0, y: 0 },
        patrolPoints: [
          { x: 360, y: 120 },
          { x: 420, y: 120 },
          { x: 420, y: 180 },
          { x: 360, y: 180 },
        ],
        currentPatrolIndex: 0,
        patrolDirection: 1,
        chaseSpeed: 105,
        sightRange: 110,
        hearingRange: 160,
        isChasing: false,
        pitId: "pit2",
        isInPit: true,
        patrolDuration: 4500, // 4.5 seconds patrol
        lostSightCooldown: 0,
      },
      {
        id: "rattlesnake5",
        type: "rattlesnake" as const,
        position: { x: 390, y: 150 }, // Second pit location
        size: { width: 28, height: 28 },
        speed: 55,
        direction: { x: 0, y: 0 },
        patrolPoints: [
          { x: 360, y: 120 },
          { x: 420, y: 120 },
          { x: 420, y: 180 },
          { x: 360, y: 180 },
        ],
        currentPatrolIndex: 0,
        patrolDirection: 1,
        chaseSpeed: 105,
        sightRange: 110,
        hearingRange: 160,
        isChasing: false,
        pitId: "pit2",
        isInPit: true,
        patrolDuration: 4500, // 4.5 seconds patrol
        lostSightCooldown: 0,
      },
    ],
    door: { x: 750, y: 50, width: 30, height: 40, isOpen: false },
    key: { x: 690, y: 300, width: 20, height: 20, collected: false },
    snakePits: [
      {
        id: "pit1",
        x: 550,
        y: 450,
        radius: 25,
        snakeIds: ["rattlesnake1", "rattlesnake2", "rattlesnake3"],
        lastEmergenceTime: 0,
        emergenceInterval: 3000, // 3 seconds between emergences
      },
      {
        id: "pit2",
        x: 390,
        y: 150,
        radius: 25,
        snakeIds: ["rattlesnake4", "rattlesnake5"],
        lastEmergenceTime: 0,
        emergenceInterval: 3000, // 3 seconds between emergences
      },
    ],
    lightSource: {
      x: 100,
      y: 50,
      rotation: 200, // Initially pointing south
      isOn: false,
    },
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
        x: 50,
        y: 500,
        width: 20,
        height: 20,
        rotation: 45,
        isReflecting: false,
      },
      {
        id: "mirror2",
        x: 700,
        y: 550,
        width: 20,
        height: 20,
        rotation: 135,
        isReflecting: false,
      },
      {
        id: "mirror3",
        x: 185,
        y: 225,
        width: 20,
        height: 20,
        rotation: 225,
        isReflecting: false,
      },
      {
        id: "mirror4",
        x: 580,
        y: 50,
        width: 20,
        height: 20,
        rotation: 315,
        isReflecting: false,
      },
    ],
  },

  // Level 4
  (() => {
    // Generate random start and end positions once for this level
    const startRow = Math.floor(Math.random() * 8); // Random row from 0-7
    const endRow = Math.floor(Math.random() * 8); // Random row from 0-7
    const startCol = 0; // Always first column
    const endCol = 7; // Always last column

    return {
      id: 4,
      name: "Alignment Issues",
      player: { x: 50, y: 300 },
      size: { width: 800, height: 600 },
      startTilePos: { row: startRow, col: startCol },
      endTilePos: { row: endRow, col: endCol },
      walls: [
        // Outer walls
        { x: 0, y: 0, width: 800, height: 20 },
        { x: 0, y: 580, width: 800, height: 20 },
        { x: 0, y: 0, width: 20, height: 600 },
        { x: 780, y: 0, width: 20, height: 600 },
        // Key chamber walls
        { x: 660, y: 40, width: 100, height: 20 }, // top wall
        { x: 660, y: 120, width: 100, height: 20 }, // bottom wall
        { x: 660, y: 50, width: 20, height: 70 }, // left wall
        { x: 740, y: 50, width: 20, height: 70 }, // right wall
      ],
      snakes: [
        // Helper function to calculate tile center position
        ...(() => {
          const tileSize = 60;
          const gridSize = 8;
          const totalGridWidth = gridSize * tileSize;
          const totalGridHeight = gridSize * tileSize;
          const playableWidth = 760;
          const playableHeight = 560;
          const startX = 20 + (playableWidth - totalGridWidth) / 2;
          const startY = 20 + (playableHeight - totalGridHeight) / 2;

          const calculateTileCenter = (row: number, col: number) => {
            const tileX = startX + col * tileSize;
            const tileY = startY + row * tileSize;
            return {
              x: tileX + tileSize / 2 - 12.5, // Center minus half snake size
              y: tileY + tileSize / 2 - 12.5,
            };
          };

          return [
            {
              id: "screensaver1",
              type: "screensaver" as const,
              position: calculateTileCenter(0, 7), // Grid position (0,7)
              size: { width: 30, height: 30 },
              speed: 150, // 1.5x faster than screensaver1
              direction: { x: -1, y: 0 }, // Start moving west
              patrolPoints: [],
              currentPatrolIndex: 0,
              patrolDirection: 1,
              chaseSpeed: 0,
              sightRange: 0,
              isChasing: false,
            },
            {
              id: "plumber2",
              type: "plumber" as const,
              position: calculateTileCenter(1, 1), // Grid position (1,1)
              size: { width: 25, height: 25 },
              speed: 80,
              direction: { x: 1, y: 0 }, // Start moving east
              patrolPoints: [],
              currentPatrolIndex: 0,
              patrolDirection: 1,
              chaseSpeed: 0,
              sightRange: 0,
              isChasing: false,
              currentTileId: undefined,
              entryDirection: undefined,
              nextRotationTime:
                performance.now() / 1000 + 4 + Math.random() * 2, // Random 4-6 seconds
              tileToRotate: undefined,
            },
            {
              id: "plumber3",
              type: "plumber" as const,
              position: calculateTileCenter(1, 6), // Grid position (1,6)
              size: { width: 25, height: 25 },
              speed: 80,
              direction: { x: 0, y: 1 }, // Start moving south
              patrolPoints: [],
              currentPatrolIndex: 0,
              patrolDirection: 1,
              chaseSpeed: 0,
              sightRange: 0,
              isChasing: false,
              currentTileId: undefined,
              entryDirection: undefined,
              nextRotationTime:
                performance.now() / 1000 + 4 + Math.random() * 2, // Random 4-6 seconds
              tileToRotate: undefined,
            },
            {
              id: "plumber4",
              type: "plumber" as const,
              position: calculateTileCenter(6, 1), // Grid position (6,1)
              size: { width: 25, height: 25 },
              speed: 80,
              direction: { x: 0, y: -1 }, // Start moving north
              patrolPoints: [],
              currentPatrolIndex: 0,
              patrolDirection: 1,
              chaseSpeed: 0,
              sightRange: 0,
              isChasing: false,
              currentTileId: undefined,
              entryDirection: undefined,
              nextRotationTime:
                performance.now() / 1000 + 4 + Math.random() * 2, // Random 4-6 seconds
              tileToRotate: undefined,
            },
            {
              id: "plumber5",
              type: "plumber" as const,
              position: calculateTileCenter(6, 6), // Grid position (6,6)
              size: { width: 25, height: 25 },
              speed: 80,
              direction: { x: -1, y: 0 }, // Start moving west
              patrolPoints: [],
              currentPatrolIndex: 0,
              patrolDirection: 1,
              chaseSpeed: 0,
              sightRange: 0,
              isChasing: false,
              currentTileId: undefined,
              entryDirection: undefined,
              nextRotationTime:
                performance.now() / 1000 + 4 + Math.random() * 2, // Random 4-6 seconds
              tileToRotate: undefined,
            },
            {
              id: "spitter1",
              type: "spitter" as const,
              position: calculateTileCenter(7, 7), // Grid position (7,7)
              size: { width: 25, height: 25 },
              speed: 50,
              direction: { x: 0, y: 0 }, // Will be set by movement logic
              patrolPoints: [],
              currentPatrolIndex: 0,
              patrolDirection: 1,
              chaseSpeed: 0,
              sightRange: 0,
              isChasing: false,
              lastFireTime: Date.now(),
              fireInterval: 3000, // 3 seconds
              movementAxis: undefined, // Will be randomly assigned on first update
              shotCount: 0, // Start at 0 shots
            },
          ];
        })(),
      ],
      door: { x: 750, y: 280, width: 30, height: 40, isOpen: false },
      key: { x: 700, y: 80, width: 20, height: 20, collected: false },
      // 8x8 centered tile grid with randomized start and end positions
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

            // Add custom graphics to starting tile (random row, column 0)
            if (row === startRow && col === startCol) {
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
                // Removed line graphics
              };
            }

            // Add custom graphics to ending tile (random row, column 7)
            if (row === endRow && col === endCol) {
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
                // Removed line graphics
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
      crystal: undefined,
      lightSource: undefined,
    };
  })(),

  // Level 5: Final Challenge with teleportation system
  {
    id: 5,
    name: "Amish Corner",
    player: { x: 25, y: 315 },
    size: { width: 800, height: 600 },
    walls: [
      // Outer walls (800x600)
      { x: 0, y: 0, width: 800, height: 20 },
      { x: 0, y: 580, width: 800, height: 20 },
      { x: 0, y: 0, width: 20, height: 600 },
      { x: 780, y: 0, width: 20, height: 600 },
      // Cross section walls
      { x: 390, y: 0, width: 20, height: 600 }, // horizontally centered vertical wall
      { x: 0, y: 290, width: 800, height: 20 }, // vertically centered horizontal wall
      // Key chamber walls (removable when logic puzzle is solved)
      { x: 710, y: 0, width: 60, height: 20 }, // Top wall
      { x: 710, y: 70, width: 80, height: 20 }, // Bottom wall
      { x: 710, y: 20, width: 20, height: 70 }, // Left wall
      { x: 780, y: 20, width: 20, height: 70 }, // Right wall
    ],
    snakes: [
      {
        id: "screensaver1",
        type: "screensaver" as const,
        position: { x: 350, y: 325 },
        size: { width: 30, height: 30 },
        speed: 175,
        direction: { x: 0, y: 1 },
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
        position: { x: 200, y: 350 },
        size: { width: 28, height: 28 },
        speed: 100,
        direction: { x: 0, y: 1 },
        patrolPoints: [
          { x: 180, y: 320 },
          { x: 300, y: 550 },
        ],
        currentPatrolIndex: 0,
        patrolDirection: 1,
        chaseSpeed: 125,
        sightRange: 0, // Stalkers are blind
        hearingRange: 300,
        isChasing: false,
        soundCooldown: 0,
      },
      {
        id: "screensaver2",
        type: "screensaver" as const,
        position: { x: 200, y: 150 },
        size: { width: 30, height: 30 },
        speed: 175,
        direction: { x: -1, y: 1 },
        patrolPoints: [],
        currentPatrolIndex: 0,
        patrolDirection: 1,
        chaseSpeed: 0,
        sightRange: 0,
        isChasing: false,
      },
      {
        id: "guard1",
        type: "guard" as const,
        position: { x: 425, y: 25 },
        size: { width: 30, height: 30 },
        speed: 100,
        direction: { x: 0, y: 1 },
        patrolPoints: [
          { x: 425, y: 25 },
          { x: 425, y: 250 },
          { x: 720, y: 250 },
          { x: 720, y: 100 },
          { x: 600, y: 150 },
          { x: 425, y: 25 },
        ],
        currentPatrolIndex: 0,
        patrolDirection: 1,
        chaseSpeed: 150,
        sightRange: 100,
        isChasing: false,
        lostSightCooldown: 0,
      },
      {
        id: "photophobic1",
        type: "photophobic" as const,
        position: { x: 500, y: 400 }, // Bottom-right quadrant
        size: { width: 32, height: 32 },
        speed: 80, // Slower when patrolling normally
        direction: { x: 1, y: 0 },
        patrolPoints: [
          { x: 450, y: 350 },
          { x: 650, y: 350 },
          { x: 650, y: 500 },
          { x: 450, y: 500 },
        ],
        currentPatrolIndex: 0,
        patrolDirection: 1,
        chaseSpeed: 250, // Very fast when berserk
        sightRange: 150, // Good sight range when berserk
        hearingRange: 200, // Can hear player when in darkness
        isChasing: false,
        isInDarkness: true, // Start in darkness state
        isBerserk: false,
        isPaused: false,
        isCharging: false,
      },
      {
        id: "photophobic2",
        type: "photophobic" as const,
        position: { x: 320, y: 220 }, // Top-left quadrant (requested position)
        size: { width: 32, height: 32 },
        speed: 80, // Slower when patrolling normally
        direction: { x: 0, y: 1 },
        patrolPoints: [
          { x: 50, y: 50 },
          { x: 350, y: 50 },
          { x: 350, y: 260 },
          { x: 50, y: 260 },
        ],
        currentPatrolIndex: 0,
        patrolDirection: 1,
        chaseSpeed: 250, // Very fast when berserk
        sightRange: 150, // Good sight range when berserk
        hearingRange: 200, // Can hear player when in darkness
        isChasing: false,
        isInDarkness: true, // Start in darkness state
        isBerserk: false,
        isPaused: false,
        isCharging: false,
      },
      {
        id: "photophobic3",
        type: "photophobic" as const,
        position: { x: 450, y: 230 }, // Top-right quadrant
        size: { width: 32, height: 32 },
        speed: 80, // Slower when patrolling normally
        direction: { x: 0, y: 1 },
        patrolPoints: [
          { x: 350, y: 50 },
          { x: 550, y: 50 },
          { x: 550, y: 260 },
          { x: 550, y: 260 },
        ],
        currentPatrolIndex: 0,
        patrolDirection: 1,
        chaseSpeed: 250, // Very fast when berserk
        sightRange: 150, // Good sight range when berserk
        hearingRange: 200, // Can hear player when in darkness
        isChasing: false,
        isInDarkness: true, // Start in darkness state
        isBerserk: false,
        isPaused: false,
        isCharging: false,
      },
    ],
    door: { x: 730, y: 560, width: 30, height: 40, isOpen: false },
    key: { x: 745, y: 35, width: 20, height: 20, collected: false },
    teleporters: [
      {
        // NW
        id: "teleporter_sender",
        type: "sender",
        x: 350,
        y: 140,
        width: 30,
        height: 30,
        linkedTeleporterId: "teleporter_receiver_2",
        activationDelay: 1000, // 1 second
        isActive: false,
      },
      {
        // NW
        id: "teleporter_receiver",
        type: "receiver",
        x: 30,
        y: 30,
        width: 30,
        height: 30,
        activationDelay: 0, // Receivers don't need activation delay
        isActive: false,
      },
      {
        // NE
        id: "teleporter_sender_2",
        type: "sender",
        x: 420,
        y: 250,
        width: 30,
        height: 30,
        linkedTeleporterId: "teleporter_receiver_3",
        activationDelay: 1000, // 1 second
        isActive: false,
      },
      {
        // NE
        id: "teleporter_receiver_2",
        type: "receiver",
        x: 740,
        y: 140,
        width: 30,
        height: 30,
        activationDelay: 0, // Receivers don't need activation delay
        isActive: false,
      },
      {
        // SW
        id: "teleporter_sender_3",
        type: "sender",
        x: 350,
        y: 430,
        width: 30,
        height: 30,
        linkedTeleporterId: "teleporter_receiver_4",
        activationDelay: 1000, // 1 second
        isActive: false,
      },
      {
        // SW
        id: "teleporter_receiver_3",
        type: "receiver",
        x: 30,
        y: 540,
        width: 30,
        height: 30,
        activationDelay: 0, // Receivers don't need activation delay
        isActive: false,
      },
      {
        // SE
        id: "teleporter_sender_4",
        type: "sender",
        x: 420,
        y: 325,
        width: 30,
        height: 30,
        linkedTeleporterId: "teleporter_receiver",
        activationDelay: 1000, // 1 second
        isActive: false,
      },
      {
        // SE
        id: "teleporter_receiver_4",
        type: "receiver",
        x: 740,
        y: 425,
        width: 30,
        height: 30,
        activationDelay: 0, // Receivers don't need activation delay
        isActive: false,
      },
    ],
    patternTiles: [],
    patternSequence: [],
    switches: [
      {
        // NE
        id: "light_switch", // A
        x: 170,
        y: 210,
        width: 20,
        height: 30,
        isPressed: false,
        switchType: "lever", // Lever-style switch
      },
      {
        // SE
        id: "switch_1", // B
        x: 610,
        y: 460,
        width: 20,
        height: 30,
        isPressed: false,
        switchType: "lever",
      },
      {
        // NW
        id: "switch_2", // C
        x: 210,
        y: 60,
        width: 20,
        height: 30,
        isPressed: false,
        switchType: "lever",
      },
      {
        // NW
        id: "switch_3", // D
        x: 570,
        y: 105,
        width: 20,
        height: 30,
        isPressed: false,
        switchType: "lever",
      },
      {
        // SW
        id: "switch_4", // E
        x: 170,
        y: 360,
        width: 20,
        height: 30,
        isPressed: false,
        switchType: "lever",
      },
      {
        // SW
        id: "switch_5", // F
        x: 210,
        y: 510,
        width: 20,
        height: 30,
        isPressed: false,
        switchType: "lever",
      },
    ],
    throwableItems: [],
    mirrors: [],
    crystal: undefined,
    lightSource: {
      x: 100,
      y: 100,
      rotation: 0,
      isOn: false,
      brightness: 0.8,
      radius: 150,
    },
  },
];
