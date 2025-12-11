import React, { useMemo, useEffect } from 'react';
import { useHubStore } from '../../lib/stores/useHubStore';
import { useSnakeGame } from '../../lib/stores/useSnakeGame';
import { useTicketStore } from '../../lib/stores/useTicketStore';
import { GAME_ITEMS } from '../../lib/game/items';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

export const ShopModal: React.FC = () => {
    const { showShopModal, closeShopModal } = useHubStore();
    const { tickets, addTickets } = useTicketStore((state) => state);
    const { inventoryItems, addInventoryItem, useInventoryItem } = useSnakeGame();

    // Close on ESC
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && showShopModal) {
                closeShopModal();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showShopModal, closeShopModal]);

    const sortedItems = useMemo(() => {
        return Object.values(GAME_ITEMS)
            .map(itemFactory => itemFactory())
            .filter(item => (item.ticketCost || 0) > 0)
            .sort((a, b) => (b.ticketCost || 0) - (a.ticketCost || 0));
    }, []);

    const handlePurchase = (item: ReturnType<typeof GAME_ITEMS[keyof typeof GAME_ITEMS]>) => {
        const cost = item.ticketCost || 0;
        // Double check affordability
        if (tickets < cost) return;

        // Deduct tickets
        addTickets(-cost);

        // Add to inventory
        addInventoryItem(item);

        // Automatically set to active as per requirements
        // Note: InventoryItem interface has isActive. addInventoryItem adds it.
        // We should ensure it's active. The item definition usually has isActive true/false appropriately.
        // Should we force it? The requirement says "automatically set to active".
        // GAME_ITEMS usually initialize with a default isActive. Let's explicitly toggle if needed or just trust the item definition?
        // "item be added to the player's inventory and automatically set to active" -> implies we should ensure it's active.
        if (!item.isActive) {
            useInventoryItem(item.id);
        }
    };

    const isOwned = (itemName: string) => {
        return inventoryItems.some(invItem => invItem.name === itemName);
    };

    const getFormattedModifiers = (modifiers: Record<string, number>) => {
        const mappings: Record<string, string> = {
            biteProtection: 'Armor',
            playerSpeed: 'Run Speed',
            walkSpeed: 'Walk Speed',
            dashCooldown: 'Dash Cooldown',
            dashSpeed: 'Dash Speed',
            dashDuration: 'Dash Duration',
            snakeSightMultiplier: 'Snake Sight Reduction',
            snakeHearingMultiplier: 'Snake Hearing Reduction',
            snakeChaseMultiplier: 'Snake Speed',
        };

        return Object.entries(modifiers).map(([key, value]) => {
            const label = mappings[key];
            if (!label) return null;

            let formattedValue = '';
            if (key === 'biteProtection') {
                formattedValue = `+${value}`;
            } else if (key === 'snakeSightMultiplier' || key === 'snakeHearingMultiplier') {
                // Reductions: 0.9 -> 10% reduction
                const percentage = Math.round((1 - value) * 100);
                formattedValue = `${percentage}%`;
            } else {
                // Standard multipliers: 1.1 -> +10%, 0.9 -> -10%
                const percentage = Math.round((value - 1) * 100);
                const sign = percentage > 0 ? '+' : '';
                formattedValue = `${sign}${percentage}%`;
            }

            return (
                <div key={key} className="flex justify-between w-full text-[10px] font-bold text-gray-600">
                    <span>{label}</span>
                    <span>{formattedValue}</span>
                </div>
            );
        }).filter(Boolean);
    };

    if (!showShopModal) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-[800px] max-w-[95vw] max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                        <h2 className="text-3xl font-bold text-gray-800">Rick's Rare Wares</h2>
                        <Badge className="bg-yellow-600 text-white text-lg px-3 py-1">
                            🎟️ {tickets}
                        </Badge>
                    </div>

                    <button
                        onClick={closeShopModal}
                        className="text-gray-500 hover:text-gray-700 text-4xl font-bold leading-none"
                    >
                        ×
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {sortedItems.map((item) => {
                        const owned = isOwned(item.name);
                        const cost = item.ticketCost || 0;
                        const canAfford = tickets >= cost;

                        return (
                            <div
                                key={item.id}
                                className={`border rounded-lg p-3 flex flex-col items-center gap-2 transition-all h-full ${owned ? 'bg-gray-100 grayscale opacity-80' : 'bg-white hover:shadow-md border-gray-200'
                                    }`}
                            >
                                <div className="text-3xl mb-1">{item.image}</div>
                                <h3 className="font-bold text-center text-sm h-10 flex items-center justify-center leading-tight">
                                    {item.name}
                                </h3>

                                <div className="text-[10px] leading-3 text-gray-500 text-center line-clamp-3 h-9 w-full">
                                    {item.description}
                                </div>

                                <div className="w-full bg-gray-50 rounded p-1 mb-2 space-y-0.5">
                                    {getFormattedModifiers(item.modifiers)}
                                </div>

                                <div className="w-full mt-auto pt-1">
                                    {owned ? (
                                        <div className="text-red-600 font-bold text-center uppercase text-sm border-2 border-red-600 rounded px-2 py-1 transform rotate-[-5deg] w-full">
                                            Sold Out
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-1 w-full">
                                            <div className="text-center font-bold text-yellow-600">
                                                {cost} 🎟️
                                            </div>
                                            <Button
                                                onClick={() => handlePurchase(item)}
                                                disabled={!canAfford}
                                                className={`w-full text-xs py-1 h-7 ${canAfford
                                                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                    }`}
                                            >
                                                Buy
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-6 text-center text-gray-500 text-sm">
                    "No refunds. No returns. No asking where I got these." - Rick
                </div>
            </div>
        </div>
    );
};
