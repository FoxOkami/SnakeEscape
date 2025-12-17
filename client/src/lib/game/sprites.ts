
export interface SpriteDefinition {
    x: number;
    y: number;
    width: number;
    height: number;
}

export const STATIC_SPRITES: Record<string, SpriteDefinition> = {
    // NPCs
    'lenny_sterner': { x: 0, y: 0, width: 32, height: 32 },
    'game_master': { x: 0, y: 32, width: 32, height: 32 },
    'rick': { x: 0, y: 64, width: 32, height: 32 },
    'dr_j': { x: 0, y: 96, width: 32, height: 32 },
    'dying_old_man': { x: 0, y: 128, width: 32, height: 32 },

    // Hospital Bed (Special Entity)
    'hospital_bed': { x: 96, y: 0, width: 64, height: 32 },

    // Items
    'chubbs_hand': { x: 32, y: 0, width: 32, height: 32 },
    'elis_hip': { x: 32, y: 32, width: 32, height: 32 },
    'barbra_hat': { x: 32, y: 64, width: 32, height: 32 },
    'box_of_golf_balls': { x: 32, y: 96, width: 32, height: 32 },
    '4_iron': { x: 32, y: 128, width: 32, height: 32 },
    'the_prophecy': { x: 64, y: 0, width: 32, height: 32 },
    'hammer': { x: 64, y: 32, width: 32, height: 32 },
    'box_of_nails': { x: 64, y: 64, width: 32, height: 32 },
    'bag_of_concrete': { x: 64, y: 96, width: 32, height: 32 },
    'the_blue_album': { x: 64, y: 128, width: 32, height: 32 },
    'origami_book': { x: 96, y: 32, width: 32, height: 32 },
    'tennis_racket': { x: 96, y: 64, width: 32, height: 32 },
    'yoga_block': { x: 96, y: 96, width: 32, height: 32 },
    'key': { x: 96, y: 128, width: 32, height: 32 },
};
