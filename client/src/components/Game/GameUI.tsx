import React from "react";
import { useSnakeGame } from "../../lib/stores/useSnakeGame";
import { useAudio } from "../../lib/stores/useAudio";
import { LEVELS } from "../../lib/game/levels";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { InventoryModal } from "../ui/inventory";

const GameUI: React.FC = () => {
  const {
    gameState,
    currentLevel,
    player,
    startGame,
    startFromLevel,
    resetGame,
    nextLevel,
    returnToMenu,
    isWalking,
    carriedItem,
    mirrors,
    crystal,
    showInventory,
    openInventory,
    closeInventory,
    inventoryItems,
    useInventoryItem,
    togglePermanentItem,
    dashState
  } = useSnakeGame();
  
  const { isMuted, toggleMute, playSuccess, backgroundMusic } = useAudio();
  
  const [showLevelSelect, setShowLevelSelect] = React.useState(false);



  // Handle audio based on game state
  React.useEffect(() => {
    if (gameState === 'playing' && backgroundMusic) {
      if (!isMuted) {
        backgroundMusic.play().catch(() => {});
      }
    } else if (backgroundMusic) {
      backgroundMusic.pause();
    }
  }, [gameState, backgroundMusic, isMuted]);

  // Reset level select when returning to menu
  React.useEffect(() => {
    if (gameState === 'menu') {
      setShowLevelSelect(false);
    }
  }, [gameState]);

  // Play success sound on level complete or victory
  React.useEffect(() => {
    if (gameState === 'levelComplete' || gameState === 'victory') {
      playSuccess();
    }
  }, [gameState, playSuccess]);

  const renderLevelSelect = () => {
    return (
      <div className="absolute inset-0 bg-black bg-opacity-90 flex justify-center pt-8 z-[100] p-4 min-h-screen">
        <Card className="w-[600px] max-h-[80vh] h-fit overflow-y-auto bg-gray-800 text-white border-gray-600 shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-green-400">Level Select</CardTitle>
          <CardDescription className="text-gray-300">
            Choose which level to start from
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-xs text-gray-400 mb-3 flex items-center justify-center gap-4">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-600 rounded-full"></div>
              <span>Easy</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-yellow-600 rounded-full"></div>
              <span>Medium</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-red-600 rounded-full"></div>
              <span>Hard</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {LEVELS.map((level, index) => {
              // Count different elements to give difficulty indication
              const snakeCount = level.snakes.length;
              const hasSpecialFeatures = level.switches || level.throwableItems || level.mirrors;
              
              let difficultyColor = "bg-green-600"; // Easy
              if (snakeCount > 2 || hasSpecialFeatures) difficultyColor = "bg-yellow-600"; // Medium
              if (snakeCount > 3 || (hasSpecialFeatures && snakeCount > 1)) difficultyColor = "bg-red-600"; // Hard
              
              return (
                <Button
                  key={level.id}
                  onClick={() => {
                    startFromLevel(index);
                    setShowLevelSelect(false);
                  }}
                  className="h-20 flex flex-col items-center justify-center bg-gray-700 hover:bg-gray-600 text-white border border-gray-600 relative"
                >
                  <div className="text-sm font-semibold">Level {index + 1}</div>
                  <div className="text-xs text-gray-300 text-center">{level.name}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {snakeCount} snake{snakeCount !== 1 ? 's' : ''}
                    {hasSpecialFeatures && ' + puzzles'}
                  </div>
                  <div className={`absolute top-1 right-1 w-2 h-2 rounded-full ${difficultyColor}`} title="Difficulty indicator"></div>
                </Button>
              );
            })}
          </div>
          <div className="flex justify-center pt-4">
            <Button 
              onClick={() => setShowLevelSelect(false)} 
              variant="outline" 
              className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
            >
              Back to Menu
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
    );
  };

  const renderMenu = () => (
    <div className="absolute inset-0 bg-black bg-opacity-90 flex justify-center pt-8 z-[100] p-4 min-h-screen">
      <Card className="w-96 h-fit bg-gray-800 text-white border-gray-600 shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-blue-400">Snake Room</CardTitle>
          <CardDescription className="text-gray-300">
            Escape the rooms while avoiding the deadly snakes!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-400 space-y-2">
            <p><strong>Controls:</strong> WASD/Arrow Keys: Move, Shift: Walk silently</p>
            <p><strong>Items:</strong> E: Pick up, Mouse Click: Throw items</p>
            <p><strong>Light & Mirrors:</strong> Q/E: Rotate light source and mirrors (Level 3 only)</p>
            <p><strong>Pipe Puzzle:</strong> Q/E: Rotate tiles, E on start tile: Check connection (Level 4)</p>
            <p><strong>Goal:</strong> Collect the key, activate switches, and escape!</p>
            
            <div className="mt-3 pt-2 border-t border-gray-600">
              <p className="text-white font-semibold mb-2">Snake Types:</p>
              <p className="text-purple-400 text-xs">🟣 Stalkers: Blind, but follow sounds</p>
              <p className="text-red-400 text-xs">🔴 Guards: Patrol routes, chase when they see you</p>
              <p className="text-orange-400 text-xs">🟠 Bursters: Fast dash attacks when spotted</p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button onClick={startGame} className="w-full bg-blue-600 hover:bg-blue-700">
              Start Game
            </Button>
            <Button onClick={() => setShowLevelSelect(true)} className="w-full bg-green-600 hover:bg-green-700">
              Level Select
            </Button>
            <Button onClick={toggleMute} variant="outline" className="w-full">
              Sound: {isMuted ? 'Off' : 'On'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderGameOver = () => (
    <div className="absolute inset-0 bg-red-900 bg-opacity-80 flex justify-center pt-8 z-10 p-4 min-h-screen">
      <Card className="w-96 h-fit bg-gray-800 text-white border-red-600">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-red-400">Game Over!</CardTitle>
          <CardDescription className="text-gray-300">
            A snake caught you! Try again.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2">
            <Button onClick={resetGame} className="w-full bg-red-600 hover:bg-red-700">
              Try Again
            </Button>
            <Button onClick={returnToMenu} variant="outline" className="w-full">
              Return to Menu
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderLevelComplete = () => (
    <div className="absolute inset-0 bg-green-900 bg-opacity-80 flex justify-center pt-8 z-10 p-4 min-h-screen">
      <Card className="w-96 h-fit bg-gray-800 text-white border-green-600">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-green-400">Level Complete!</CardTitle>
          <CardDescription className="text-gray-300">
            Well done! Ready for the next challenge?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2">
            <Button onClick={nextLevel} className="w-full bg-green-600 hover:bg-green-700">
              Next Level
            </Button>
            <Button onClick={returnToMenu} variant="outline" className="w-full">
              Return to Menu
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderVictory = () => (
    <div className="absolute inset-0 bg-yellow-900 bg-opacity-80 flex justify-center pt-8 z-10 p-4 min-h-screen">
      <Card className="w-96 h-fit bg-gray-800 text-white border-yellow-600">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-yellow-400">Victory!</CardTitle>
          <CardDescription className="text-gray-300">
            Congratulations! You've escaped all the rooms!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-lg">🎉 You are a true escape artist! 🎉</p>
          </div>
          <div className="flex flex-col gap-2">
            <Button onClick={startGame} className="w-full bg-yellow-600 hover:bg-yellow-700">
              Play Again
            </Button>
            <Button onClick={returnToMenu} variant="outline" className="w-full">
              Return to Menu
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderHealthDisplay = () => {
    return (
      <div className="absolute top-4 left-4 flex flex-col gap-1 z-50 pointer-events-none">
        {Array.from({ length: player.maxHealth }, (_, index) => (
          <div
            key={index}
            className={`w-8 h-8 text-2xl font-bold flex items-center justify-center ${
              index < player.health ? 'text-yellow-400' : 'text-gray-600'
            } ${player.isInvincible ? 'animate-pulse' : ''}`}
            style={{
              filter: player.isInvincible ? 'brightness(1.5)' : 'none',
              textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
            }}
          >
            ▲
          </div>
        ))}
        {player.shieldHealth > 0 && (
          <div className="flex items-center gap-1 mt-1">
            <div className="text-blue-400 text-lg font-bold">🛡️</div>
            <div className="text-blue-400 text-sm font-bold">{player.shieldHealth}</div>
          </div>
        )}
      </div>
    );
  };

  const renderGameHUD = () => (
    <div className="absolute top-4 left-20 right-4 flex justify-between items-start z-5">
      <div className="flex gap-2">
        <Badge variant="secondary" className="bg-gray-800 text-white border-gray-600">
          {LEVELS[currentLevel]?.name || 'Unknown Level'}
        </Badge>
        {player.hasKey && (
          <Badge className="bg-yellow-600 text-white">
            🗝️ Key Collected
          </Badge>
        )}
        {isWalking && (
          <Badge className="bg-green-600 text-white">
            🚶 Walking (Silent)
          </Badge>
        )}
        {carriedItem && (
          <Badge className="bg-purple-600 text-white">
            🪨 Carrying {carriedItem.type} (E to drop{['rock', 'bottle', 'can'].includes(carriedItem.type) ? ', Click to throw' : ''})
          </Badge>
        )}
        {(() => {
          const currentTime = performance.now();
          const timeSinceLastDash = currentTime - dashState.lastDashTime;
          const canDash = timeSinceLastDash >= dashState.cooldownDuration;
          
          return (
            <Badge className={`${canDash ? 'bg-blue-600' : 'bg-gray-600'} text-white`}>
              ⚡ Dash {canDash ? 'Ready' : 'Cooldown'}
            </Badge>
          );
        })()}
        {currentLevel === 3 && crystal && ( // Level 3 (0-indexed as 3)
          <Badge className={`${crystal.isActivated ? 'bg-green-600' : 'bg-red-600'} text-white`}>
            💎 Crystal {crystal.isActivated ? 'Activated' : 'Inactive'}
          </Badge>
        )}
        {currentLevel === 3 && mirrors && ( // Level 3 mirror status
          <Badge className={`${mirrors.every(m => m.isReflecting) ? 'bg-green-600' : 'bg-orange-600'} text-white`}>
            🪞 Mirrors {mirrors.filter(m => m.isReflecting).length}/{mirrors.length} Used
          </Badge>
        )}
      </div>
      
      <div className="flex gap-2">
        <Button
          onClick={openInventory}
          variant="outline"
          size="sm"
          className="bg-gray-800 text-white border-gray-600 hover:bg-gray-700"
        >
          📦 Inventory
        </Button>
        <Button
          onClick={returnToMenu}
          variant="outline"
          size="sm"
          className="bg-gray-800 text-white border-gray-600 hover:bg-gray-700"
        >
          Menu
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {gameState === 'menu' && !showLevelSelect && renderMenu()}
      {gameState === 'menu' && showLevelSelect && renderLevelSelect()}
      {gameState === 'gameOver' && renderGameOver()}
      {gameState === 'levelComplete' && renderLevelComplete()}
      {gameState === 'victory' && renderVictory()}
      {gameState === 'playing' && renderGameHUD()}
      {gameState === 'playing' && renderHealthDisplay()}
      
      {/* Inventory Modal */}
      <InventoryModal
        isOpen={showInventory}
        onClose={closeInventory}
        items={inventoryItems}
        onUseItem={useInventoryItem}
        onTogglePermanentItem={togglePermanentItem}
      />
    </>
  );
};

export default GameUI;
