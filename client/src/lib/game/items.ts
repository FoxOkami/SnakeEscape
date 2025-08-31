import { InventoryItem } from "../stores/useSnakeGame";

export const GAME_ITEMS: Record<string, () => InventoryItem> = {
  /*------------------------*/
  /*    Cheat only items    */
  /*------------------------*/
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

  /*------------------------*/
  /* Can be purchased items */
  /*------------------------*/
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

  cinnamonRoll2005: () => ({
    id: `cinnamon_roll_2005_${Date.now()}`, // Unique ID
    name: "2005 Cinnamon Roll",
    description: "Unforgettable",
    image: "🍥", // Yellow square emoji
    duration: "temporary" as const,
    modifiers: {
      biteProtection: 7,
    },
    isActive: false,
  }),

  hypnodisc: () => ({
    id: `hypnodisc_${Date.now()}`, // Unique ID
    name: "Hypnodisc",
    description: "You are gonna love spiders after this.",
    image: "😵‍💫", // Dizzy face emoji
    duration: "permanent" as const,
    modifiers: {
      dashCooldown: 0.9, // 10% less dash cooldown
      dashSpeed: 1.1, // 10% increase in dash speed
      dashDuration: 1, // keeping duration at 1 means the distance is increased too
    },
    isActive: true, // Permanent items should be active by default
  }),

  chocolateTaffyRoll: () => ({
    id: `chocolate_taffy_roll_${Date.now()}`, // Unique ID
    name: "Chocolate Taffy Roll",
    description: "it's like a tiny wrapped turd",
    image: "🟫", // Brown square emoji
    duration: "temporary" as const,
    modifiers: {
      playerSpeed: 1.1, // increase run speed by 10%
    },
    isActive: false,
  }),

  fingerTrap: () => ({
    id: `finger_trap_${Date.now()}`, // Unique ID
    name: "Finger Trap",
    description: "Caution, for fingers only.",
    image: "🏮", // Lantern emoji
    duration: "permanent" as const,
    modifiers: {
      dashSpeed: 1.05, // 5% increase in dash speed
      dashDuration: 0.95, // ~5% decrease in duration (1/1.05) to maintain similar distance as base
    },
    isActive: true, // Permanent items should be active by default
  }),

  starBlastCandy: () => ({
    id: `starblast_candy_${Date.now()}`, // Unique ID
    name: "Starblast Candy",
    description: "It's as if a star burst into candy",
    image: "🟥", // Red square emoji
    duration: "temporary" as const,
    modifiers: {
      walkSpeed: 1.1, // increases walk speed by 10%
    },
    isActive: false,
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

  lootGertysSausage: () => ({
    id: `loot_gertys_sausage_${Date.now()}`, // Unique ID
    name: "Loot Gerty's Sausage",
    description: "Quite possibly the best sausage",
    image: "🌭", // Hot dog emoji
    duration: "temporary" as const,
    modifiers: {
      snakeSightMultiplier: 0.97, // 3% reduction in snake sight detection radius
      snakeHearingMultiplier: 0.97, // 3% reduction in snake hearing detection radius
    },
    isActive: false,
  }),
};
