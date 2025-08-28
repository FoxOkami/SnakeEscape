import { InventoryItem } from '../stores/useSnakeGame';

export const CHEAT_ITEMS: Record<string, () => InventoryItem> = {
  stackRadar: () => ({
    id: `stack_radar_${Date.now()}`, // Unique ID
    name: 'Stack Radar',
    description: 'Player speed drastically increased',
    image: '🟨', // Yellow square emoji
    duration: 'temporary' as const,
    modifiers: {
      playerSpeed: 2.0, // doubles player speed
      walkSpeed: 2.0 // doubles walk speed
    },
    isActive: false
  }),

  drinkableGreens: () => ({
    id: `ag1_${Date.now()}`, // Unique ID
    name: 'drinkable greens',
    description: 'Player can handle 2 more bites',
    image: '🛡️', // Shield emoji for protection
    duration: 'permanent' as const,
    modifiers: {
      biteProtection: 2 // allows 2 additional bites before death
    },
    isActive: true // Permanent items should be active by default
  }),

  stapler: () => ({
    id: `stapler_${Date.now()}`, // Unique ID
    name: 'Stapler',
    description: "I'll build one",
    image: '📎', // Paperclip emoji for stapler
    duration: 'permanent' as const,
    modifiers: {
      snakeChaseMultiplier: 0 // sets all snake chase values to 0
    },
    isActive: true // Permanent items should be active by default
  })
};