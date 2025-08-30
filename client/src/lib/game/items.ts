import { InventoryItem } from "../stores/useSnakeGame";

export const GAME_ITEMS: Record<string, () => InventoryItem> = {
  fifoSystem: () => ({
    id: `fifo_system_${Date.now()}`, // Unique ID
    name: "FIFO System",
    description: "Your personal trainer for speed",
    image: "🟨", // Yellow square emoji
    duration: "permanent" as const,
    modifiers: {
      playerSpeed: 2.0, // doubles player speed
      walkSpeed: 2.0, // doubles walk speed
    },
    isActive: true,
  }),

  shinyObject: () => ({
    id: `shiny_object_${Date.now()}`, // Unique ID
    name: "Shiny Object",
    description: "Made with less than 80 high quality ingredients",
    image: "🛡️", // Shield emoji for protection
    duration: "permanent" as const,
    modifiers: {
      biteProtection: 1, // allows 1 additional bites before death
    },
    isActive: true, // Permanent items should be active by default
  }),

  stapler: () => ({
    id: `stapler_${Date.now()}`, // Unique ID
    name: "Stapler",
    description: "I'll build one",
    image: "📎", // Paperclip emoji for stapler
    duration: "permanent" as const,
    modifiers: {
      snakeChaseMultiplier: 0, // sets all snake chase values to 0
    },
    isActive: true, // Permanent items should be active by default
  }),

  fingerTrap: () => ({
    id: `finger_trap_${Date.now()}`, // Unique ID
    name: "Finger Trap",
    description: "Caution, for fingers only.",
    image: "🏮", // Lantern emoji
    duration: "permanent" as const,
    modifiers: {
      dashSpeed: 3.05, // 305% increase in dash speed
      dashDuration: 0.328, // ~67% decrease in duration (1/3.05) to maintain same distance
    },
    isActive: true, // Permanent items should be active by default
  }),
};
