import { create } from 'zustand';
import { 
  PlayerController, 
  createHubPlayerController,
  keysToInputState,
  type Position,
  type Size,
  type CustomKeyBindings
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

interface Door {
  position: Position;
  size: Size;
  isOpen: boolean;
}

interface Key {
  position: Position;
  size: Size;
  collected: boolean;
}

interface HubStore {
  gameState: 'hub' | 'transitioning';
  interactionState: 'idle' | 'conversation' | 'confirmed' | 'startGame';
  selectedOption: 'yes' | 'no';
  player: Player;
  npcs: NPC[];
  playerController: PlayerController | null;
  door: Door;
  key: Key;
  hasKey: boolean;
  showSettingsModal: boolean;
  customKeyBindings: CustomKeyBindings | null;
  
  // Actions
  initializeHub: () => void;
  updateHub: (deltaTime: number, keys: Set<string>, keyBindings?: CustomKeyBindings) => void;
  setCustomKeyBindings: (bindings: CustomKeyBindings) => void;
  interactWithNPC: () => void;
  checkDoorInteraction: () => void;
  selectOption: (option: 'yes' | 'no') => void;
  confirmSelection: () => void;
  endInteraction: () => void;
  openSettingsModal: () => void;
  closeSettingsModal: () => void;
}

export const useHubStore = create<HubStore>((set, get) => ({
  gameState: 'hub',
  interactionState: 'idle',
  selectedOption: 'no',
  customKeyBindings: null,
  player: {
    position: { x: 400, y: 300 },
    size: { width: 30, height: 30 }
  },
  npcs: [],
  playerController: null,
  door: {
    position: { x: 750, y: 280 },
    size: { width: 30, height: 40 },
    isOpen: false
  },
  key: {
    position: { x: -100, y: -100 }, // Hidden initially
    size: { width: 20, height: 20 },
    collected: false
  },
  hasKey: false,
  showSettingsModal: false,
  
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
      door: {
        position: { x: 750, y: 280 },
        size: { width: 30, height: 40 },
        isOpen: false
      },
      key: {
        position: { x: -100, y: -100 }, // Hidden initially
        size: { width: 20, height: 20 },
        collected: false
      },
      hasKey: false,
      showSettingsModal: false,
      customKeyBindings: null,
      npcs: [
        {
          id: 'game_master',
          name: 'Game Master',
          position: { x: 200, y: 150 },
          size: { width: 40, height: 40 },
          dialogue: 'Press E to receive the key to the door.'
        },
        {
          id: 'lenny_sterner',
          name: 'Lenny Sterner',
          position: { x: 600, y: 150 },
          size: { width: 40, height: 40 },
          dialogue: 'Hello there! Good luck in the levels ahead.'
        }
      ]
    });
  },
  
  updateHub: (deltaTime: number, keys: Set<string>, keyBindings?: CustomKeyBindings) => {
    const state = get();
    if (state.interactionState !== 'idle' || !state.playerController) return;
    
    const currentBindings = keyBindings || state.customKeyBindings || {
      up: 'ArrowUp',
      down: 'ArrowDown',
      left: 'ArrowLeft', 
      right: 'ArrowRight',
      interact: 'KeyE',
      walking: 'ControlLeft'
    };
    
    // Handle interact key for interactions
    if (keys.has(currentBindings.interact)) {
      get().interactWithNPC();
    }
    
    // Convert keys to input state with custom bindings
    const inputState = keysToInputState(keys, currentBindings);
    
    // Update player position using PlayerController
    const newPosition = state.playerController.update(inputState, deltaTime);
    
    // Check for key collection
    if (!state.key.collected && !state.hasKey) {
      const keyDistance = Math.sqrt(
        Math.pow(newPosition.x - state.key.position.x, 2) +
        Math.pow(newPosition.y - state.key.position.y, 2)
      );
      
      if (keyDistance < 40) {
        set({
          key: { ...state.key, collected: true },
          hasKey: true
        });
      }
    }
    
    // Check door interaction for level transition
    get().checkDoorInteraction();
    
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
    
    if (nearbyNPC) {
      if (nearbyNPC.id === 'game_master' && !state.hasKey) {
        // Give the player the key
        set({
          key: {
            ...state.key,
            position: { x: state.player.position.x + 50, y: state.player.position.y },
            collected: false
          }
        });
      } else if (nearbyNPC.id === 'lenny_sterner') {
        // Open settings modal
        get().openSettingsModal();
      }
    }
  },

  checkDoorInteraction: () => {
    const state = get();
    
    // Check if player is near the door
    const doorDistance = Math.sqrt(
      Math.pow(state.player.position.x - state.door.position.x, 2) +
      Math.pow(state.player.position.y - state.door.position.y, 2)
    );
    
    // If player has the key and is near the door, open it and start level 1
    if (state.hasKey && doorDistance < 50) {
      set({
        door: { ...state.door, isOpen: true },
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
  },

  openSettingsModal: () => {
    set({ showSettingsModal: true });
  },

  closeSettingsModal: () => {
    set({ showSettingsModal: false });
  },

  setCustomKeyBindings: (bindings: CustomKeyBindings) => {
    set({ customKeyBindings: bindings });
  }
}));