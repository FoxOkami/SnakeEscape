import { Level, Snake, Wall, Door, Key, Switch } from './types';

export const LEVELS: Level[] = [
  // Level 1: Simple introduction
  {
    id: 1,
    name: "First Steps",
    player: { x: 50, y: 350 },
    size: { width: 800, height: 600 },
    walls: [
      // Outer walls
      { x: 0, y: 0, width: 800, height: 20 },
      { x: 0, y: 580, width: 800, height: 20 },
      { x: 0, y: 0, width: 20, height: 600 },
      { x: 780, y: 0, width: 20, height: 600 },
      // Inner walls
      { x: 200, y: 200, width: 20, height: 200 },
      { x: 400, y: 100, width: 20, height: 300 },
    ],
    snakes: [
      {
        id: 'snake1',
        position: { x: 300, y: 300 },
        size: { width: 30, height: 30 },
        speed: 50,
        direction: { x: 1, y: 0 },
        patrolPoints: [
          { x: 300, y: 300 },
          { x: 500, y: 300 }
        ],
        currentPatrolIndex: 0,
        patrolDirection: 1,
        chaseSpeed: 80,
        sightRange: 150,
        isChasing: false
      }
    ],
    door: { x: 750, y: 280, width: 30, height: 40, isOpen: false },
    key: { x: 100, y: 100, width: 20, height: 20, collected: false }
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
        id: 'snake1',
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
        sightRange: 180,
        isChasing: false
      },
      {
        id: 'snake2',
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
        id: 'snake1',
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
        isChasing: false
      },
      {
        id: 'snake2',
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
        sightRange: 180,
        isChasing: false
      },
      {
        id: 'snake3',
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
        isChasing: false
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
