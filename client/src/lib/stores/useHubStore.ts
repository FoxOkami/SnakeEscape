import { create } from 'zustand';
import { 
  PlayerController, 
  createHubPlayerController,
  keysToInputState,
  type Position,
  type Size 
} from '../game/PlayerController';

interface Player {
  position: Position;
  size: Size;
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
  interactionState: 'idle' | 'conversation' | 'confirmed' | 'startGame';
  selectedOption: 'yes' | 'no';
  player: Player;
  npcs: NPC[];
  playerController: PlayerController | null;
  
  // Actions
  initializeHub: () => void;
  updateHub: (deltaTime: number, keys: Set<string>) => void;
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
    size: { width: 30, height: 30 }
  },
  npcs: [],
  playerController: null,
  
  initializeHub: () => {
    const playerSize = { width: 30, height: 30 };
    const playerPosition = { x: 400, y: 300 };
    const boundaries = {
      minX: 20,
      maxX: 780,
      minY: 20,
      maxY: 580
    };

    const playerController = createHubPlayerController(
      playerPosition,
      playerSize,
      boundaries
    );

    set({
      gameState: 'hub',
      interactionState: 'idle',
      selectedOption: 'no',
      player: {
        position: playerPosition,
        size: playerSize
      },
      playerController,
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
    if (state.interactionState !== 'idle' || !state.playerController) return;
    
    // Convert keys to input state
    const inputState = keysToInputState(keys);
    
    // Update player position using PlayerController
    const newPosition = state.playerController.update(inputState, deltaTime);
    
    set({
      player: {
        ...state.player,
        position: newPosition
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
    
    if (nearbyNPC && nearbyNPC.id === 'game_master') {
      // Directly start level 1 when interacting with game master
      set({
        interactionState: 'startGame'
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