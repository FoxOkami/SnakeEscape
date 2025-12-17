import { create } from 'zustand';
import {
  keysToInputState,
  type Position,
  type Size,
  type CustomKeyBindings
} from '../game/PlayerController';
import { useSnakeGame } from './useSnakeGame';
import { checkAABBCollision } from '../game/collision';


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
  interactionState: 'idle' | 'conversation' | 'confirmed' | 'startGame' | 'message';
  selectedOption: 'yes' | 'no';
  activeDialogue: string | null;
  drJDialogueIndex: number;
  player: Player;
  npcs: NPC[];
  door: Door;
  key: Key;
  hasKey: boolean;
  showSettingsModal: boolean;
  showShopModal: boolean;
  customKeyBindings: CustomKeyBindings | null;
  lastInteractionTime: number;

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
  openShopModal: () => void;
  closeShopModal: () => void;
  closeMessage: () => void;
}

export const useHubStore = create<HubStore>((set, get) => ({
  gameState: 'hub',
  interactionState: 'idle',
  selectedOption: 'no',
  activeDialogue: null,
  drJDialogueIndex: 0,
  customKeyBindings: null,
  player: {
    position: { x: 400, y: 300 },
    size: { width: 30, height: 30 }
  },
  npcs: [],
  door: {
    position: { x: 770, y: 280 },
    size: { width: 30, height: 40 },
    isOpen: false
  },
  key: {
    position: { x: -100, y: -100 }, // Hidden initially
    size: { width: 32, height: 32 },
    collected: false
  },
  hasKey: false,
  showSettingsModal: false,
  showShopModal: false,
  lastInteractionTime: 0,

  initializeHub: () => {
    const playerSize = { width: 30, height: 30 };
    const playerPosition = { x: 400, y: 300 };

    // Configure unified PlayerController for hub usage
    useSnakeGame.getState().configurePlayerController();

    // Set player position in main store
    useSnakeGame.setState(state => ({
      player: {
        ...state.player,
        position: playerPosition,
        size: playerSize
      }
    }));

    set({
      gameState: 'hub',
      interactionState: 'idle',
      selectedOption: 'no',
      activeDialogue: null,
      player: {
        position: playerPosition,
        size: playerSize
      },
      door: {
        position: { x: 770, y: 280 },
        size: { width: 30, height: 40 },
        isOpen: false
      },
      key: {
        position: { x: -100, y: -100 }, // Hidden initially
        size: { width: 32, height: 32 },
        collected: false
      },
      hasKey: false,
      showSettingsModal: false,
      showShopModal: false,
      customKeyBindings: null,
      lastInteractionTime: 0,
      npcs: [
        {
          id: 'game_master',
          name: 'Game Master',
          position: { x: 200, y: 150 },
          size: { width: 32, height: 32 },
          dialogue: 'Press E to receive the key to the door.'
        },
        {
          id: 'lenny_sterner',
          name: 'Lenny Sterner',
          position: { x: 600, y: 150 },
          size: { width: 32, height: 32 },
          dialogue: 'Hello there! Good luck in the levels ahead.'
        },
        {
          id: 'rick',
          name: 'Rick',
          position: { x: 200, y: 450 },
          size: { width: 32, height: 32 },
          dialogue: 'Got some rare items for sale!'
        },
        {
          id: 'dr_j',
          name: 'Dr. J',
          position: { x: 600, y: 450 },
          size: { width: 32, height: 32 },
          dialogue: '' // Dynamic
        },
        {
          id: 'dying_old_man',
          name: 'Dying old man filled with regret',
          position: { x: 400, y: 525 },
          size: { width: 32, height: 32 },
          dialogue: 'You know, before I got sucked into the Snake Room world, I use to make a damn good shirt.'
        },
        {
          id: 'hospital_bed',
          name: '', // No name tag
          position: { x: 660, y: 450 }, // East of Dr. J
          size: { width: 64, height: 32 },
          dialogue: '' // No dialogue
        }
      ]
    });
  },

  updateHub: (deltaTime: number, keys: Set<string>, keyBindings?: CustomKeyBindings) => {
    const state = get();
    const gameState = useSnakeGame.getState();
    if (state.interactionState !== 'idle' || !gameState.playerController) return;

    const currentBindings = keyBindings || state.customKeyBindings || {
      up: 'ArrowUp',
      down: 'ArrowDown',
      left: 'ArrowLeft',
      right: 'ArrowRight',
      interact: 'KeyE',
      secondaryInteract: 'KeyQ',
      walking: 'ControlLeft',
      dash: 'Space'
    };

    // Handle interact key for interactions
    if (keys.has(currentBindings.interact)) {
      get().interactWithNPC();
    }

    // Convert keys to input state with custom bindings
    const inputState = keysToInputState(keys, currentBindings);

    // Update player using unified controller
    useSnakeGame.getState().updatePlayerController(deltaTime, inputState);

    // Get updated position from unified controller
    const updatedGameState = useSnakeGame.getState();
    const newPosition = updatedGameState.player.position;

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

    // Update local hub player position to match unified controller
    set({
      player: {
        ...state.player,
        position: newPosition
      }
    });

  },

  interactWithNPC: () => {
    const state = get();
    const now = Date.now();

    // Prevent rapid re-interactions (debounce for 200ms)
    if (now - state.lastInteractionTime < 200) {
      return;
    }

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
          },
          lastInteractionTime: now
        });
      } else if (nearbyNPC.id === 'lenny_sterner') {
        // Open settings modal
        set({ lastInteractionTime: now });
        get().openSettingsModal();
      } else if (nearbyNPC.id === 'rick') {
        // Open shop modal
        set({ lastInteractionTime: now });
        get().openShopModal();
      } else if (nearbyNPC.id === 'dr_j') {
        // Dr. J Cycling Dialogue
        const quotes = [
          "I think it's time to adopt a champion's mindset.",
          "Have you created your identity statement yet?",
          "Your practice needs to be deliberate and measurable.",
          "Remember, growth over outcomes.",
          "Control the controllables.",
          "Rephrase negative thoughts into positive intentions.",
          "You must practice under pressure to acclimate yourself to it."
        ];

        const currentQuote = quotes[state.drJDialogueIndex % quotes.length];

        set({
          interactionState: 'message',
          activeDialogue: currentQuote,
          drJDialogueIndex: state.drJDialogueIndex + 1,
          lastInteractionTime: now
        });
      } else if (nearbyNPC.id === 'dying_old_man') {
        // Dying old man logic
        const updatedNPCs = state.npcs.map(npc => {
          if (npc.id === 'dying_old_man' && npc.name === 'Dying old man filled with regret') {
            return { ...npc, name: 'Ralph Leeward' };
          }
          return npc;
        });

        set({
          npcs: updatedNPCs,
          interactionState: 'message',
          activeDialogue: nearbyNPC.dialogue,
          lastInteractionTime: now
        });
      }
    }
  },

  closeMessage: () => {
    set({
      interactionState: 'idle',
      activeDialogue: null
    });
  },

  checkDoorInteraction: () => {
    const state = get();

    // Create rectangles for AABB collision detection (same as main game)
    const playerRect = {
      x: state.player.position.x,
      y: state.player.position.y,
      width: state.player.size.width,
      height: state.player.size.height,
    };

    const doorRect = {
      x: state.door.position.x,
      y: state.door.position.y,
      width: state.door.size.width,
      height: state.door.size.height,
    };

    // If player has the key and is colliding with the door, open it and start level 1
    if (state.hasKey && checkAABBCollision(playerRect, doorRect)) {
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
  },

  openShopModal: () => {
    set({ showShopModal: true });
  },

  closeShopModal: () => {
    set({ showShopModal: false });
  }
}));