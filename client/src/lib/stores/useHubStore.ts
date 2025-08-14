import { create } from 'zustand';

interface Position {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

interface Player {
  position: Position;
  size: Size;
  speed: number;
}

interface NPC {
  id: string;
  name: string;
  position: Position;
  size: Size;
  dialogue: string;
}

interface HubStore {
  gameState: 'hub' | 'transitioning';
  interactionState: 'idle' | 'conversation' | 'confirmed';
  selectedOption: 'yes' | 'no';
  player: Player;
  npcs: NPC[];
  
  // Actions
  initializeHub: () => void;
  updateHub: (deltaTime: number, keys: Set<string>) => void;
  movePlayer: (direction: { x: number; y: number }, deltaTime: number) => void;
  interactWithNPC: () => void;
  selectOption: (option: 'yes' | 'no') => void;
  confirmSelection: () => void;
  endInteraction: () => void;
}

export const useHubStore = create<HubStore>((set, get) => ({
  gameState: 'hub',
  interactionState: 'idle',
  selectedOption: 'no',
  player: {
    position: { x: 400, y: 300 },
    size: { width: 30, height: 30 },
    speed: 200  // Adjusted for hub deltaTime calculation
  },
  npcs: [],
  
  initializeHub: () => {
    set({
      gameState: 'hub',
      interactionState: 'idle',
      selectedOption: 'no',
      player: {
        position: { x: 400, y: 300 },
        size: { width: 30, height: 30 },
        speed: 200  // Adjusted for hub deltaTime calculation
      },
      npcs: [
        {
          id: 'game_master',
          name: 'Game Master',
          position: { x: 200, y: 150 },
          size: { width: 40, height: 40 },
          dialogue: 'Would you like to play?'
        }
      ]
    });
  },
  
  updateHub: (deltaTime: number, keys: Set<string>) => {
    const state = get();
    if (state.interactionState !== 'idle') return;
    
    let dx = 0;
    let dy = 0;
    
    // Handle movement input
    if (keys.has('KeyW') || keys.has('ArrowUp')) dy = -1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) dy = 1;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) dx = -1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) dx = 1;
    
    if (dx !== 0 || dy !== 0) {
      // Normalize diagonal movement
      const magnitude = Math.sqrt(dx * dx + dy * dy);
      if (magnitude > 0) {
        dx /= magnitude;
        dy /= magnitude;
      }
      
      get().movePlayer({ x: dx, y: dy }, deltaTime);
    }
  },
  
  movePlayer: (direction: { x: number; y: number }, deltaTime: number) => {
    const state = get();
    const player = state.player;
    
    // Calculate new position
    const speed = player.speed * (deltaTime / 1000);
    const newX = player.position.x + direction.x * speed;
    const newY = player.position.y + direction.y * speed;
    
    // Check boundaries (keeping player within room bounds)
    const minX = 25;
    const maxX = 800 - 25 - player.size.width;
    const minY = 25;
    const maxY = 600 - 25 - player.size.height;
    
    const clampedX = Math.max(minX, Math.min(maxX, newX));
    const clampedY = Math.max(minY, Math.min(maxY, newY));
    
    set({
      player: {
        ...player,
        position: { x: clampedX, y: clampedY }
      }
    });
  },
  
  interactWithNPC: () => {
    const state = get();
    
    // Find nearby NPC
    const nearbyNPC = state.npcs.find(npc => {
      const distance = Math.sqrt(
        Math.pow(state.player.position.x - npc.position.x, 2) +
        Math.pow(state.player.position.y - npc.position.y, 2)
      );
      return distance < 80;
    });
    
    if (nearbyNPC) {
      set({
        interactionState: 'conversation',
        selectedOption: 'no' // Default to 'no'
      });
    }
  },
  
  selectOption: (option: 'yes' | 'no') => {
    set({ selectedOption: option });
  },
  
  confirmSelection: () => {
    set({ interactionState: 'confirmed' });
  },
  
  endInteraction: () => {
    set({
      interactionState: 'idle',
      selectedOption: 'no'
    });
  }
}));