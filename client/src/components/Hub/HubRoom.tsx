import React, { useEffect, useRef, useState } from 'react';
import { useHubStore } from '../../lib/stores/useHubStore';
import { useSnakeGame } from '../../lib/stores/useSnakeGame';
import { useKeyBindings, type KeyBindings } from '../../lib/stores/useKeyBindings';
import { drawStandardTooltip, drawInteractionTooltip } from '../../lib/utils/tooltips';
import { InventoryModal } from '../ui/inventory';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

const HubRoom: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const playerImageRef = useRef<HTMLImageElement | null>(null);
  
  const {
    player,
    npcs,
    gameState,
    interactionState,
    selectedOption,
    door,
    key,
    hasKey,
    showSettingsModal,
    initializeHub,
    updateHub,
    interactWithNPC,
    selectOption,
    confirmSelection,
    endInteraction,
    closeSettingsModal
  } = useHubStore();

  const { 
    startLevel, 
    startLevelByName,
    showInventory, 
    openInventory, 
    closeInventory, 
    addInventoryItem, 
    inventoryItems, 
    useInventoryItem,
    togglePermanentItem,
    player: gamePlayer // Get player data from main game store for health display
  } = useSnakeGame();
  
  const [keys, setKeys] = useState<Set<string>>(new Set());
  const [imageLoaded, setImageLoaded] = useState(false);
  const [musicVolume, setMusicVolume] = useState(100);
  const [sfxVolume, setSfxVolume] = useState(100);
  const [editingKeyBinding, setEditingKeyBinding] = useState<string | null>(null);
  const [keyBindingError, setKeyBindingError] = useState<string | null>(null);
  const [cheatCodeInput, setCheatCodeInput] = useState<string>('');
  const [cheatCodeSuccess, setCheatCodeSuccess] = useState<boolean>(false);
  
  // Use global key bindings store
  const { keyBindings, setKeyBinding, getKeyDisplayText } = useKeyBindings();
  
  // Handle cheat code processing
  const handleCheatCode = () => {
    if (cheatCodeInput.trim().toLowerCase() === 'tangential') {
      // Add Stack Radar item to inventory
      const stackRadarItem = {
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
      };
      addInventoryItem(stackRadarItem);
      
      // Show success feedback
      setCheatCodeSuccess(true);
      setTimeout(() => {
        setCheatCodeSuccess(false);
      }, 1000); // Reset after 1 second
    } else if (cheatCodeInput.trim().toLowerCase() === 'katra') {
      // Add AG1 item to inventory
      const ag1Item = {
        id: `ag1_${Date.now()}`, // Unique ID
        name: 'drinkable greens',
        description: 'Player can handle 2 more bites',
        image: '🛡️', // Shield emoji for protection
        duration: 'permanent' as const,
        modifiers: {
          biteProtection: 2 // allows 2 additional bites before death
        },
        isActive: true // Permanent items should be active by default
      };
      addInventoryItem(ag1Item);
      
      // Immediately activate the item to apply shield health
      useInventoryItem(ag1Item.id);
      
      // Show success feedback
      setCheatCodeSuccess(true);
      setTimeout(() => {
        setCheatCodeSuccess(false);
      }, 1000); // Reset after 1 second
    } else if (cheatCodeInput.trim().toLowerCase() === 'stapling') {
      // Add Stapler item to inventory
      const staplerItem = {
        id: `stapler_${Date.now()}`, // Unique ID
        name: 'Stapler',
        description: "I'll build one",
        image: '📎', // Paperclip emoji for stapler
        duration: 'permanent' as const,
        modifiers: {
          snakeChaseMultiplier: 0 // sets all snake chase values to 0
        },
        isActive: true // Permanent items should be active by default
      };
      addInventoryItem(staplerItem);
      
      // Immediately activate the item to apply effect
      useInventoryItem(staplerItem.id);
      
      // Show success feedback
      setCheatCodeSuccess(true);
      setTimeout(() => {
        setCheatCodeSuccess(false);
      }, 1000); // Reset after 1 second
    }
    
    // Clear input after any Enter press (valid or invalid cheat code)
    setCheatCodeInput('');
  };
  
  // Health display component (same as in GameUI)
  const renderHealthDisplay = () => {
    return (
      <div className="absolute top-4 left-4 flex flex-col gap-1 z-50 pointer-events-none">
        {Array.from({ length: gamePlayer.maxHealth }, (_, index) => (
          <div
            key={index}
            className={`w-8 h-8 text-2xl font-bold flex items-center justify-center ${
              index < gamePlayer.health ? 'text-yellow-400' : 'text-gray-600'
            } ${gamePlayer.isInvincible ? 'animate-pulse' : ''}`}
            style={{
              filter: gamePlayer.isInvincible ? 'brightness(1.5)' : 'none',
              textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
            }}
          >
            ▲
          </div>
        ))}
        {gamePlayer.shieldHealth > 0 && (
          <div className="flex items-center gap-1 mt-1">
            <div className="text-blue-400 text-lg font-bold">🛡️</div>
            <div className="text-blue-400 text-sm font-bold">{gamePlayer.shieldHealth}</div>
          </div>
        )}
      </div>
    );
  };
  
  // Clear keys when settings modal opens to prevent stuck movement
  useEffect(() => {
    if (showSettingsModal) {
      setKeys(new Set());
    }
  }, [showSettingsModal]);
  
  // Refs to store current values for event handler
  const editingKeyBindingRef = useRef<string | null>(null);
  
  // Update refs when state changes
  useEffect(() => {
    editingKeyBindingRef.current = editingKeyBinding;
  }, [editingKeyBinding]);
  
  // Load player character image
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      playerImageRef.current = img;
      setImageLoaded(true);
    };
    img.onerror = (error) => {
      console.error('Failed to load player image:', error);
      setImageLoaded(false);
    };
    // Add cache busting parameter to ensure fresh load
    img.src = "/player-character.png?" + Date.now();
  }, []);
  
  
  useEffect(() => {
    initializeHub();
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle key binding editing - use refs to get current values
      const currentEditingKey = editingKeyBindingRef.current;
      
      if (currentEditingKey) {
        e.preventDefault();
        // Don't allow Escape to be bound as it's reserved for closing modals
        if (e.code !== 'Escape') {
          // Get current key bindings directly from the store to avoid stale state
          const currentKeyBindings = useKeyBindings.getState().keyBindings;
          
          // Check if the key is already bound to another action
          const conflictingAction = Object.entries(currentKeyBindings).find(
            ([action, keyCode]) => keyCode === e.code && action !== currentEditingKey
          );
          
          if (conflictingAction) {
            setKeyBindingError("Unable to bind the same key to multiple actions");
            // Auto-clear error after 3 seconds
            setTimeout(() => setKeyBindingError(null), 3000);
          } else {
            setKeyBinding(currentEditingKey as keyof KeyBindings, e.code);
            setKeyBindingError(null);
          }
        }
        setEditingKeyBinding(null);
        return;
      }
      
      // Close settings modal with Escape key - get current state from store
      const currentState = useHubStore.getState();
      if (e.code === 'Escape' && currentState.showSettingsModal) {
        closeSettingsModal();
        return;
      }
      
      // Close inventory modal with Escape key
      if (e.code === 'Escape' && showInventory) {
        closeInventory();
        return;
      }
      
      // Don't process any game keys when settings modal or inventory is open
      if (currentState.showSettingsModal || showInventory) {
        return;
      }
      
      setKeys(prev => new Set(prev).add(e.code));
      
      if (interactionState === 'conversation') {
        if (e.code === keyBindings.up) {
          selectOption('yes');
        } else if (e.code === keyBindings.down) {
          selectOption('no');
        } else if (e.code === keyBindings.interact || e.code === 'Enter') {
          confirmSelection();
        }
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      // Don't process key releases when settings modal or inventory is open
      const currentState = useHubStore.getState();
      if (currentState.showSettingsModal || showInventory) {
        return;
      }
      
      setKeys(prev => {
        const newKeys = new Set(prev);
        newKeys.delete(e.code);
        return newKeys;
      });
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [interactionState, initializeHub, selectOption, confirmSelection, interactWithNPC, closeSettingsModal]);
  
  // Handle game start
  useEffect(() => {
    if (interactionState === 'startGame') {
      // Start first game level using level name
      startLevelByName('pattern_memory');
    }
  }, [interactionState, startLevelByName]);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let lastTime = performance.now(); // Initialize with current time like game levels
    
    const gameLoop = (currentTime: number) => {
      const targetFrameTime = 1000 / 60; // 16.67ms for 60fps
      const deltaTime = Math.min(currentTime - lastTime, targetFrameTime * 2); // Cap at 2 frames max, same as game levels
      lastTime = currentTime;
      
      // Update game state - don't update when settings modal or inventory is open
      if (interactionState === 'idle' && !showSettingsModal && !showInventory) {
        updateHub(deltaTime, keys, keyBindings);
      }
      
      // Clear canvas
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw room boundaries (match main game wall positions exactly)
      ctx.fillStyle = '#4a5568';
      ctx.fillRect(0, 0, 800, 20); // Top wall
      ctx.fillRect(0, 580, 800, 20); // Bottom wall  
      ctx.fillRect(0, 0, 20, 600); // Left wall
      ctx.fillRect(780, 0, 20, 600); // Right wall
      
      // Draw player (use player-character.png like main game)
      if (imageLoaded && playerImageRef.current) {
        // Draw custom player image
        ctx.drawImage(
          playerImageRef.current,
          player.position.x,
          player.position.y,
          player.size.width,
          player.size.height,
        );
      } else {
        // Fallback to rectangle (same as main game fallback)
        ctx.fillStyle = '#4299e1'; // Blue like main game
        ctx.fillRect(
          player.position.x,
          player.position.y,
          player.size.width,
          player.size.height,
        );
        
        // Add player details (match main game style)
        ctx.fillStyle = '#2b6cb0'; // Darker blue for details
        ctx.fillRect(player.position.x + 5, player.position.y + 5, 15, 15);
        
        // Player eyes
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(player.position.x + 7, player.position.y + 7, 3, 3);
        ctx.fillRect(player.position.x + 15, player.position.y + 7, 3, 3);
      }

      // Temporary debug: red border around player collision box
      ctx.strokeStyle = "red";
      ctx.lineWidth = 1;
      ctx.strokeRect(
        player.position.x,
        player.position.y,
        player.size.width,
        player.size.height
      );
      
      // Draw NPCs
      npcs.forEach(npc => {
        ctx.fillStyle = '#FFB74D';
        ctx.fillRect(npc.position.x, npc.position.y, npc.size.width, npc.size.height);
        
        // Draw NPC name
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
          npc.name,
          npc.position.x + npc.size.width / 2,
          npc.position.y - 10
        );
        
        // Draw interaction prompt if player is near
        const distance = Math.sqrt(
          Math.pow(player.position.x - npc.position.x, 2) +
          Math.pow(player.position.y - npc.position.y, 2)
        );
        
        if (distance < 80 && interactionState === 'idle') {
          drawInteractionTooltip(
            'to interact',
            ctx,
            player.position.x,
            player.position.y,
            player.size.width
          );
        }
      });
      
      // Draw door (using same style as main game)
      ctx.fillStyle = hasKey ? "#48bb78" : "#e53e3e";
      ctx.fillRect(door.position.x, door.position.y, door.size.width, door.size.height);
      
      // Add door details
      ctx.strokeStyle = "#2d3748";
      ctx.lineWidth = 3;
      ctx.strokeRect(door.position.x, door.position.y, door.size.width, door.size.height);
      
      if (hasKey) {
        ctx.fillStyle = "#2d3748";
        ctx.fillRect(door.position.x + 5, door.position.y + 15, 5, 10);
      }
      
      // Draw key (if not collected and visible)
      if (!key.collected && key.position.x > 0) {
        ctx.fillStyle = "#ffd700";
        ctx.fillRect(key.position.x, key.position.y, key.size.width, key.size.height);
        
        // Add sparkle effect
        ctx.fillStyle = "#ffeb3b";
        ctx.fillRect(key.position.x + 5, key.position.y + 5, 10, 10);
      }
      
      // Draw key indicator on player (small yellow square in top-left corner)
      if (hasKey) {
        ctx.fillStyle = "#ffd700";
        ctx.fillRect(player.position.x - 5, player.position.y - 5, 8, 8);
        
        // Add sparkle effect to key indicator
        ctx.fillStyle = "#ffeb3b";
        ctx.fillRect(player.position.x - 3, player.position.y - 3, 4, 4);
      }
      
      // Draw door interaction prompt
      const doorDistance = Math.sqrt(
        Math.pow(player.position.x - door.position.x, 2) +
        Math.pow(player.position.y - door.position.y, 2)
      );
      
      if (doorDistance < 50 && interactionState === 'idle' && !hasKey) {
        const message = 'Locked - Need key';
        drawStandardTooltip(
          message,
          ctx,
          player.position.x,
          player.position.y,
          player.size.width
        );
      }
      
      // Draw conversation UI
      if (interactionState === 'conversation') {
        // Semi-transparent overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Dialog box
        const dialogWidth = 600;
        const dialogHeight = 200;
        const dialogX = (canvas.width - dialogWidth) / 2;
        const dialogY = (canvas.height - dialogHeight) / 2;
        
        ctx.fillStyle = '#2C3E50';
        ctx.fillRect(dialogX, dialogY, dialogWidth, dialogHeight);
        ctx.strokeStyle = '#34495E';
        ctx.lineWidth = 3;
        ctx.strokeRect(dialogX, dialogY, dialogWidth, dialogHeight);
        
        // NPC question
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
          'Would you like to play?',
          canvas.width / 2,
          dialogY + 60
        );
        
        // Options
        const optionY = dialogY + 120;
        const yesSelected = selectedOption === 'yes';
        const noSelected = selectedOption === 'no';
        
        // Yes option
        ctx.fillStyle = yesSelected ? '#27AE60' : '#7F8C8D';
        ctx.font = '18px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(
          yesSelected ? '> Yes - LGLG' : '  Yes - LGLG',
          dialogX + 50,
          optionY
        );
        
        // No option
        ctx.fillStyle = noSelected ? '#E74C3C' : '#7F8C8D';
        ctx.fillText(
          noSelected ? '> No, I\'m not ready yet' : '  No, I\'m not ready yet',
          dialogX + 50,
          optionY + 30
        );
        
        // Instructions
        ctx.fillStyle = '#BDC3C7';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
          'Use ↑/↓ to select, E or Enter to confirm',
          canvas.width / 2,
          dialogY + dialogHeight - 20
        );
      }
      
      animationRef.current = requestAnimationFrame(gameLoop);
    };
    
    animationRef.current = requestAnimationFrame(gameLoop);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [player, npcs, interactionState, selectedOption, keys, updateHub]);
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900">
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="border border-gray-600 bg-gray-800"
        style={{ imageRendering: 'pixelated' }}
      />
      <div className="mt-4 text-white text-center">
        <p>Use arrow keys to move</p>
        <p>Press E near NPCs to interact</p>
      </div>
      
      {/* Inventory Button */}
      <div className="absolute top-4 right-4">
        <Button
          onClick={openInventory}
          variant="outline"
          size="sm"
          className="bg-gray-800 text-white border-gray-600 hover:bg-gray-700"
        >
          📦 Inventory
        </Button>
      </div>
      
      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-96 max-w-90vw">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-800">Settings</h2>
              <button
                onClick={closeSettingsModal}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="space-y-6">
              {/* Audio Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">Audio Settings</h3>
                
                {/* Music Volume */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-gray-700">Music Volume</label>
                    <span className="text-sm text-gray-500">{musicVolume}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={musicVolume}
                    onChange={(e) => setMusicVolume(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    style={{
                      background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${musicVolume}%, #d1d5db ${musicVolume}%, #d1d5db 100%)`
                    }}
                  />
                </div>
                
                {/* Sound Effects Volume */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-gray-700">Sound Effects Volume</label>
                    <span className="text-sm text-gray-500">{sfxVolume}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sfxVolume}
                    onChange={(e) => setSfxVolume(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    style={{
                      background: `linear-gradient(to right, #10b981 0%, #10b981 ${sfxVolume}%, #d1d5db ${sfxVolume}%, #d1d5db 100%)`
                    }}
                  />
                </div>
              </div>
              
              {/* Key Bindings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">Key Bindings</h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-700">Move Up</span>
                    <button 
                      onClick={() => setEditingKeyBinding('up')}
                      className={`px-3 py-1 text-xs rounded transition-colors ${
                        editingKeyBinding === 'up' 
                          ? 'bg-white border-2 border-red-500 text-transparent' 
                          : 'bg-gray-100 border hover:bg-gray-200'
                      }`}
                    >
                      {editingKeyBinding === 'up' ? '' : getKeyDisplayText(keyBindings.up)}
                    </button>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-700">Move Down</span>
                    <button 
                      onClick={() => setEditingKeyBinding('down')}
                      className={`px-3 py-1 text-xs rounded transition-colors ${
                        editingKeyBinding === 'down' 
                          ? 'bg-white border-2 border-red-500 text-transparent' 
                          : 'bg-gray-100 border hover:bg-gray-200'
                      }`}
                    >
                      {editingKeyBinding === 'down' ? '' : getKeyDisplayText(keyBindings.down)}
                    </button>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-700">Move Left</span>
                    <button 
                      onClick={() => setEditingKeyBinding('left')}
                      className={`px-3 py-1 text-xs rounded transition-colors ${
                        editingKeyBinding === 'left' 
                          ? 'bg-white border-2 border-red-500 text-transparent' 
                          : 'bg-gray-100 border hover:bg-gray-200'
                      }`}
                    >
                      {editingKeyBinding === 'left' ? '' : getKeyDisplayText(keyBindings.left)}
                    </button>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-700">Move Right</span>
                    <button 
                      onClick={() => setEditingKeyBinding('right')}
                      className={`px-3 py-1 text-xs rounded transition-colors ${
                        editingKeyBinding === 'right' 
                          ? 'bg-white border-2 border-red-500 text-transparent' 
                          : 'bg-gray-100 border hover:bg-gray-200'
                      }`}
                    >
                      {editingKeyBinding === 'right' ? '' : getKeyDisplayText(keyBindings.right)}
                    </button>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-700">Interact</span>
                    <button 
                      onClick={() => setEditingKeyBinding('interact')}
                      className={`px-3 py-1 text-xs rounded transition-colors ${
                        editingKeyBinding === 'interact' 
                          ? 'bg-white border-2 border-red-500 text-transparent' 
                          : 'bg-gray-100 border hover:bg-gray-200'
                      }`}
                    >
                      {editingKeyBinding === 'interact' ? '' : getKeyDisplayText(keyBindings.interact)}
                    </button>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-700">Secondary Item Interaction</span>
                    <button 
                      onClick={() => setEditingKeyBinding('secondaryInteract')}
                      className={`px-3 py-1 text-xs rounded transition-colors ${
                        editingKeyBinding === 'secondaryInteract' 
                          ? 'bg-white border-2 border-red-500 text-transparent' 
                          : 'bg-gray-100 border hover:bg-gray-200'
                      }`}
                    >
                      {editingKeyBinding === 'secondaryInteract' ? '' : getKeyDisplayText(keyBindings.secondaryInteract)}
                    </button>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-700">Walk (Hold)</span>
                    <button 
                      onClick={() => setEditingKeyBinding('walking')}
                      className={`px-3 py-1 text-xs rounded transition-colors ${
                        editingKeyBinding === 'walking' 
                          ? 'bg-white border-2 border-red-500 text-transparent' 
                          : 'bg-gray-100 border hover:bg-gray-200'
                      }`}
                    >
                      {editingKeyBinding === 'walking' ? '' : getKeyDisplayText(keyBindings.walking)}
                    </button>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-700">Dash</span>
                    <button 
                      onClick={() => setEditingKeyBinding('dash')}
                      className={`px-3 py-1 text-xs rounded transition-colors ${
                        editingKeyBinding === 'dash' 
                          ? 'bg-white border-2 border-red-500 text-transparent' 
                          : 'bg-gray-100 border hover:bg-gray-200'
                      }`}
                    >
                      {editingKeyBinding === 'dash' ? '' : getKeyDisplayText(keyBindings.dash)}
                    </button>
                  </div>
                </div>
                
                {(editingKeyBinding || keyBindingError) && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                    <p className="text-sm text-red-700">
                      {keyBindingError || 
                       `Press any key to bind to "${editingKeyBinding === 'up' ? 'Move Up' : 
                                                    editingKeyBinding === 'down' ? 'Move Down' :
                                                    editingKeyBinding === 'left' ? 'Move Left' :
                                                    editingKeyBinding === 'right' ? 'Move Right' :
                                                    editingKeyBinding === 'interact' ? 'Interact' : 
                                                    editingKeyBinding === 'secondaryInteract' ? 'Secondary Item Interaction' : 
                                                    editingKeyBinding === 'walking' ? 'Walk (Hold)' : 'Dash'}"`}
                    </p>
                  </div>
                )}
              </div>
              
              {/* Enter Cheat Codes Section */}
              <div className="space-y-4">
                <h3 className={`text-lg font-semibold transition-colors duration-200 ${
                  cheatCodeSuccess ? 'text-green-600' : 'text-gray-800'
                }`}>Enter Cheat Codes</h3>
                <input
                  type="text"
                  placeholder="Enter cheat code..."
                  value={cheatCodeInput}
                  onChange={(e) => setCheatCodeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCheatCode();
                    }
                  }}
                  className="w-[95%] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Health Display */}
      {renderHealthDisplay()}
      
      {/* Level name badge and dash indicator (same style as game levels) */}
      <div className="absolute top-4 left-20 z-5 flex gap-2">
        <Badge variant="secondary" className="bg-gray-800 text-white border-gray-600">
          Snake Room
        </Badge>
        {(() => {
          const gameState = useSnakeGame.getState();
          if (!gameState.playerController) return null;
          
          const dashState = gameState.dashState;
          const currentTime = performance.now();
          const timeSinceLastDash = currentTime - dashState.lastDashTime;
          const canDash = timeSinceLastDash >= dashState.cooldownDuration;
          
          return (
            <Badge className={`${canDash ? 'bg-blue-600' : 'bg-gray-600'} text-white`}>
              ⚡ Dash {canDash ? 'Ready' : 'Cooldown'}
            </Badge>
          );
        })()}
      </div>
      
      {/* Inventory Modal */}
      <InventoryModal
        isOpen={showInventory}
        onClose={closeInventory}
        items={inventoryItems}
        onUseItem={useInventoryItem}
        onTogglePermanentItem={togglePermanentItem}
      />
    </div>
  );
};


export default HubRoom;