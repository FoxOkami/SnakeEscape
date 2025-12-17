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
    isActive: true,
    ticketCost: -1, // set to negative because it's not meant to be purchased
  }),

  /*------------------------*/
  /* Can be purchased items */
  /*------------------------*/
  lifoSystem: () => ({
    id: `lifo_system_${Date.now()}`, // Unique ID
    name: "LIFO System",
    description: "Your personal trainer for speed",
    image: "🟨", // Yellow square emoji
    duration: "permanent" as const,
    modifiers: {
      playerSpeed: 2.0, // doubles player speed
      walkSpeed: 2.0, // doubles walk speed
    },
    isActive: true,
    ticketCost: 588,
  }),

  cinnamonRoll2005: () => ({
    id: `cinnamon_roll_2005_${Date.now()}`, // Unique ID
    name: "2005 Cinnamon Roll",
    description: "Unforgettable",
    image: "🍥",
    duration: "permanent" as const,
    modifiers: {
      biteProtection: 6,
    },
    isActive: true,
    ticketCost: 396,
  }),

  hypnodisc: () => ({
    id: `hypnodisc_${Date.now()}`, // Unique ID
    name: "Hypnodisc",
    description: "You are gonna love spiders after this",
    image: "😵‍💫", // Dizzy face emoji
    duration: "permanent" as const,
    modifiers: {
      dashCooldown: 0.9, // 10% less dash cooldown
      dashSpeed: 1.1, // 10% increase in dash speed
      dashDuration: 1.1, // increase of .1 is actually closer to .2 because of other modifiers above
    },
    isActive: true,
    ticketCost: 322,
  }),

  lootGertysSausage: () => ({
    id: `loot_gertys_sausage_${Date.now()}`, // Unique ID
    name: "Loot Gerty's Sausage",
    description: "Quite possibly the best sausage",
    image: "🌭", // Hot dog emoji
    duration: "permanent" as const,
    modifiers: {
      snakeSightMultiplier: 0.97, // 3% reduction in snake sight detection radius
      snakeHearingMultiplier: 0.97, // 3% reduction in snake hearing detection radius
    },
    isActive: true,
    ticketCost: 262,
  }),

  natures2ndCarrot: () => ({
    id: `natures_2nd_carrot_${Date.now()}`, // Unique ID
    name: "Natures 2nd Carrot",
    description: "Good vibes only",
    image: "🕶️",
    duration: "permanent" as const,
    modifiers: {
      biteProtection: 5,
    },
    isActive: true,
    ticketCost: 213,
  }),

  caramelizedSalmonSticks: () => ({
    id: `caramelized_salmon_sticks_${Date.now()}`, // Unique ID
    name: "Caramelized Salmon Sticks",
    description: "Slimy yet satisfying",
    image: "🐟",
    duration: "permanent" as const,
    modifiers: {
      walkSpeed: 1.35, // 35% increase in walk speed
    },
    isActive: true,
    ticketCost: 174,
  }),

  rangeFinder: () => ({
    id: `range_finder_${Date.now()}`, // Unique ID
    name: "Range Finder",
    description: "This particular one has a magnet and is white and blue",
    image: "🎯",
    duration: "permanent" as const,
    modifiers: {
      snakeSightMultiplier: 0.96,
    },
    isActive: true,
    ticketCost: 141,
  }),

  porkCone: () => ({
    id: `pork_cone_${Date.now()}`, // Unique ID
    name: "Pork in an Ice Cream Cone",
    description: "It's an ice cream cone filled with pork",
    image: "🍦",
    duration: "permanent" as const,
    modifiers: {
      snakeHearingMultiplier: 0.96, // 4% reduction in snake hearing detection radius
    },
    isActive: true,
    ticketCost: 115,
  }),

  copperLinedGloves: () => ({
    id: `copper_lined_gloves_${Date.now()}`, // Unique ID
    name: "Copper Lined Gloves",
    description: "With gloves like these, I could have been in the NFL",
    image: "🧤",
    duration: "permanent" as const,
    modifiers: {
      playerSpeed: 1.2,
    },
    isActive: true,
    ticketCost: 94,
  }),

  burgerDog: () => ({
    id: `burgerdog_${Date.now()}`, // Unique ID
    name: "Burgerdog",
    description: "Get one at the turn",
    image: "🍔🌭",
    duration: "permanent" as const,
    modifiers: {
      // the goal using both dash speed and duration is to keep the distance the same while increasing the speed
      dashSpeed: 1.1, // 10% increase in dash speed
      dashDuration: 0.91, // ~9% decrease in duration (1/1.1) to maintain similar distance as base
    },
    isActive: true,
    ticketCost: 76,
  }),

  flute: () => ({
    id: `flute_${Date.now()}`, // Unique ID
    name: "Flute",
    description: "A woodwind instrument",
    image: "🪈",
    duration: "permanent" as const,
    modifiers: {
      snakeChaseMultiplier: 0.9,
    },
    isActive: true,
    ticketCost: 62,
  }),

  bbbgSandwich: () => ({
    id: `bbbg_sandwich_${Date.now()}`, // Unique ID
    name: "BBBG Sandwich",
    description: "The G stands for Grease",
    image: "🥓",
    duration: "permanent" as const,
    modifiers: {
      biteProtection: 4,
    },
    isActive: true,
    ticketCost: 50,
  }),

  fullFlavoredCigarette: () => ({
    id: `full_flavored_cigarette_${Date.now()}`, // Unique ID
    name: "Full Flavored Cigarette",
    description: "Often enjoyed by the dying old man with regrets",
    image: "🚬",
    duration: "permanent" as const,
    modifiers: {
      snakeSightMultiplier: 0.97, // 3% reduction in snake sight detection radius
    },
    isActive: true,
    ticketCost: 41,
  }),

  butterJoggers: () => ({
    id: `butter_Joggers_${Date.now()}`, // Unique ID
    name: "Butter Joggers",
    description: "Made in a butter factory",
    image: "👖",
    duration: "permanent" as const,
    modifiers: {
      snakeHearingMultiplier: 0.97, // 3% reduction in snake hearing detection radius
    },
    isActive: true,
    ticketCost: 33,
  }),

  meatPastry: () => ({
    id: `meat_pastry_${Date.now()}`, // Unique ID
    name: "Meat Pastry",
    description: "Meat filled dough",
    image: "🥐",
    duration: "permanent" as const,
    modifiers: {
      playerSpeed: 1.15,
    },
    isActive: true,
    ticketCost: 27,
  }),

  grippySocks: () => ({
    id: `grippy_socks_${Date.now()}`, // Unique ID
    name: "Grippy Socks",
    description: "Extra traction and you look cooler too!",
    image: "🧦",
    duration: "permanent" as const,
    modifiers: {
      dashDuration: 1.2, // 20% increase in dash distance
    },
    isActive: true,
    ticketCost: 22,
  }),

  drinkableGreens: () => ({
    id: `drinkable_greens_${Date.now()}`, // Unique ID
    name: "Drinkable Greens",
    description: "Made with less than 80 high quality ingredients",
    image: "🌱",
    duration: "permanent" as const,
    modifiers: {
      snakeChaseMultiplier: 0.95,
    },
    isActive: true,
    ticketCost: 18,
  }),

  xxlButtonUpT: () => ({
    id: `xxl_button_up_t_${Date.now()}`, // Unique ID
    name: "XXL Button Up T-shirt",
    description: "Made specifically for people who normally wear medium",
    image: "👕",
    duration: "permanent" as const,
    modifiers: {
      biteProtection: 3,
    },
    isActive: true,
    ticketCost: 15,
  }),

  redFlatCap: () => ({
    id: `red_flat_cap_${Date.now()}`, // Unique ID
    name: "Red Flat Cap",
    description: "A fashion statement for sure",
    image: "⛑️",
    duration: "permanent" as const,
    modifiers: {
      snakeSightMultiplier: 0.98,
    },
    isActive: true,
    ticketCost: 12,
  }),

  craigersSnakeWater: () => ({
    id: `craigers_snake_water_${Date.now()}`, // Unique ID
    name: "Craiger's Snake Water",
    description: "As delicious as it is dangerous",
    image: "🐍💦",
    duration: "permanent" as const,
    modifiers: {
      snakeHearingMultiplier: 0.98,
    },
    isActive: true,
    ticketCost: 10,
  }),

  creepyStuffedOwl: () => ({
    id: `creepy_stuffed_owl_${Date.now()}`, // Unique ID
    name: "Creepy Stuffed Owl",
    description: "How many owls would you have to see to be freaked out?",
    image: "🦉",
    duration: "permanent" as const,
    modifiers: {
      playerSpeed: 1.1, // 10% increase in run speed
    },
    isActive: true,
    ticketCost: 8,
  }),

  coolMix: () => ({
    id: `cool_mix_${Date.now()}`, // Unique ID
    name: "Cool Mix",
    description: "75%, 15%, 10%",
    image: "🥤",
    duration: "permanent" as const,
    modifiers: {
      dashCooldown: 0.9,
    },
    isActive: true,
    ticketCost: 6,
  }),

  joysFeet: () => ({
    id: `feet_joys_${Date.now()}`, // Unique ID
    name: "Joy's Feet",
    description: "The #1 Foot in Golf",
    image: "👠",
    duration: "permanent" as const,
    modifiers: {
      walkSpeed: 1.10, // 10% increase in walk speed
    },
    isActive: true,
    ticketCost: 5,
  }),

  coldCrustlessPbj: () => ({
    id: `cold_crustless_pbj_${Date.now()}`, // Unique ID
    name: "Cold Crustless PB & J",
    description: "PB&J filled deliciousness! Isn't it something?!",
    image: "🥪",
    duration: "permanent" as const,
    modifiers: {
      biteProtection: 2,
    },
    isActive: true,
    ticketCost: 4,
  }),

  snakeOil: () => ({
    id: `snake_oil_${Date.now()}`, // Unique ID
    name: "Snake Oil",
    description: "Deceptive marketing? Scam? You be the judge",
    image: "🛢️",
    duration: "permanent" as const,
    modifiers: {
      snakeSightMultiplier: 0.99, // 1% reduction in snake sight detection radius
    },
    isActive: true,
    ticketCost: 3,
  }),

  yoyo: () => ({
    id: `yoyo_${Date.now()}`, // Unique ID
    name: "Yoyo",
    description: "Once you get it going you got it going",
    image: "🪀",
    duration: "permanent" as const,
    modifiers: {
      snakeHearingMultiplier: 0.99, // 1% reduction in snake hearing detection radius
    },
    isActive: true,
    ticketCost: 3,
  }),

  chocolateTaffyRoll: () => ({
    id: `chocolate_taffy_roll_${Date.now()}`, // Unique ID
    name: "Chocolate Taffy Roll",
    description: "It's like a tiny wrapped turd",
    image: "🟤", // Brown circle emoji
    duration: "permanent" as const,
    modifiers: {
      playerSpeed: 1.05, // increase run speed by 5%
    },
    isActive: true,
    ticketCost: 2,
  }),

  fingerTrap: () => ({
    id: `finger_trap_${Date.now()}`, // Unique ID
    name: "Finger Trap",
    description: "Caution, for fingers only",
    image: "🏮", // Lantern emoji
    duration: "permanent" as const,
    modifiers: {
      // the goal using both dash speed and duration is to keep the distance the same while increasing the speed
      dashSpeed: 1.05, // 5% increase in dash speed
      dashDuration: 0.95, // ~5% decrease in duration (1/1.05) to maintain similar distance as base
    },
    isActive: true,
    ticketCost: 2,
  }),

  starBlastCandy: () => ({
    id: `starblast_candy_${Date.now()}`, // Unique ID
    name: "Starblast Candy",
    description: "It's as if a star burst into candy",
    image: "🟥", // Red square emoji
    duration: "permanent" as const,
    modifiers: {
      walkSpeed: 1.05, // increases walk speed by 5%
    },
    isActive: true,
    ticketCost: 2,
  }),

  shinyObject: () => ({
    id: `shiny_object_${Date.now()}`, // Unique ID
    name: "Shiny Object",
    description: "I can't help but chase it",
    image: "🛡️", // Shield emoji for protection
    duration: "permanent" as const,
    modifiers: {
      biteProtection: 1, // allows 1 additional bites before death
    },
    isActive: true,
    ticketCost: 1,
  }),
};
